import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Authorization + input-validation guarantees. These lock the "no user can touch
// another's money" contract so a future refactor can't silently reintroduce an
// IDOR, and prove amounts can't be poisoned with garbage values.

const modules = import.meta.glob("./**/!(*.test).ts");
const ALICE = { tokenIdentifier: "test|alice", subject: "alice", issuer: "test" };
const BOB = { tokenIdentifier: "test|bob", subject: "bob", issuer: "test" };

async function aliceAddsExpense(t: ReturnType<typeof convexTest>): Promise<Id<"expenses">> {
  await t.withIdentity(ALICE).mutation(api.expenses.addExpense, {
    clientId: "a-1",
    amount: 5000,
    note: "lunch",
    category: "food",
    source: "manual",
    direction: "debit",
    date: "2026-06-18",
  });
  return t.run(async (ctx) => {
    const row = await ctx.db.query("expenses").first();
    return row!._id;
  });
}

describe("cross-user access is denied (IDOR)", () => {
  it("Bob cannot delete Alice's expense", async () => {
    const t = convexTest(schema, modules);
    const expenseId = await aliceAddsExpense(t);

    await expect(
      t.withIdentity(BOB).mutation(api.expenses.deleteExpense, { expenseId })
    ).rejects.toThrow();

    // Alice's row is still there.
    const stillThere = await t.run(async (ctx) => ctx.db.get(expenseId));
    expect(stillThere).not.toBeNull();
  });

  it("Bob cannot tag Alice's expense as udhaar", async () => {
    const t = convexTest(schema, modules);
    const expenseId = await aliceAddsExpense(t);

    await expect(
      t.withIdentity(BOB).mutation(api.udhaar.setTag, { expenseId, person: "Bob" })
    ).rejects.toThrow();
  });

  it("Bob cannot read or edit Alice's trip", async () => {
    const t = convexTest(schema, modules);
    await t.withIdentity(ALICE).mutation(api.trips.createTrip, {
      clientId: "t-1",
      name: "Goa",
      members: ["You", "Riya"],
    });
    const tripId = await t.run(async (ctx) => {
      const trip = await ctx.db.query("trips").first();
      return trip!._id as Id<"trips">;
    });

    // Read is access-gated → null for a non-member.
    const seen = await t.withIdentity(BOB).query(api.trips.getTrip, { tripId });
    expect(seen).toBeNull();

    // Write is owner-gated → throws.
    await expect(
      t.withIdentity(BOB).mutation(api.trips.addTripExpense, {
        clientId: "te-1",
        tripId,
        paidBy: "You",
        amount: 1000,
        note: "sneaky",
        splitAmong: ["You"],
        splitMode: "equal",
        shares: undefined,
        date: "2026-06-18",
      })
    ).rejects.toThrow();
  });

  it("an unauthenticated caller cannot add an expense", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.expenses.addExpense, {
        clientId: "x-1",
        amount: 5000,
        note: "",
        category: "food",
        source: "manual",
        direction: "debit",
        date: "2026-06-18",
      })
    ).rejects.toThrow();
  });
});

describe("amount validation", () => {
  const base = {
    clientId: "v-1",
    note: "",
    category: "food" as const,
    source: "manual" as const,
    direction: "debit" as const,
    date: "2026-06-18",
  };

  it.each([
    ["zero", 0],
    ["negative", -100],
    ["fractional paise", 12.5],
    ["over the ₹1cr cap", 1_000_000_001],
  ])("rejects %s", async (_label, amount) => {
    const t = convexTest(schema, modules);
    await expect(
      t.withIdentity(ALICE).mutation(api.expenses.addExpense, { ...base, amount })
    ).rejects.toThrow();
  });

  it("accepts a normal positive integer amount", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.withIdentity(ALICE).mutation(api.expenses.addExpense, { ...base, amount: 25000 })
    ).resolves.toBeDefined();
  });
});

describe("SMS ingest device auth", () => {
  it("rejects an unknown device secret", async () => {
    const t = convexTest(schema, modules);
    const result = await t.mutation(internal.smsIngest.ingestFromDevice, {
      deviceSecret: "not-a-real-secret",
      sender: "HDFCBANK",
      body: "Rs 100 debited to shop@oksbi on 18-06-26",
      timestamp: Date.now(),
    });
    expect(result.ok).toBe(false);
  });
});
