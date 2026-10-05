import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "./schema";
import { convexTestModules } from "./testModules";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Authorization + input-validation guarantees. These lock the "no user can touch
// another's money" contract so a future refactor can't silently reintroduce an
// IDOR, and prove amounts can't be poisoned with garbage values.
const modules = convexTestModules();
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

describe("addExpense clientId idempotency", () => {
  const args = {
    clientId: "idem-1",
    amount: 4200,
    note: "chai",
    category: "food",
    source: "manual" as const,
    direction: "debit" as const,
    date: "2026-06-18",
  };

  it("returns the same id and leaves one row when clientId is reused", async () => {
    const t = convexTest(schema, modules);
    const asAlice = t.withIdentity(ALICE);
    const first = await asAlice.mutation(api.expenses.addExpense, args);
    const second = await asAlice.mutation(api.expenses.addExpense, {
      ...args,
      note: "chai again",
      amount: 4300,
    });
    expect(second).toBe(first);

    const rows = await t.run(async (ctx) => ctx.db.query("expenses").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0]?._id).toBe(first);
    expect(rows[0]?.amount).toBe(4200);
    expect(rows[0]?.note).toBe("chai");
  });

  it("returns an existing id and does not insert when that clientId is already duplicated", async () => {
    const t = convexTest(schema, modules);
    const baseRow = {
      clientId: "dup-already",
      amount: 1000,
      category: "food" as const,
      source: "manual" as const,
      direction: "debit" as const,
      date: "2026-06-18",
      ownerTokenIdentifier: ALICE.tokenIdentifier,
    };
    const [firstId, secondId] = await t.run(async (ctx) => {
      const now = Date.now();
      const a = await ctx.db.insert("expenses", {
        ...baseRow,
        note: "a",
        createdAt: now,
        updatedAt: now,
      });
      const b = await ctx.db.insert("expenses", {
        ...baseRow,
        note: "b",
        createdAt: now + 1,
        updatedAt: now + 1,
      });
      return [a, b] as const;
    });

    const returned = await t.withIdentity(ALICE).mutation(api.expenses.addExpense, {
      ...args,
      clientId: "dup-already",
    });
    expect([firstId, secondId]).toContain(returned);
    const rows = await t.run(async (ctx) => ctx.db.query("expenses").collect());
    expect(rows).toHaveLength(2);
  });

  it("does not reuse another owner's row when clientIds match", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await t.withIdentity(ALICE).mutation(api.expenses.addExpense, args);
    const bobId = await t.withIdentity(BOB).mutation(api.expenses.addExpense, args);
    expect(bobId).not.toBe(aliceId);
    const rows = await t.run(async (ctx) => ctx.db.query("expenses").collect());
    expect(rows).toHaveLength(2);
  });
});

describe("SMS ingest device auth", () => {
  it("does not rebind an existing device secret to a different signed-in user", async () => {
    const t = convexTest(schema, modules);
    const secret = "device-secret-alice";
    await t.withIdentity(ALICE).mutation(api.smsIngest.registerDevice, {
      deviceSecret: secret,
      platform: "android",
    });

    await expect(
      t.withIdentity(BOB).mutation(api.smsIngest.registerDevice, {
        deviceSecret: secret,
        platform: "ios",
      })
    ).rejects.toThrow(/already registered/i);

    const row = await t.run(async (ctx) =>
      ctx.db.query("smsDevices").withIndex("by_secret", (q) => q.eq("deviceSecret", secret)).unique()
    );
    expect(row?.ownerTokenIdentifier).toBe(ALICE.tokenIdentifier);
    expect(row?.platform).toBe("android");
  });

  it("lets the owner refresh the same device secret", async () => {
    const t = convexTest(schema, modules);
    const secret = "device-secret-refresh";
    await t.withIdentity(ALICE).mutation(api.smsIngest.registerDevice, {
      deviceSecret: secret,
      platform: "android",
    });
    await t.withIdentity(ALICE).mutation(api.smsIngest.registerDevice, {
      deviceSecret: secret,
      platform: "android-14",
    });
    const rows = await t.run(async (ctx) => ctx.db.query("smsDevices").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0]?.ownerTokenIdentifier).toBe(ALICE.tokenIdentifier);
    expect(rows[0]?.platform).toBe("android-14");
    expect(rows[0]?.deviceSecret).toBe(secret);
  });

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

describe("SMS ingest parser correctness", () => {
  async function register(t: ReturnType<typeof convexTest>, secret: string) {
    await t.withIdentity(ALICE).mutation(api.smsIngest.registerDevice, {
      deviceSecret: secret,
      platform: "android",
    });
  }

  it("logs for-Rs amount, not a destination account number", async () => {
    const t = convexTest(schema, modules);
    await register(t, "dev-acct");
    const result = await t.mutation(internal.smsIngest.ingestFromDevice, {
      deviceSecret: "dev-acct",
      sender: "VM-SBIIN",
      body: "Your a/c debited by transfer to 1234567890 for Rs.500 on 05-10-26",
      timestamp: Date.parse("2026-10-05T10:00:00+05:30"),
    });
    expect(result).toMatchObject({ ok: true, action: "logged" });
    const rows = await t.run(async (ctx) => ctx.db.query("expenses").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0]?.amount).toBe(50000);
  });

  it("still auto-logs a completed debit with a UPI PIN reminder footer", async () => {
    const t = convexTest(schema, modules);
    await register(t, "dev-pin-footer");
    const result = await t.mutation(internal.smsIngest.ingestFromDevice, {
      deviceSecret: "dev-pin-footer",
      sender: "VM-HDFCBK",
      body: "Rs.250 debited to Shop on 05-10-26. Never share your UPI PIN.",
      timestamp: Date.parse("2026-10-05T10:00:00+05:30"),
    });
    expect(result).toMatchObject({ ok: true, action: "logged" });
    const rows = await t.run(async (ctx) => ctx.db.query("expenses").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0]?.amount).toBe(25000);
  });

  it("does not auto-log pending or processing UPI as settled expenses", async () => {
    const t = convexTest(schema, modules);
    await register(t, "dev-pending");
    const pending = await t.mutation(internal.smsIngest.ingestFromDevice, {
      deviceSecret: "dev-pending",
      sender: "VM-SBIIN",
      body: "UPI transaction pending: Rs.500 paid to shop@oksbi. Ref 412345678901",
      timestamp: Date.parse("2026-10-05T10:00:00+05:30"),
    });
    const processing = await t.mutation(internal.smsIngest.ingestFromDevice, {
      deviceSecret: "dev-pending",
      sender: "VM-HDFCBK",
      body: "Your UPI payment of Rs.300 is processing. Ref 512345678901",
      timestamp: Date.parse("2026-10-05T10:05:00+05:30"),
    });
    expect(pending).toMatchObject({ ok: true, action: "ignored" });
    expect(processing).toMatchObject({ ok: true, action: "ignored" });
    const expenses = await t.run(async (ctx) => ctx.db.query("expenses").collect());
    const queue = await t.run(async (ctx) => ctx.db.query("smsReviewQueue").collect());
    expect(expenses).toHaveLength(0);
    expect(queue).toHaveLength(0);
  });
});
