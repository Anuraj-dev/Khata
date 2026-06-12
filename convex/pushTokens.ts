import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
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

// Sends a test push to the caller's own devices so notification delivery can be
// verified end-to-end from Settings. Returns how many device tokens exist: 0 means
// the client never registered (permission/registration problem); >0 with no
// notification arriving means the server side (FIREBASE_SERVICE_ACCOUNT) is broken.
export const sendTest = mutation({
  args: {},
  handler: async (ctx) => {
    const owner = await requireTokenIdentifier(ctx);
    const tokens = await ctx.db
      .query("pushTokens")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", owner))
      .collect();
    if (tokens.length > 0) {
      await ctx.scheduler.runAfter(0, internal.pushNotifications.sendToUser, {
        ownerTokenIdentifier: owner,
        title: "Khata test 🔔",
        body: "Notifications are working on this device.",
        data: { type: "test" },
      });
    }
    return { deviceCount: tokens.length };
  },
});
