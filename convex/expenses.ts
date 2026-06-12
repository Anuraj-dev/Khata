import { internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
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

// Inclusive date range [start, end] (ISO yyyy-mm-dd). Powers the Insights screen.
export const listRange = query({
  args: { start: v.string(), end: v.string() },
  handler: async (ctx, { start, end }) => {
    const owner = await requireTokenIdentifier(ctx);
    return ctx.db
      .query("expenses")
      .withIndex("by_owner_date", (q) =>
        q.eq("ownerTokenIdentifier", owner).gte("date", start).lte("date", end)
      )
      .collect();
  },
});

// Whether the user logged anything by hand on a given date. Powers the
// end-of-day cash nudge: SMS auto-captures don't count — they need no reminder.
export const hasManualOnDate = internalQuery({
  args: { ownerTokenIdentifier: v.string(), date: v.string() },
  handler: async (ctx, { ownerTokenIdentifier, date }) => {
    const rows = await ctx.db
      .query("expenses")
      .withIndex("by_owner_date", (q) =>
        q.eq("ownerTokenIdentifier", ownerTokenIdentifier).eq("date", date)
      )
      .collect();
    return rows.some((r) => r.source === "manual");
  },
});

export const addExpense = mutation({
  args: {
    clientId: v.string(),
    amount: v.number(),
    note: v.string(),
    category: v.string(),
    source: v.union(v.literal("manual"), v.literal("sms")),
    direction: v.union(v.literal("debit"), v.literal("credit")),
    upiRef: v.optional(v.string()),
    party: v.optional(v.string()),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const owner = await requireTokenIdentifier(ctx);
    const now = Date.now();
    const id = await ctx.db.insert("expenses", {
      ...args,
      ownerTokenIdentifier: owner,
      createdAt: now,
      updatedAt: now,
    });
    if (args.direction === "debit") {
      await ctx.scheduler.runAfter(0, internal.budget.checkAfterExpense, {
        ownerTokenIdentifier: owner,
      });
    }
    return id;
  },
});

export const updateExpense = mutation({
  args: {
    expenseId: v.id("expenses"),
    note: v.optional(v.string()),
    category: v.optional(v.string()),
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

// Wipes every expense (and pending SMS review item) for the current user. Gated
// behind device authentication on the client. Returns how many were removed.
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const owner = await requireTokenIdentifier(ctx);

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", owner))
      .collect();
    for (const e of expenses) await ctx.db.delete(e._id);

    const queued = await ctx.db
      .query("smsReviewQueue")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", owner))
      .collect();
    for (const q of queued) await ctx.db.delete(q._id);

    return { deleted: expenses.length };
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
