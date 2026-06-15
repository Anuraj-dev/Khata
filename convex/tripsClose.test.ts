import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/!(*.test).ts");
const ID = { tokenIdentifier: "test|alice", subject: "alice", issuer: "test" };

describe("trips.settleAll", () => {
  it("records the remaining transfers, zeroes balances, and closes the trip", async () => {
    const t = convexTest(schema, modules);
    const asAlice = t.withIdentity(ID);

    const tripId = (await asAlice.mutation(api.trips.createTrip, {
      clientId: "trip-1",
      name: "Goa",
      members: ["You", "Amit"],
    })) as Id<"trips">;

    // You paid ₹1000 split equally → Amit owes You ₹500. Never recorded in-app.
    await asAlice.mutation(api.trips.addTripExpense, {
      clientId: "te-1",
      tripId,
      paidBy: "You",
      amount: 100000,
      note: "Hotel",
      splitAmong: ["You", "Amit"],
      date: "2026-06-01",
    });

    const before = await asAlice.query(api.trips.myTripBalances, {});
    expect(before.find((b) => b.tripId === tripId)?.net).toBe(50000); // owed ₹500

    const res = await asAlice.mutation(api.trips.settleAll, { tripId });
    expect(res.recorded).toBe(1);

    // Trip is closed and no longer surfaces in the active-trip balances feed.
    const trip = await asAlice.query(api.trips.getTrip, { tripId });
    expect(trip?.status).toBe("settled");
    const after = await asAlice.query(api.trips.myTripBalances, {});
    expect(after.find((b) => b.tripId === tripId)).toBeUndefined();

    const settlementCount = await t.run(async (ctx) => {
      const rows = await ctx.db
        .query("settlements")
        .withIndex("by_trip", (q) => q.eq("tripId", tripId))
        .collect();
      return rows.length;
    });
    expect(settlementCount).toBe(1);
  });

  it("closes an already-cleared trip without recording phantom transfers", async () => {
    const t = convexTest(schema, modules);
    const asAlice = t.withIdentity(ID);
    const tripId = (await asAlice.mutation(api.trips.createTrip, {
      clientId: "trip-2",
      name: "Lunch",
      members: ["You", "Bob"],
    })) as Id<"trips">;
    // No expenses → nothing owed.
    const res = await asAlice.mutation(api.trips.settleAll, { tripId });
    expect(res.recorded).toBe(0);
    const trip = await asAlice.query(api.trips.getTrip, { tripId });
    expect(trip?.status).toBe("settled");
  });
});
