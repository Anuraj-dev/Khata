import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireTokenIdentifier } from "./authHelpers";

export const registerToken = mutation({
  args: { fcmToken: v.string(), platform: v.string() },
  handler: async (ctx, { fcmToken, platform }) => {
    const owner = await requireTokenIdentifier(ctx);
    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_fcm_token", (q) => q.eq("fcmToken", fcmToken))
      .unique();
    if (existing) {
      if (existing.ownerTokenIdentifier === owner) {
        await ctx.db.patch(existing._id, { updatedAt: Date.now() });
        return;
      }
      await ctx.db.delete(existing._id);
    }
    await ctx.db.insert("pushTokens", {
      ownerTokenIdentifier: owner,
      fcmToken,
      platform,
      updatedAt: Date.now(),
    });
  },
});
