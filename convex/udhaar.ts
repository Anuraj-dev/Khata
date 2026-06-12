import { mutation, query, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireTokenIdentifier } from "./authHelpers";

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

    const byPerson = new Map<string, { net: number; count: number; lastActivity: number }>();
    for (const e of tagged) {
      const person = e.udhaarPerson!;
      const agg = byPerson.get(person) ?? { net: 0, count: 0, lastActivity: 0 };
      agg.net += e.direction === "debit" ? e.amount : -e.amount;
      agg.count += 1;
      agg.lastActivity = Math.max(agg.lastActivity, e.createdAt);
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

// Tag or untag an expense. `person: null` clears the tag. Names are trimmed;
// the same trimmed string is what groups entries into one person.
export const setTag = mutation({
  args: { expenseId: v.id("expenses"), person: v.union(v.string(), v.null()) },
  handler: async (ctx, { expenseId, person }) => {
    const owner = await requireTokenIdentifier(ctx);
    const expense = await ctx.db.get(expenseId);
    if (!expense || expense.ownerTokenIdentifier !== owner) throw new Error("Not found");

    const trimmed = person?.trim() ?? "";
    if (person !== null && !trimmed) throw new Error("Name required");

    await ctx.db.patch(expenseId, {
      udhaarPerson: person === null ? undefined : trimmed,
      updatedAt: Date.now(),
    });
  },
});
