import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireTokenIdentifier } from "./authHelpers";

export const listByDate = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const owner = await requireTokenIdentifier(ctx);
    return ctx.db
      .query("expenses")
      .withIndex("by_owner_date", (q) => q.eq("ownerTokenIdentifier", owner).eq("date", date))
      .order("desc")
      .collect();
  },
});

export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 50 }) => {
    const owner = await requireTokenIdentifier(ctx);
    return ctx.db
      .query("expenses")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", owner))
      .order("desc")
      .take(limit);
  },
});

export const addExpense = mutation({
  args: {
    clientId: v.string(),
    amount: v.number(),
    note: v.string(),
    category: v.union(
      v.literal("food"),
      v.literal("travel"),
      v.literal("shopping"),
      v.literal("bills"),
      v.literal("health"),
      v.literal("other")
    ),
    source: v.union(v.literal("manual"), v.literal("sms")),
    direction: v.union(v.literal("debit"), v.literal("credit")),
    upiRef: v.optional(v.string()),
    party: v.optional(v.string()),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const owner = await requireTokenIdentifier(ctx);
    const now = Date.now();
    return ctx.db.insert("expenses", {
      ...args,
      ownerTokenIdentifier: owner,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateExpense = mutation({
  args: {
    expenseId: v.id("expenses"),
    note: v.optional(v.string()),
    category: v.optional(
      v.union(
        v.literal("food"),
        v.literal("travel"),
        v.literal("shopping"),
        v.literal("bills"),
        v.literal("health"),
        v.literal("other")
      )
    ),
    amount: v.optional(v.number()),
    date: v.optional(v.string()),
  },
  handler: async (ctx, { expenseId, ...updates }) => {
    const owner = await requireTokenIdentifier(ctx);
    const expense = await ctx.db.get(expenseId);
    if (!expense || expense.ownerTokenIdentifier !== owner) throw new Error("Not found");
    await ctx.db.patch(expenseId, { ...updates, updatedAt: Date.now() });
  },
});

export const deleteExpense = mutation({
  args: { expenseId: v.id("expenses") },
  handler: async (ctx, { expenseId }) => {
    const owner = await requireTokenIdentifier(ctx);
    const expense = await ctx.db.get(expenseId);
    if (!expense || expense.ownerTokenIdentifier !== owner) throw new Error("Not found");
    await ctx.db.delete(expenseId);
  },
});
