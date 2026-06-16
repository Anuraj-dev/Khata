import { mutation, query, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireTokenIdentifier } from "./authHelpers";
import { findOrCreateContactByName, tagExpenseToPerson } from "./contactsHelpers";

// All udhaar-tagged expenses for the caller. The index puts untagged rows
// (udhaarPerson undefined) before all string values, so `> ""` skips them.
function taggedExpenses(ctx: QueryCtx, owner: string) {
  return ctx.db
    .query("expenses")
    .withIndex("by_owner_udhaar", (q) =>
      q.eq("ownerTokenIdentifier", owner).gt("udhaarPerson", "")
    )
    .collect();
}

// Per-person net position. Positive = they owe you (you gave more than you got
// back); negative = you owe them. Settled people (net 0) are still returned —
// the client decides whether to show them.
export const balances = query({
  args: {},
  handler: async (ctx, _args) => {
    const owner = await requireTokenIdentifier(ctx);
    const tagged = await taggedExpenses(ctx, owner);

    const byPerson = new Map<
      string,
      { net: number; count: number; lastActivity: number; contactId?: Id<"contacts"> }
    >();
    for (const e of tagged) {
      const person = e.udhaarPerson!;
      const agg = byPerson.get(person) ?? { net: 0, count: 0, lastActivity: 0 };
      agg.net += e.direction === "debit" ? e.amount : -e.amount;
      agg.count += 1;
      agg.lastActivity = Math.max(agg.lastActivity, e.createdAt);
      if (e.contactId) agg.contactId = e.contactId;
      byPerson.set(person, agg);
    }

    return [...byPerson.entries()]
      .map(([person, agg]) => ({ person, ...agg }))
      .sort((a, b) => b.lastActivity - a.lastActivity);
  },
});

// Full tagged history with one person, newest first.
export const personHistory = query({
  args: { person: v.string() },
  handler: async (ctx, { person }) => {
    const owner = await requireTokenIdentifier(ctx);
    return ctx.db
      .query("expenses")
      .withIndex("by_owner_udhaar", (q) =>
        q.eq("ownerTokenIdentifier", owner).eq("udhaarPerson", person)
      )
      .order("desc")
      .collect();
  },
});

// Create a repayment expense already tagged to a person in one shot.
// Direction: credit = they paid you back; debit = you paid them back.
// Budget alerts are skipped — these are settlement transactions, not new spends.
export const addRepayment = mutation({
  args: {
    clientId: v.string(),
    person: v.string(),
    amount: v.number(),
    direction: v.union(v.literal("debit"), v.literal("credit")),
    note: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const owner = await requireTokenIdentifier(ctx);
    const trimmed = args.person.trim();
    if (!trimmed) throw new Error("Person name required");
    const { contactId, name } = await findOrCreateContactByName(ctx, owner, trimmed);
    const now = Date.now();
    await ctx.db.insert("expenses", {
      clientId: args.clientId,
      amount: args.amount,
      note: args.note,
      category: "other",
      source: "manual",
      direction: args.direction,
      date: args.date,
      contactId,
      udhaarPerson: name,
      ownerTokenIdentifier: owner,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Tag or untag an expense. `person: null` clears the tag. Names are trimmed;
// the same trimmed string is what groups entries into one person.
export const setTag = mutation({
  args: { expenseId: v.id("expenses"), person: v.union(v.string(), v.null()) },
  handler: async (ctx, { expenseId, person }) => {
    const owner = await requireTokenIdentifier(ctx);
    const expense = await ctx.db.get(expenseId);
    if (!expense || expense.ownerTokenIdentifier !== owner) throw new Error("Not found");

    if (person === null) {
      await ctx.db.patch(expenseId, {
        udhaarPerson: undefined,
        contactId: undefined,
        updatedAt: Date.now(),
      });
      return;
    }

    const trimmed = person.trim();
    if (!trimmed) throw new Error("Name required");

    // Find/create the contact, learn this expense's handle as an alias, and write
    // the canonical name so all of the contact's transactions group together.
    const { contactId, name } = await tagExpenseToPerson(ctx, owner, expense, trimmed);
    await ctx.db.patch(expenseId, {
      contactId,
      udhaarPerson: name,
      updatedAt: Date.now(),
    });
  },
});
