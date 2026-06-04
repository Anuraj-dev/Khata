import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireTokenIdentifier } from "./authHelpers";
import { resolveTripAccess } from "./tripAccess";

export const listByTrip = query({
  args: { tripId: v.id("trips") },
  handler: async (ctx, { tripId }) => {
    const caller = await requireTokenIdentifier(ctx);
    const access = await resolveTripAccess(ctx, tripId, caller);
    if (!access) return [];
    return ctx.db
      .query("settlements")
      .withIndex("by_owner_trip", (q) =>
        q.eq("ownerTokenIdentifier", access.trip.ownerTokenIdentifier).eq("tripId", tripId)
      )
      .order("desc")
      .collect();
  },
});

// Records an actual payment from one member to another (e.g. ticking off
// "Amit pays You ₹500" when Amit hands over the cash). Stored as a settled row;
// the balance math subtracts it so remaining transfers recompute live, and it
// survives later expenses being added.
export const recordPayment = mutation({
  args: {
    tripId: v.id("trips"),
    fromMember: v.string(),
    toMember: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, { tripId, fromMember, toMember, amount }) => {
    const owner = await requireTokenIdentifier(ctx);
    const trip = await ctx.db.get(tripId);
    if (!trip || trip.ownerTokenIdentifier !== owner) throw new Error("Not found");
    const now = Date.now();
    return ctx.db.insert("settlements", {
      tripId,
      fromMember,
      toMember,
      amount,
      settledAt: now,
      ownerTokenIdentifier: owner,
      createdAt: now,
    });
  },
});

// Undo a recorded payment (un-ticks it); balances revert.
export const deletePayment = mutation({
  args: { settlementId: v.id("settlements") },
  handler: async (ctx, { settlementId }) => {
    const owner = await requireTokenIdentifier(ctx);
    const s = await ctx.db.get(settlementId);
    if (!s || s.ownerTokenIdentifier !== owner) throw new Error("Not found");
    await ctx.db.delete(settlementId);
  },
});
