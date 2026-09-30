import { describe, it, expect } from "vitest";
import {
  lastTwelveMonthKeys,
  monthKey,
  percentDelta,
  categorySpendDeltas,
  INSIGHTS_MONTHS,
} from "./insightsMath";

describe("lastTwelveMonthKeys", () => {
  it("returns 12 consecutive YYYY-MM keys ending at the current month", () => {
    const keys = lastTwelveMonthKeys(new Date(2026, 8, 29)); // 29 Sep 2026
    expect(keys).toHaveLength(INSIGHTS_MONTHS);
    expect(keys[0]).toBe("2025-10");
    expect(keys[keys.length - 1]).toBe("2026-09");
    for (let i = 1; i < keys.length; i++) {
      const [year, month] = keys[i].split("-").map(Number);
      expect(keys[i - 1]).toBe(monthKey(new Date(year, month - 2, 1)));
    }
  });
});

describe("percentDelta / categorySpendDeltas", () => {
  it("yields +100 when spend doubles", () => {
    expect(percentDelta(20000, 10000)).toBe(100);
    const rows = categorySpendDeltas(
      [
        { date: "2026-08-10", category: "food", amount: 10000, direction: "debit" },
        { date: "2026-09-05", category: "food", amount: 20000, direction: "debit" },
      ],
      "2026-09",
      "2026-08"
    );
    expect(rows).toEqual([{ category: "food", amount: 20000, deltaPct: 100 }]);
  });

  it("yields null when the previous total is 0", () => {
    expect(percentDelta(5000, 0)).toBeNull();
    const rows = categorySpendDeltas(
      [{ date: "2026-09-05", category: "bills", amount: 5000, direction: "debit" }],
      "2026-09",
      "2026-08"
    );
    expect(rows).toEqual([{ category: "bills", amount: 5000, deltaPct: null }]);
  });

  it("includes a category that only appears in the current month", () => {
    const rows = categorySpendDeltas(
      [
        { date: "2026-08-10", category: "food", amount: 8000, direction: "debit" },
        { date: "2026-09-02", category: "food", amount: 8000, direction: "debit" },
        { date: "2026-09-12", category: "travel", amount: 15000, direction: "debit" },
      ],
      "2026-09",
      "2026-08"
    );
    expect(rows.map((r) => r.category)).toEqual(["travel", "food"]);
    const travel = rows.find((r) => r.category === "travel");
    expect(travel).toEqual({ category: "travel", amount: 15000, deltaPct: null });
  });
});
