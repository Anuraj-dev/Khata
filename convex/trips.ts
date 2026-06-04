import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireTokenIdentifier } from "./authHelpers";
import { resolveTripAccess } from "./tripAccess";
import type { Doc, Id } from "./_generated/dataModel";

// Returns trips the caller owns plus trips shared *to* them (read-only), each
// tagged with the caller's role and, for shared trips, which member they are.
export const listTrips = query({
  args: { status: v.optional(v.union(v.literal("active"), v.literal("settled"))) },
  handler: async (ctx, { status }) => {
    const caller = await requireTokenIdentifier(ctx);

    const owned = status
      ? await ctx.db
          .query("trips")
          .withIndex("by_owner_status", (q) =>
            q.eq("ownerTokenIdentifier", caller).eq("status", status)
          )
          .order("desc")
          .collect()
      : await ctx.db
          .query("trips")
          .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", caller))
          .order("desc")
          .collect();

    const links = await ctx.db
      .query("tripMemberLinks")
      .withIndex("by_viewer", (q) => q.eq("viewerTokenIdentifier", caller))
      .collect();
    const shared = [];
    for (const link of links) {
      const trip = await ctx.db.get(link.tripId);
      if (!trip) continue;
      if (status && trip.status !== status) continue;
      shared.push({ ...trip, role: "viewer" as const, viewerMember: link.member });
    }

    const ownedTagged = owned.map((t) => ({ ...t, role: "owner" as const, viewerMember: "You" }));
    return [...ownedTagged, ...shared].sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getTrip = query({
  args: { tripId: v.id("trips") },
  handler: async (ctx, { tripId }) => {
    const caller = await requireTokenIdentifier(ctx);
    const access = await resolveTripAccess(ctx, tripId, caller);
    if (!access) return null;
    return { ...access.trip, role: access.role, viewerMember: access.viewerMember };
  },
});

export const listTripExpenses = query({
  args: { tripId: v.id("trips") },
  handler: async (ctx, { tripId }) => {
    const caller = await requireTokenIdentifier(ctx);
    const access = await resolveTripAccess(ctx, tripId, caller);
    if (!access) return [];
    return ctx.db
      .query("tripExpenses")
      .withIndex("by_owner_trip", (q) =>
        q.eq("ownerTokenIdentifier", access.trip.ownerTokenIdentifier).eq("tripId", tripId)
      )
      .order("desc")
      .collect();
  },
});

// The owner's own slot inside a trip is the member literally named "You".
const SELF = "You";

// Net position for one member across a trip's expenses + recorded payments.
// Positive = they are owed money, negative = they owe. Mirrors the client-side
// math in apps/web/src/lib/tripBalances.ts (kept in sync by hand — Convex runs
// in a separate bundle and can't import the web lib).
function netForMember(
  member: string,
  members: string[],
  expenses: { paidBy: string; amount: number; splitAmong: string[]; splitMode?: string; shares?: { member: string; amount: number }[] }[],
  payments: { fromMember: string; toMember: string; amount: number }[]
): number {
  const net: Record<string, number> = {};
  for (const m of members) net[m] = 0;

  for (const e of expenses) {
    if (e.amount <= 0) continue;
    net[e.paidBy] = (net[e.paidBy] ?? 0) + e.amount;

    if (e.splitMode === "custom" && e.shares && e.shares.length > 0) {
      for (const s of e.shares) net[s.member] = (net[s.member] ?? 0) - s.amount;
      continue;
    }

    const n = e.splitAmong.length;
    if (n === 0) continue;
    const base = Math.floor(e.amount / n);
    let remainder = e.amount - base * n;
    for (const m of e.splitAmong) {
      const share = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;
      net[m] = (net[m] ?? 0) - share;
    }
  }

  for (const p of payments) {
    net[p.fromMember] = (net[p.fromMember] ?? 0) + p.amount;
    net[p.toMember] = (net[p.toMember] ?? 0) - p.amount;
  }

  return net[member] ?? 0;
}

// Home-screen summary: for each active trip — owned or shared to you — how much
// you are owed (positive) or owe (negative), from your own member slot's view.
// Settled trips are filtered out by the client.
export const myTripBalances = query({
  args: {},
  handler: async (ctx) => {
    const caller = await requireTokenIdentifier(ctx);

    type Row = { tripId: Id<"trips">; name: string; net: number; role: "owner" | "viewer" };
    const out: Row[] = [];

    async function balanceFor(trip: Doc<"trips">, member: string, role: "owner" | "viewer") {
      const expenses = await ctx.db
        .query("tripExpenses")
        .withIndex("by_owner_trip", (q) =>
          q.eq("ownerTokenIdentifier", trip.ownerTokenIdentifier).eq("tripId", trip._id)
        )
        .collect();
      const payments = await ctx.db
        .query("settlements")
        .withIndex("by_owner_trip", (q) =>
          q.eq("ownerTokenIdentifier", trip.ownerTokenIdentifier).eq("tripId", trip._id)
        )
        .collect();
      out.push({ tripId: trip._id, name: trip.name, net: netForMember(member, trip.members, expenses, payments), role });
    }

    const owned = await ctx.db
      .query("trips")
      .withIndex("by_owner_status", (q) => q.eq("ownerTokenIdentifier", caller).eq("status", "active"))
      .collect();
    for (const trip of owned) await balanceFor(trip, SELF, "owner");

    const links = await ctx.db
      .query("tripMemberLinks")
      .withIndex("by_viewer", (q) => q.eq("viewerTokenIdentifier", caller))
      .collect();
    for (const link of links) {
      const trip = await ctx.db.get(link.tripId);
      if (!trip || trip.status !== "active") continue;
      await balanceFor(trip, link.member, "viewer");
    }

    return out;
  },
});

export const createTrip = mutation({
  args: {
    clientId: v.string(),
    name: v.string(),
    members: v.array(v.string()),
    startDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const owner = await requireTokenIdentifier(ctx);
    const now = Date.now();
    return ctx.db.insert("trips", {
      ...args,
      status: "active",
      ownerTokenIdentifier: owner,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Add a participant to an existing trip (owner only). Free-text name, deduped
// case-insensitively; "You" is reserved for the owner's own slot.
export const addTripMember = mutation({
  args: { tripId: v.id("trips"), member: v.string() },
  handler: async (ctx, { tripId, member }) => {
    const owner = await requireTokenIdentifier(ctx);
    const trip = await ctx.db.get(tripId);
    if (!trip || trip.ownerTokenIdentifier !== owner) throw new Error("Not found");
    const name = member.trim();
    if (!name) throw new Error("Name required");
    if (name === SELF) throw new Error('"You" is reserved');
    if (trip.members.some((m) => m.toLowerCase() === name.toLowerCase())) {
      throw new Error("That member already exists");
    }
    await ctx.db.patch(tripId, { members: [...trip.members, name], updatedAt: Date.now() });
  },
});

// Remove a participant (owner only). Blocked if they appear on any expense or
// settlement — removing them would silently distort the balances; the user must
// clear those first. Also drops any viewer link that claimed this slot.
export const removeTripMember = mutation({
  args: { tripId: v.id("trips"), member: v.string() },
  handler: async (ctx, { tripId, member }) => {
    const owner = await requireTokenIdentifier(ctx);
    const trip = await ctx.db.get(tripId);
    if (!trip || trip.ownerTokenIdentifier !== owner) throw new Error("Not found");
    if (member === SELF) throw new Error("You can't remove yourself");
    if (!trip.members.includes(member)) throw new Error("Not a member");

    const expenses = await ctx.db
      .query("tripExpenses")
      .withIndex("by_owner_trip", (q) =>
        q.eq("ownerTokenIdentifier", owner).eq("tripId", tripId)
      )
      .collect();
    const onExpense = expenses.some(
      (e) =>
        e.paidBy === member ||
        e.splitAmong.includes(member) ||
        (e.shares?.some((s) => s.member === member) ?? false)
    );
    if (onExpense) throw new Error("They're on some expenses — edit those first");

    const payments = await ctx.db
      .query("settlements")
      .withIndex("by_owner_trip", (q) =>
        q.eq("ownerTokenIdentifier", owner).eq("tripId", tripId)
      )
      .collect();
    if (payments.some((p) => p.fromMember === member || p.toMember === member)) {
      throw new Error("They have settlement payments — undo those first");
    }

    const link = await ctx.db
      .query("tripMemberLinks")
      .withIndex("by_trip_member", (q) => q.eq("tripId", tripId).eq("member", member))
      .unique();
    if (link) await ctx.db.delete(link._id);

    await ctx.db.patch(tripId, {
      members: trip.members.filter((m) => m !== member),
      updatedAt: Date.now(),
    });
  },
});

const splitModeValidator = v.optional(v.union(v.literal("equal"), v.literal("custom")));
const sharesValidator = v.optional(
  v.array(v.object({ member: v.string(), amount: v.number() }))
);

export const addTripExpense = mutation({
  args: {
    clientId: v.string(),
    tripId: v.id("trips"),
    paidBy: v.string(),
    amount: v.number(),
    note: v.string(),
    splitAmong: v.array(v.string()),
    splitMode: splitModeValidator,
    shares: sharesValidator,
    emoji: v.optional(v.string()),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const owner = await requireTokenIdentifier(ctx);
    const trip = await ctx.db.get(args.tripId);
    if (!trip || trip.ownerTokenIdentifier !== owner) throw new Error("Not found");
    return ctx.db.insert("tripExpenses", {
      ...args,
      ownerTokenIdentifier: owner,
      createdAt: Date.now(),
    });
  },
});

export const updateTripExpense = mutation({
  args: {
    expenseId: v.id("tripExpenses"),
    paidBy: v.optional(v.string()),
    amount: v.optional(v.number()),
    note: v.optional(v.string()),
    splitAmong: v.optional(v.array(v.string())),
    splitMode: splitModeValidator,
    shares: sharesValidator,
    emoji: v.optional(v.string()),
    date: v.optional(v.string()),
  },
  handler: async (ctx, { expenseId, ...updates }) => {
    const owner = await requireTokenIdentifier(ctx);
    const expense = await ctx.db.get(expenseId);
    if (!expense || expense.ownerTokenIdentifier !== owner) throw new Error("Not found");
    await ctx.db.patch(expenseId, updates);
  },
});

export const deleteTripExpense = mutation({
  args: { expenseId: v.id("tripExpenses") },
  handler: async (ctx, { expenseId }) => {
    const owner = await requireTokenIdentifier(ctx);
    const expense = await ctx.db.get(expenseId);
    if (!expense || expense.ownerTokenIdentifier !== owner) throw new Error("Not found");
    await ctx.db.delete(expenseId);
  },
});

export const settleTrip = mutation({
  args: { tripId: v.id("trips") },
  handler: async (ctx, { tripId }) => {
    const owner = await requireTokenIdentifier(ctx);
    const trip = await ctx.db.get(tripId);
    if (!trip || trip.ownerTokenIdentifier !== owner) throw new Error("Not found");
    await ctx.db.patch(tripId, { status: "settled", updatedAt: Date.now() });
  },
});

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const owner = await requireTokenIdentifier(ctx);

    const trips = await ctx.db
      .query("trips")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", owner))
      .collect();

    const expenses = await ctx.db
      .query("tripExpenses")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", owner))
      .collect();
    for (const e of expenses) await ctx.db.delete(e._id);

    for (const trip of trips) {
      const settlements = await ctx.db
        .query("settlements")
        .withIndex("by_owner_trip", (q) =>
          q.eq("ownerTokenIdentifier", owner).eq("tripId", trip._id)
        )
        .collect();
      for (const s of settlements) await ctx.db.delete(s._id);

      const shares = await ctx.db
        .query("tripShares")
        .withIndex("by_owner_trip", (q) =>
          q.eq("ownerTokenIdentifier", owner).eq("tripId", trip._id)
        )
        .collect();
      for (const s of shares) await ctx.db.delete(s._id);

      const links = await ctx.db
        .query("tripMemberLinks")
        .withIndex("by_trip", (q) => q.eq("tripId", trip._id))
        .collect();
      for (const l of links) await ctx.db.delete(l._id);

      await ctx.db.delete(trip._id);
    }

    return { deleted: trips.length };
  },
});
