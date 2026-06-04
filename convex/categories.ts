import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireTokenIdentifier } from "./authHelpers";

export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    const owner = await requireTokenIdentifier(ctx);
    return ctx.db
      .query("categories")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", owner))
      .order("asc")
      .collect();
  },
});

export const addCategory = mutation({
  args: {
    clientId: v.string(),
    label: v.string(),
    emoji: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const owner = await requireTokenIdentifier(ctx);

    // Idempotent: a category with the same slug for this user is reused, so a
    // double-tap or a re-sync doesn't create duplicates.
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_owner_client_id", (q) =>
        q.eq("ownerTokenIdentifier", owner).eq("clientId", args.clientId)
      )
      .unique();
    if (existing) return existing._id;

    return ctx.db.insert("categories", {
      ...args,
      ownerTokenIdentifier: owner,
      createdAt: Date.now(),
    });
  },
});

export const deleteCategory = mutation({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, { categoryId }) => {
    const owner = await requireTokenIdentifier(ctx);
    const cat = await ctx.db.get(categoryId);
    if (!cat || cat.ownerTokenIdentifier !== owner) throw new Error("Not found");
    // Existing expenses keep their category id; the client renders unknown ids
    // with a generic fallback, so deletion is safe and non-destructive.
    await ctx.db.delete(categoryId);
  },
});
