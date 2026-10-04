import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { aggregateInsights } from "./insightBuckets";
import schema from "./schema";
import { convexTestModules } from "./testModules";

const modules = convexTestModules();
const ALICE = { tokenIdentifier: "test|alice", subject: "alice", issuer: "test" };
const BOB = { tokenIdentifier: "test|bob", subject: "bob", issuer: "test" };

describe("aggregateInsights", () => {
  it("counts a repeated clientId once, using the first row in order", () => {
    const months = aggregateInsights([
      {
        clientId: "dup",
        amount: 100,
        note: "first",
        category: "food",
        source: "manual",
        direction: "debit",
        date: "2026-01-02",
      },
      {
        clientId: "dup",
        amount: 999,
        note: "retry",
        category: "food",
        source: "sms",
        direction: "debit",
        date: "2026-01-15",
      },
    ]);
    expect(months).toEqual([
      {
        key: "2026-01",
        debit: 100,
        credit: 0,
        sms: 0,
        manual: 100,
        categories: [{ category: "food", amount: 100 }],
        merchants: [
          { identity: "n:first", party: "", note: "first", category: "food", amount: 100 },
        ],
      },
    ]);
  });

  it("splits SMS and typed debits and leaves credits out of both", () => {
    const [month] = aggregateInsights([
      {
        clientId: "sms-1",
        amount: 5000,
        note: "upi",
        category: "food",
        source: "sms",
        direction: "debit",
        party: "Shop",
        date: "2026-03-01",
      },
      {
        clientId: "hand-1",
        amount: 3000,
        note: "cash",
        category: "food",
        source: "manual",
        direction: "debit",
        date: "2026-03-02",
      },
      {
        clientId: "in-1",
        amount: 8000,
        note: "refund",
        category: "other",
        source: "sms",
        direction: "credit",
        date: "2026-03-03",
      },
    ]);
    expect(month?.debit).toBe(8000);
    expect(month?.credit).toBe(8000);
    expect(month?.sms).toBe(5000);
    expect(month?.manual).toBe(3000);
    expect(month?.categories).toEqual([{ category: "food", amount: 8000 }]);
    expect(month?.merchants[0]).toMatchObject({ identity: "p:Shop", amount: 5000 });
  });
});

describe("expenses.insightsSummary", () => {
  it("aggregates the caller\'s window and ignores another user and a duplicate clientId", async () => {
    const t = convexTest(schema, modules);
    const base = {
      category: "food",
      source: "manual" as const,
      direction: "debit" as const,
      note: "lunch",
    };
    await t.run(async (ctx) => {
      const now = Date.now();
      // Later date inserted first. Index order (by date) must still keep the earlier row.
      await ctx.db.insert("expenses", {
        ...base,
        clientId: "dup",
        amount: 99900,
        date: "2026-06-20",
        ownerTokenIdentifier: ALICE.tokenIdentifier,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("expenses", {
        ...base,
        clientId: "dup",
        amount: 10000,
        date: "2026-06-02",
        ownerTokenIdentifier: ALICE.tokenIdentifier,
        source: "sms",
        createdAt: now + 1,
        updatedAt: now + 1,
      });
      await ctx.db.insert("expenses", {
        ...base,
        clientId: "typed",
        amount: 2500,
        date: "2026-06-03",
        ownerTokenIdentifier: ALICE.tokenIdentifier,
        createdAt: now + 2,
        updatedAt: now + 2,
      });
      await ctx.db.insert("expenses", {
        ...base,
        clientId: "bob",
        amount: 50000,
        date: "2026-06-04",
        ownerTokenIdentifier: BOB.tokenIdentifier,
        createdAt: now + 3,
        updatedAt: now + 3,
      });
      await ctx.db.insert("expenses", {
        ...base,
        clientId: "old",
        amount: 40000,
        date: "2025-01-01",
        ownerTokenIdentifier: ALICE.tokenIdentifier,
        createdAt: now + 4,
        updatedAt: now + 4,
      });
    });

    const alice = await t.withIdentity(ALICE).query(api.expenses.insightsSummary, {
      start: "2026-06-01",
      end: "2026-06-30",
    });
    expect(alice).toHaveLength(1);
    expect(alice[0]).toMatchObject({
      key: "2026-06",
      debit: 12500,
      credit: 0,
      sms: 10000,
      manual: 2500,
    });

    const bob = await t.withIdentity(BOB).query(api.expenses.insightsSummary, {
      start: "2026-06-01",
      end: "2026-06-30",
    });
    expect(bob).toEqual([
      expect.objectContaining({ key: "2026-06", debit: 50000 }),
    ]);
  });
});
