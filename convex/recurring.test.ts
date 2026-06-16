import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/!(*.test).ts");
const ID = { tokenIdentifier: "test|alice", subject: "alice", issuer: "test" };

const base = new Date(Date.now() + 5.5 * 3600 * 1000);
const pad = (n: number) => String(n).padStart(2, "0");
// Day-10 of N months back (distinct months, within the 125-day detection window).
const monthBack = (n: number) => {
  const d = new Date(base.getFullYear(), base.getMonth() - n, 10);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-10`;
};

async function seedSpotify(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    for (const back of [0, 1, 2]) {
      const now = Date.now();
      await ctx.db.insert("expenses", {
        clientId: `spot-${back}`,
        amount: 11900,
        note: "Spotify",
        category: "bills",
        source: "sms",
        direction: "debit",
        counterpartyHandle: "spotify@ybl",
        party: "Spotify",
        date: monthBack(back),
        ownerTokenIdentifier: ID.tokenIdentifier,
        createdAt: now,
        updatedAt: now,
      });
    }
  });
}

describe("recurring radar", () => {
  it("detects a monthly biller and stops suggesting it once tracked", async () => {
    const t = convexTest(schema, modules);
    const asAlice = t.withIdentity(ID);
    await seedSpotify(t);

    const candidates = await asAlice.query(api.recurring.detect, {});
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ key: "spotify@ybl", label: "Spotify", typicalAmount: 11900, dayOfMonth: 10 });

    await asAlice.mutation(api.recurring.confirm, candidates[0]);

    // No longer suggested, and now an upcoming bill.
    expect(await asAlice.query(api.recurring.detect, {})).toHaveLength(0);
    const upcoming = await asAlice.query(api.recurring.listUpcoming, { today: monthBack(0) });
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].label).toBe("Spotify");
  });

  it("ignores a one-off purchase", async () => {
    const t = convexTest(schema, modules);
    const asAlice = t.withIdentity(ID);
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("expenses", {
        clientId: "one-off",
        amount: 50000,
        note: "Amazon",
        category: "shopping",
        source: "sms",
        direction: "debit",
        counterpartyHandle: "amazon@apl",
        party: "Amazon",
        date: monthBack(0),
        ownerTokenIdentifier: ID.tokenIdentifier,
        createdAt: now,
        updatedAt: now,
      });
    });
    expect(await asAlice.query(api.recurring.detect, {})).toHaveLength(0);
  });
});
