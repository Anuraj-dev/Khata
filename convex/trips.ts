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

export const addTripExpense = mutation({
  args: {
    clientId: v.string(),
    tripId: v.id("trips"),
    paidBy: v.string(),
    amount: v.number(),
    note: v.string(),
    splitAmong: v.array(v.string()),
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

export const settleTrip = mutation({
  args: { tripId: v.id("trips") },
  handler: async (ctx, { tripId }) => {
    const owner = await requireTokenIdentifier(ctx);
    const trip = await ctx.db.get(tripId);
    if (!trip || trip.ownerTokenIdentifier !== owner) throw new Error("Not found");
    await ctx.db.patch(tripId, { status: "settled", updatedAt: Date.now() });
  },
});
