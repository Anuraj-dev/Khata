import { internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireTokenIdentifier } from "./authHelpers";
import { aggregateInsights } from "./insightBuckets";
import { assertValidAmount } from "./validators";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Inclusive window, or null when the dates are unusable. A caller that asks for
// decades would otherwise `.collect()` the whole ledger. Insights asks for 12
// months (~370 days); search and the category drill ask for one month.
function boundedRange(
  start: string,
  end: string,
  maxDays: number,
): { start: string; end: string } | null {
  if (!ISO_DATE.test(start) || !ISO_DATE.test(end) || start > end) return null;
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  const span = endMs - startMs;
  const cap = maxDays * 86_400_000;
  if (span <= cap) return { start, end };
  return { start: new Date(endMs - cap).toISOString().slice(0, 10), end };
}

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
    // "Load older" raises this without a ceiling. Only reject a non-positive page.
    const page = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 50;
    return ctx.db
      .query("expenses")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", owner))
      .order("desc")
      .take(page);
  },
});

// Inclusive date range [start, end] (ISO yyyy-mm-dd). Search uses one month.
// Insights calls this only after a category or merchant is opened.
export const listRange = query({
  args: { start: v.string(), end: v.string() },
  handler: async (ctx, { start, end }) => {
    const owner = await requireTokenIdentifier(ctx);
    const range = boundedRange(start, end, 62);
    if (!range) return [];
    return ctx.db
      .query("expenses")
      .withIndex("by_owner_date", (q) =>
        q.eq("ownerTokenIdentifier", owner).gte("date", range.start).lte("date", range.end)
      )
      .collect();
  },
});

// Year window for Insights. One object per month that has rows — monthly
// debit/credit, category totals, SMS-vs-typed split, and the top merchants —
// instead of every expense in the range.
export const insightsSummary = query({
  args: { start: v.string(), end: v.string() },
  handler: async (ctx, { start, end }) => {
    const owner = await requireTokenIdentifier(ctx);
    const range = boundedRange(start, end, 400);
    if (!range) return [];
    const rows = await ctx.db
      .query("expenses")
      .withIndex("by_owner_date", (q) =>
        q.eq("ownerTokenIdentifier", owner).gte("date", range.start).lte("date", range.end)
      )
      .collect();
    return aggregateInsights(rows);
  },
});

// Whether the user logged anything by hand on a given date. Powers the
// end-of-day cash nudge: SMS auto-captures don't count — they need no reminder.
export const hasManualOnDate = internalQuery({
  args: { ownerTokenIdentifier: v.string(), date: v.string() },
  handler: async (ctx, { ownerTokenIdentifier, date }) => {
    // One manual row is enough. The source+date index avoids reading every SMS
    // logged that day just to answer the cash nudge.
    const manual = await ctx.db
      .query("expenses")
      .withIndex("by_owner_source_date", (q) =>
        q.eq("ownerTokenIdentifier", ownerTokenIdentifier).eq("source", "manual").eq("date", date)
      )
      .first();
    return manual !== null;
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
    assertValidAmount(args.amount);
    // Offline retries reuse one clientId. Return an existing row so a lost
    // response cannot insert another expense. `.first()` — not `.unique()` —
    // because a server that predates this check may already have stored the
    // same clientId twice; a retry must still resolve and must not insert a third.
    const existing = await ctx.db
      .query("expenses")
      .withIndex("by_owner_client_id", (q) =>
        q.eq("ownerTokenIdentifier", owner).eq("clientId", args.clientId)
      )
      .first();
    if (existing) return existing._id;

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
    if (updates.amount !== undefined) assertValidAmount(updates.amount);
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
