import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { act } from "react";
import { useExpenseList } from "./useExpenseList";
import { expenseStore, type LocalExpense } from "../lib/expenseStorage";
import { todayIso, toIsoDate, addDays } from "../lib/dates";

// The grouped, date-sorted list is what the home screen actually paints. These
// lock its contract (grouping, newest-first ordering, per-day debit/credit
// totals, Today/Yesterday labels) so the state refactor in PR2 can't regress
// what the user sees — regardless of where the data ends up sourced from.

function makeExpense(partial: Partial<LocalExpense>): LocalExpense {
  return {
    id: Math.random().toString(36).slice(2),
    amount: 10000,
    note: "",
    category: "food",
    source: "manual",
    direction: "debit",
    date: todayIso(),
    createdAt: Date.now(),
    ...partial,
  };
}

function seed(expenses: LocalExpense[]) {
  // _syncFromServer replaces the cache and marks hydrated synchronously.
  act(() => {
    expenseStore._syncFromServer(expenses);
  });
}

describe("useExpenseList", () => {
  beforeEach(() => {
    localStorage.clear();
    seed([]);
  });

  it("reports empty + hydrated for no expenses", () => {
    const { result } = renderHook(() => useExpenseList());
    expect(result.current.isEmpty).toBe(true);
    expect(result.current.isHydrated).toBe(true);
    expect(result.current.sections).toEqual([]);
  });

  it("groups by date, newest day first, newest item first within a day", () => {
    const today = todayIso();
    const older = toIsoDate(addDays(new Date(), -2));
    seed([
      makeExpense({ date: today, createdAt: 100, note: "old-today" }),
      makeExpense({ date: today, createdAt: 200, note: "new-today" }),
      makeExpense({ date: older, createdAt: 150, note: "older-day" }),
    ]);

    const { result } = renderHook(() => useExpenseList());
    const { sections } = result.current;

    expect(sections.map((s) => s.date)).toEqual([today, older]);
    // Within the Today section, the higher createdAt comes first.
    expect(sections[0].data.map((e) => e.note)).toEqual(["new-today", "old-today"]);
  });

  it("totals debits and credits per day independently", () => {
    const today = todayIso();
    seed([
      makeExpense({ date: today, direction: "debit", amount: 5000 }),
      makeExpense({ date: today, direction: "debit", amount: 2500 }),
      makeExpense({ date: today, direction: "credit", amount: 9000 }),
    ]);

    const { result } = renderHook(() => useExpenseList());
    expect(result.current.todayDebit).toBe(7500);
    expect(result.current.todayCredit).toBe(9000);
    const todaySection = result.current.sections.find((s) => s.label === "Today")!;
    expect(todaySection.totalDebit).toBe(7500);
    expect(todaySection.totalCredit).toBe(9000);
  });

  it("labels today and yesterday, dates otherwise", () => {
    const today = todayIso();
    const yesterday = toIsoDate(addDays(new Date(), -1));
    const older = toIsoDate(addDays(new Date(), -5));
    seed([
      makeExpense({ date: today }),
      makeExpense({ date: yesterday }),
      makeExpense({ date: older }),
    ]);

    const { result } = renderHook(() => useExpenseList());
    const labels = result.current.sections.map((s) => s.label);
    expect(labels[0]).toBe("Today");
    expect(labels[1]).toBe("Yesterday");
    expect(labels[2]).not.toMatch(/Today|Yesterday/);
  });
});
