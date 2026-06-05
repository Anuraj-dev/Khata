import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireTokenIdentifier } from "./authHelpers";

export const listPending = query({
  args: {},
  handler: async (ctx) => {
    const owner = await requireTokenIdentifier(ctx);
    return ctx.db
      .query("smsReviewQueue")
      .withIndex("by_owner_status", (q) =>
        q.eq("ownerTokenIdentifier", owner).eq("status", "pending")
      )
      .order("desc")
      .collect();
  },
});

export const enqueue = mutation({
  args: {
    rawSms: v.string(),
    parsedAmount: v.optional(v.number()),
    parsedParty: v.optional(v.string()),
    parsedDirection: v.optional(v.union(v.literal("debit"), v.literal("credit"))),
    parsedDate: v.optional(v.string()),
    parsedUpiRef: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const owner = await requireTokenIdentifier(ctx);
    const id = await ctx.db.insert("smsReviewQueue", {
      ...args,
      status: "pending",
      ownerTokenIdentifier: owner,
      createdAt: Date.now(),
    });
    const rupeesStr = args.parsedAmount
      ? `₹${args.parsedAmount % 100 === 0 ? args.parsedAmount / 100 : (args.parsedAmount / 100).toFixed(2)} · `
      : "";
    await ctx.scheduler.runAfter(0, internal.pushNotifications.sendToUser, {
      ownerTokenIdentifier: owner,
      title: "Transaction needs review",
      body: `${rupeesStr}tap to review`,
      data: { type: "sms_review" },
    });
    return id;
  },
});

// Directly logs a confidently-parsed UPI SMS as an expense — no manual approval.
// Dedupes on clientId so re-reading the inbox (e.g. after an app restart) is safe.
export const autoLog = mutation({
  args: {
    clientId: v.string(),
    amount: v.number(),
    note: v.string(),
    category: v.string(),
    direction: v.union(v.literal("debit"), v.literal("credit")),
    date: v.string(),
    party: v.optional(v.string()),
    upiRef: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const owner = await requireTokenIdentifier(ctx);

    const existing = await ctx.db
      .query("expenses")
      .withIndex("by_owner_client_id", (q) =>
        q.eq("ownerTokenIdentifier", owner).eq("clientId", args.clientId)
      )
      .unique();
    if (existing) return existing._id;

    const now = Date.now();
    return ctx.db.insert("expenses", {
      ...args,
      source: "sms",
      ownerTokenIdentifier: owner,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const approve = mutation({
  args: {
    queueId: v.id("smsReviewQueue"),
    amount: v.number(),
    note: v.string(),
    category: v.string(),
    direction: v.union(v.literal("debit"), v.literal("credit")),
    date: v.string(),
    party: v.optional(v.string()),
    upiRef: v.optional(v.string()),
  },
  handler: async (ctx, { queueId, ...expenseFields }) => {
    const owner = await requireTokenIdentifier(ctx);
    const item = await ctx.db.get(queueId);
    if (!item || item.ownerTokenIdentifier !== owner) throw new Error("Not found");

    await ctx.db.patch(queueId, { status: "approved", reviewedAt: Date.now() });

    const now = Date.now();
    return ctx.db.insert("expenses", {
      clientId: `sms-${queueId}`,
      source: "sms",
      note: expenseFields.note,
      amount: expenseFields.amount,
      category: expenseFields.category,
      direction: expenseFields.direction,
      date: expenseFields.date,
      party: expenseFields.party,
      upiRef: expenseFields.upiRef,
      ownerTokenIdentifier: owner,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const reject = mutation({
  args: { queueId: v.id("smsReviewQueue") },
  handler: async (ctx, { queueId }) => {
    const owner = await requireTokenIdentifier(ctx);
    const item = await ctx.db.get(queueId);
    if (!item || item.ownerTokenIdentifier !== owner) throw new Error("Not found");
    await ctx.db.patch(queueId, { status: "rejected", reviewedAt: Date.now() });
  },
});

export const purgeOldRejected = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const old = await ctx.db
      .query("smsReviewQueue")
      .filter((q) =>
        q.and(q.eq(q.field("status"), "rejected"), q.lt(q.field("createdAt"), cutoff))
      )
      .collect();
    for (const item of old) await ctx.db.delete(item._id);
    return old.length;
  },
});
