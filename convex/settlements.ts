import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireTokenIdentifier } from "./authHelpers";

export const listByTrip = query({
  args: { tripId: v.id("trips") },
  handler: async (ctx, { tripId }) => {
    const owner = await requireTokenIdentifier(ctx);
    return ctx.db
      .query("settlements")
      .withIndex("by_owner_trip", (q) => q.eq("ownerTokenIdentifier", owner).eq("tripId", tripId))
      .collect();
  },
});

export const markSettled = mutation({
  args: { settlementId: v.id("settlements") },
  handler: async (ctx, { settlementId }) => {
    const owner = await requireTokenIdentifier(ctx);
    const settlement = await ctx.db.get(settlementId);
    if (!settlement || settlement.ownerTokenIdentifier !== owner) throw new Error("Not found");
    await ctx.db.patch(settlementId, { settledAt: Date.now() });
  },
});

export const saveSettlements = mutation({
  args: {
    tripId: v.id("trips"),
    settlements: v.array(
      v.object({
        fromMember: v.string(),
        toMember: v.string(),
        amount: v.number(),
      })
    ),
  },
  handler: async (ctx, { tripId, settlements }) => {
    const owner = await requireTokenIdentifier(ctx);
    const trip = await ctx.db.get(tripId);
    if (!trip || trip.ownerTokenIdentifier !== owner) throw new Error("Not found");

    const existing = await ctx.db
      .query("settlements")
      .withIndex("by_owner_trip", (q) => q.eq("ownerTokenIdentifier", owner).eq("tripId", tripId))
      .collect();
    for (const s of existing) await ctx.db.delete(s._id);

    const now = Date.now();
    for (const s of settlements) {
      await ctx.db.insert("settlements", {
        ...s,
        tripId,
        ownerTokenIdentifier: owner,
        createdAt: now,
      });
    }
  },
});
