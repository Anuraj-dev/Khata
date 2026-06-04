import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireTokenIdentifier } from "./authHelpers";

export const listTrips = query({
  args: { status: v.optional(v.union(v.literal("active"), v.literal("settled"))) },
  handler: async (ctx, { status }) => {
    const owner = await requireTokenIdentifier(ctx);
    if (status) {
      return ctx.db
        .query("trips")
        .withIndex("by_owner_status", (q) =>
          q.eq("ownerTokenIdentifier", owner).eq("status", status)
        )
        .order("desc")
        .collect();
    }
    return ctx.db
      .query("trips")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", owner))
      .order("desc")
      .collect();
  },
});

export const getTrip = query({
  args: { tripId: v.id("trips") },
  handler: async (ctx, { tripId }) => {
    const owner = await requireTokenIdentifier(ctx);
    const trip = await ctx.db.get(tripId);
    if (!trip || trip.ownerTokenIdentifier !== owner) return null;
    return trip;
  },
});

export const listTripExpenses = query({
  args: { tripId: v.id("trips") },
  handler: async (ctx, { tripId }) => {
    const owner = await requireTokenIdentifier(ctx);
    return ctx.db
      .query("tripExpenses")
      .withIndex("by_owner_trip", (q) => q.eq("ownerTokenIdentifier", owner).eq("tripId", tripId))
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

// Home-screen summary: for each active trip, how much "You" are owed (positive)
// or owe (negative). Trips where you're settled up are omitted by the client.
export const myTripBalances = query({
  args: {},
  handler: async (ctx) => {
    const owner = await requireTokenIdentifier(ctx);
    const trips = await ctx.db
      .query("trips")
      .withIndex("by_owner_status", (q) =>
        q.eq("ownerTokenIdentifier", owner).eq("status", "active")
      )
      .order("desc")
      .collect();

    const out: { tripId: typeof trips[number]["_id"]; name: string; net: number }[] = [];
    for (const trip of trips) {
      const expenses = await ctx.db
        .query("tripExpenses")
        .withIndex("by_owner_trip", (q) => q.eq("ownerTokenIdentifier", owner).eq("tripId", trip._id))
        .collect();
      const payments = await ctx.db
        .query("settlements")
        .withIndex("by_owner_trip", (q) => q.eq("ownerTokenIdentifier", owner).eq("tripId", trip._id))
        .collect();
      const net = netForMember(SELF, trip.members, expenses, payments);
      out.push({ tripId: trip._id, name: trip.name, net });
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
