import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";

const modules = import.meta.glob("./**/!(*.test).ts");
const ID = { tokenIdentifier: "test|alice", subject: "alice", issuer: "test" };
const istToday = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

describe("per-category budgets", () => {
  it("flags the category (sets lastAlertMonth) when its cap is crossed", async () => {
    const t = convexTest(schema, modules);
    const asAlice = t.withIdentity(ID);
    const today = istToday();

    // A high overall budget so only the category cap can trip.
    await asAlice.mutation(api.budget.setBudget, { monthlyLimit: 100_000_00 });
    await asAlice.mutation(api.budget.setCategoryBudget, { category: "food", monthlyLimit: 50000 });

    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("expenses", {
        clientId: "f1",
        amount: 60000, // ₹600 > ₹500 cap
        note: "lunch",
        category: "food",
        source: "manual",
        direction: "debit",
        date: today,
        ownerTokenIdentifier: ID.tokenIdentifier,
        createdAt: now,
        updatedAt: now,
      });
    });

    await t.mutation(internal.budget.checkAfterExpense, { ownerTokenIdentifier: ID.tokenIdentifier });

    const month = await t.run(async (ctx) => {
      const row = await ctx.db
        .query("categoryBudgets")
        .withIndex("by_owner_category", (q) =>
          q.eq("ownerTokenIdentifier", ID.tokenIdentifier).eq("category", "food")
        )
        .unique();
      return row?.lastAlertMonth;
    });
    expect(month).toBe(today.slice(0, 7));
  });

  it("listCategoryBudgets reports spend against the cap", async () => {
    const t = convexTest(schema, modules);
    const asAlice = t.withIdentity(ID);
    const today = istToday();
    await asAlice.mutation(api.budget.setCategoryBudget, { category: "food", monthlyLimit: 50000 });
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("expenses", {
        clientId: "f2",
        amount: 20000,
        note: "snack",
        category: "food",
        source: "manual",
        direction: "debit",
        date: today,
        ownerTokenIdentifier: ID.tokenIdentifier,
        createdAt: now,
        updatedAt: now,
      });
    });
    const rows = await asAlice.query(api.budget.listCategoryBudgets, { today });
    expect(rows).toEqual([{ category: "food", monthlyLimit: 50000, spent: 20000 }]);
  });
});
