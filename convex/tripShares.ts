import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireTokenIdentifier } from "./authHelpers";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function newToken(): string {
  // URL-safe, unguessable. crypto.randomUUID is available in the Convex runtime.
  return crypto.randomUUID().replace(/-/g, "");
}

// Owner-only: return the trip's active invite token, minting one (or replacing
// an expired/forced one) with a fresh 7-day expiry.
export const getOrCreateShare = mutation({
  args: { tripId: v.id("trips"), regenerate: v.optional(v.boolean()) },
  handler: async (ctx, { tripId, regenerate }) => {
    const owner = await requireTokenIdentifier(ctx);
    const trip = await ctx.db.get(tripId);
    if (!trip || trip.ownerTokenIdentifier !== owner) throw new Error("Not found");

    const now = Date.now();
    const existing = await ctx.db
      .query("tripShares")
      .withIndex("by_owner_trip", (q) => q.eq("ownerTokenIdentifier", owner).eq("tripId", tripId))
      .collect();

    if (!regenerate) {
      const live = existing.find((s) => s.expiresAt > now);
      if (live) return { token: live.token, expiresAt: live.expiresAt };
    }

    // Replace any prior shares so only one token is ever valid per trip.
    for (const s of existing) await ctx.db.delete(s._id);

    const token = newToken();
    const expiresAt = now + WEEK_MS;
    await ctx.db.insert("tripShares", {
      tripId,
      token,
      ownerTokenIdentifier: owner,
      expiresAt,
      createdAt: now,
    });
    return { token, expiresAt };
  },
});

// Any signed-in user: peek at an invite before joining. Returns the trip name,
// the claimable member slots, and whether the caller already joined.
export const previewShare = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const caller = await requireTokenIdentifier(ctx);
    const share = await ctx.db
      .query("tripShares")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!share) return { valid: false as const, reason: "notfound" as const };
    if (share.expiresAt <= Date.now()) return { valid: false as const, reason: "expired" as const };

    const trip = await ctx.db.get(share.tripId);
    if (!trip) return { valid: false as const, reason: "notfound" as const };

    const links = await ctx.db
      .query("tripMemberLinks")
      .withIndex("by_trip", (q) => q.eq("tripId", share.tripId))
      .collect();

    // Slots already taken by *other* people can't be claimed; "You" (the owner)
    // is never claimable.
    const takenByOthers = links
      .filter((l) => l.viewerTokenIdentifier !== caller)
      .map((l) => l.member);
    const mine = links.find((l) => l.viewerTokenIdentifier === caller)?.member ?? null;

    return {
      valid: true as const,
      tripId: share.tripId,
      tripName: trip.name,
      members: trip.members.filter((m) => m !== "You"),
      takenByOthers,
      alreadyJoinedAs: mine,
      isOwner: trip.ownerTokenIdentifier === caller,
    };
  },
});

// Any signed-in user: claim a member slot on a shared trip → read-only access.
export const redeemShare = mutation({
  args: { token: v.string(), member: v.string() },
  handler: async (ctx, { token, member }) => {
    const caller = await requireTokenIdentifier(ctx);
    const share = await ctx.db
      .query("tripShares")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!share) throw new Error("Invite not found");
    if (share.expiresAt <= Date.now()) throw new Error("Invite expired");

    const trip = await ctx.db.get(share.tripId);
    if (!trip) throw new Error("Trip not found");
    if (trip.ownerTokenIdentifier === caller) {
      // Owner doesn't need to join their own trip.
      return { tripId: share.tripId };
    }
    if (member === "You" || !trip.members.includes(member)) {
      throw new Error("Invalid member");
    }

    // Slot already linked to a different account?
    const slotLink = await ctx.db
      .query("tripMemberLinks")
      .withIndex("by_trip_member", (q) => q.eq("tripId", share.tripId).eq("member", member))
      .unique();
    if (slotLink && slotLink.viewerTokenIdentifier !== caller) {
      throw new Error("That member is already taken");
    }

    // Update the caller's existing link (re-pick) or create a new one.
    const myLink = await ctx.db
      .query("tripMemberLinks")
      .withIndex("by_trip_viewer", (q) =>
        q.eq("tripId", share.tripId).eq("viewerTokenIdentifier", caller)
      )
      .unique();
    if (myLink) {
      await ctx.db.patch(myLink._id, { member });
    } else {
      await ctx.db.insert("tripMemberLinks", {
        tripId: share.tripId,
        member,
        viewerTokenIdentifier: caller,
        ownerTokenIdentifier: trip.ownerTokenIdentifier,
        createdAt: Date.now(),
      });
    }
    return { tripId: share.tripId };
  },
});
