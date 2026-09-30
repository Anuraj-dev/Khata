// Pure Insights math. Amounts are paise. Month keys are local YYYY-MM.

export const INSIGHTS_MONTHS = 12;

export type SpendRow = {
  date: string;
  category: string;
  amount: number;
  direction: "debit" | "credit";
};

export type CategorySpendDelta = {
  category: string;
  amount: number;
  /** Percent change vs the previous month. `null` when that previous total is 0. */
  deltaPct: number | null;
};

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** 12 consecutive YYYY-MM keys ending at `now`'s month, oldest first. */
export function lastTwelveMonthKeys(now: Date): string[] {
  const keys: string[] = [];
  for (let i = INSIGHTS_MONTHS - 1; i >= 0; i--) {
    keys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  return keys;
}

/** Inclusive ISO date window covering `lastTwelveMonthKeys(now)`. */
export function insightsRange(now: Date): { start: string; end: string } {
  const keys = lastTwelveMonthKeys(now);
  const last = keys[keys.length - 1];
  const [year, month] = last.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return { start: `${keys[0]}-01`, end: `${last}-${String(lastDay).padStart(2, "0")}` };
}

export function percentDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Current-month debit totals per category, with a percent delta versus the
 * previous month. Categories that only appear in the current month are
 * included (`deltaPct` is `null` because the previous total is 0).
 */
export function categorySpendDeltas(
  expenses: readonly SpendRow[],
  currentKey: string,
  previousKey: string | null
): CategorySpendDelta[] {
  const current = new Map<string, number>();
  const previous = new Map<string, number>();
  for (const e of expenses) {
    if (e.direction !== "debit") continue;
    const key = e.date.slice(0, 7);
    if (key === currentKey) {
      current.set(e.category, (current.get(e.category) ?? 0) + e.amount);
    } else if (previousKey && key === previousKey) {
      previous.set(e.category, (previous.get(e.category) ?? 0) + e.amount);
    }
  }

  const rows: CategorySpendDelta[] = [];
  for (const [category, amount] of current) {
    rows.push({
      category,
      amount,
      deltaPct: percentDelta(amount, previous.get(category) ?? 0),
    });
  }
  rows.sort((a, b) => b.amount - a.amount);
  return rows;
}
