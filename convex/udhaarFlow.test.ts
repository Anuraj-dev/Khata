import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Seam 2: exercise the real Convex functions against an in-memory DB. We assert
// external behaviour — the udhaar balances a user would see — not internals.

const modules = import.meta.glob("./**/!(*.test).ts");
const ID = { tokenIdentifier: "test|alice", subject: "alice", issuer: "test" };
const SENDER = "HDFCBANK";

function bal(rows: { person: string; net: number }[], person: string): number {
  return rows.find((r) => r.person === person)?.net ?? 0;
}

describe("udhaar auto-capture + roll-up", () => {
  it("auto-tags a later transaction from a handle the user tagged once", async () => {
    const t = convexTest(schema, modules);
    const asAlice = t.withIdentity(ID);
    await asAlice.mutation(api.smsIngest.registerDevice, {
      deviceSecret: "dev-1",
      platform: "android",
    });

    // You lend Ravi ₹1500 over UPI — lands untagged.
    await t.mutation(internal.smsIngest.ingestFromDevice, {
      deviceSecret: "dev-1",
      sender: SENDER,
      body: "Rs 1500 debited and paid to ravi@okaxis on 01-06-26",
      timestamp: Date.parse("2026-06-01"),
    });

    // Find that expense and tag it to Ravi (learns ravi@okaxis as his handle).
    const expenseId = await t.run(async (ctx) => {
      const rows = await ctx.db.query("expenses").collect();
      return rows.find((e) => e.counterpartyHandle === "ravi@okaxis")!._id as Id<"expenses">;
    });
    await asAlice.mutation(api.udhaar.setTag, { expenseId, person: "Ravi" });

    // Ravi repays ₹500 from the SAME handle — must auto-tag, no user action.
    await t.mutation(internal.smsIngest.ingestFromDevice, {
      deviceSecret: "dev-1",
      sender: SENDER,
      body: "Rs 500 credited from ravi@okaxis on 02-06-26",
      timestamp: Date.parse("2026-06-02"),
    });

    const balances = await asAlice.query(api.udhaar.balances, {});
    expect(bal(balances, "Ravi")).toBe(100000); // 1500 lent − 500 repaid = ₹1000
    expect(balances.filter((b) => b.person === "Ravi")).toHaveLength(1);
  });

  it("auto-links a new handle by exact name (repayment from another UPI app)", async () => {
    const t = convexTest(schema, modules);
    const asAlice = t.withIdentity(ID);
    await asAlice.mutation(api.smsIngest.registerDevice, {
      deviceSecret: "dev-2",
      platform: "android",
    });

    await t.mutation(internal.smsIngest.ingestFromDevice, {
      deviceSecret: "dev-2",
      sender: SENDER,
      body: "Rs 2000 debited and paid to amit.k@okhdfc on 01-06-26",
      timestamp: Date.parse("2026-06-01"),
    });
    const expenseId = await t.run(async (ctx) => {
      const rows = await ctx.db.query("expenses").collect();
      return rows.find((e) => e.counterpartyHandle === "amit.k@okhdfc")!._id as Id<"expenses">;
    });
    await asAlice.mutation(api.udhaar.setTag, { expenseId, person: "Amit Kumar" });

    // Repayment lands from a DIFFERENT handle, but the SMS name matches exactly.
    await t.mutation(internal.smsIngest.ingestFromDevice, {
      deviceSecret: "dev-2",
      sender: SENDER,
      body: "Rs 700 credited from amit.kumar@okaxis on 03-06-26",
      timestamp: Date.parse("2026-06-03"),
    });

    const balances = await asAlice.query(api.udhaar.balances, {});
    expect(bal(balances, "Amit Kumar")).toBe(130000); // ₹2000 − ₹700 = ₹1300
  });
});

describe("manual cash udhaar", () => {
  it("records an offline loan and creates the contact, budget-exempt", async () => {
    const t = convexTest(schema, modules);
    const asAlice = t.withIdentity(ID);

    await asAlice.mutation(api.udhaar.addRepayment, {
      clientId: "manual-1",
      person: "Sara",
      amount: 30000,
      direction: "debit",
      note: "Lent cash",
      date: "2026-06-01",
    });

    const balances = await asAlice.query(api.udhaar.balances, {});
    expect(bal(balances, "Sara")).toBe(30000);

    const contacts = await asAlice.query(api.contacts.listContacts, {});
    expect(contacts.map((c) => c.name)).toContain("Sara");
  });
});

describe("merge contacts", () => {
  it("combines two people's balances into one", async () => {
    const t = convexTest(schema, modules);
    const asAlice = t.withIdentity(ID);

    await asAlice.mutation(api.udhaar.addRepayment, {
      clientId: "m-1",
      person: "Raju",
      amount: 100000,
      direction: "debit",
      note: "Lent",
      date: "2026-06-01",
    });
    await asAlice.mutation(api.udhaar.addRepayment, {
      clientId: "m-2",
      person: "Raaju",
      amount: 50000,
      direction: "debit",
      note: "Lent again",
      date: "2026-06-02",
    });

    const contacts = await asAlice.query(api.contacts.listContacts, {});
    const source = contacts.find((c) => c.name === "Raaju")!.contactId;
    const target = contacts.find((c) => c.name === "Raju")!.contactId;
    await asAlice.mutation(api.contacts.mergeContacts, { sourceId: source, targetId: target });

    const balances = await asAlice.query(api.udhaar.balances, {});
    expect(balances.filter((b) => b.person === "Raju" || b.person === "Raaju")).toHaveLength(1);
    expect(bal(balances, "Raju")).toBe(150000);
  });
});

describe("backfill migration", () => {
  it("links legacy udhaarPerson rows to new contacts", async () => {
    const t = convexTest(schema, modules);

    // Simulate a row tagged before contacts existed: udhaarPerson set, no contactId.
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("expenses", {
        clientId: "legacy-1",
        amount: 80000,
        note: "old loan",
        category: "other",
        source: "manual",
        direction: "debit",
        date: "2026-05-01",
        udhaarPerson: "Mohan",
        ownerTokenIdentifier: ID.tokenIdentifier,
        createdAt: now,
        updatedAt: now,
      });
    });

    await t.mutation(internal.contacts.backfillContacts, {});

    const linked = await t.run(async (ctx) => {
      const rows = await ctx.db.query("expenses").collect();
      const row = rows.find((e) => e.clientId === "legacy-1")!;
      const contacts = await ctx.db.query("contacts").collect();
      return { hasContactId: !!row.contactId, contactNames: contacts.map((c) => c.name) };
    });
    expect(linked.hasContactId).toBe(true);
    expect(linked.contactNames).toContain("Mohan");
  });
});
