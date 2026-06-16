import { useSyncExternalStore } from "react";
import { expenseStore, type LocalExpense } from "../lib/expenseStorage";
import { todayIso } from "../lib/dates";
import { addDays, toIsoDate } from "../lib/dates";

export type ExpenseSection = {
  date: string;
  label: string;
  totalDebit: number;
  totalCredit: number;
  data: LocalExpense[];
};

function dayLabel(isoDate: string, today: string): string {
  if (isoDate === today) return "Today";
  const yesterday = toIsoDate(addDays(new Date(), -1));
  if (isoDate === yesterday) return "Yesterday";
  const [year, month, day] = isoDate.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day))
    .toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function groupByDate(expenses: LocalExpense[]): ExpenseSection[] {
  const today = todayIso();
  const map = new Map<string, LocalExpense[]>();

  for (const e of expenses) {
    const existing = map.get(e.date) ?? [];
    existing.push(e);
    map.set(e.date, existing);
  }

  const sections: ExpenseSection[] = [];
  for (const [date, items] of map) {
    // Sort within day: newest first
    const sorted = [...items].sort((a, b) => b.createdAt - a.createdAt);
    const totalDebit = sorted
      .filter((e) => e.direction === "debit")
      .reduce((sum, e) => sum + e.amount, 0);
    const totalCredit = sorted
      .filter((e) => e.direction === "credit")
      .reduce((sum, e) => sum + e.amount, 0);
    sections.push({ date, label: dayLabel(date, today), totalDebit, totalCredit, data: sorted });
  }

  // Sort sections: newest date first
  return sections.sort((a, b) => b.date.localeCompare(a.date));
}

export function useExpenseList() {
  const expenses = useSyncExternalStore(
    expenseStore.subscribe,
    expenseStore.get,
    expenseStore.get,
  );
  const isHydrated = useSyncExternalStore(
    expenseStore.subscribe,
    expenseStore.isHydrated,
    expenseStore.isHydrated,
  );

  const sections = groupByDate(expenses);
  const todaySection = sections.find((s) => s.label === "Today");

  return {
    sections,
    isEmpty: expenses.length === 0,
    isHydrated,
    todayDebit: todaySection?.totalDebit ?? 0,
    todayCredit: todaySection?.totalCredit ?? 0,
  };
}
