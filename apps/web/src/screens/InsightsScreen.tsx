import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { formatRupees, toIsoDate } from "../lib/dates";
import type { ExpenseCategory } from "../lib/expenseStorage";

const CATEGORY_META: Record<ExpenseCategory, { label: string; color: string; icon: string }> = {
  food: { label: "Food", color: "var(--color-food)", icon: "🍜" },
  travel: { label: "Travel", color: "var(--color-travel)", icon: "✈️" },
  shopping: { label: "Shopping", color: "var(--color-shopping)", icon: "🛍️" },
  bills: { label: "Bills", color: "var(--color-bills)", icon: "🧾" },
  health: { label: "Health", color: "var(--color-health)", icon: "💊" },
  other: { label: "Other", color: "var(--color-other)", icon: "·" },
};

const MONTHS_BACK = 6;

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthName(year: number, month0: number): string {
  return new Date(year, month0, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
}

export function InsightsScreen() {
  const now = new Date();
  // offset 0 = current month, negative = older. Clamp to the loaded window.
  const [offset, setOffset] = useState(0);

  // Load a fixed window covering the last MONTHS_BACK months.
  const windowStart = toIsoDate(new Date(now.getFullYear(), now.getMonth() - (MONTHS_BACK - 1), 1));
  const windowEnd = toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const expenses = useQuery(api.expenses.listRange, { start: windowStart, end: windowEnd });

  // Build the month buckets (oldest → newest) for the trend.
  const buckets = useMemo(() => {
    const list: { key: string; year: number; month0: number; debit: number; credit: number }[] = [];
    for (let i = MONTHS_BACK - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      list.push({ key: monthKey(d), year: d.getFullYear(), month0: d.getMonth(), debit: 0, credit: 0 });
    }
    const byKey = new Map(list.map((b) => [b.key, b]));
    for (const e of expenses ?? ([] as Doc<"expenses">[])) {
      const b = byKey.get(e.date.slice(0, 7));
      if (!b) continue;
      if (e.direction === "debit") b.debit += e.amount;
      else b.credit += e.amount;
    }
    return list;
  }, [expenses, now]);

  const selectedIndex = buckets.length - 1 + offset; // offset 0 → last bucket
  const selected = buckets[selectedIndex];

  // Category breakdown (debit only) for the selected month.
  const breakdown = useMemo(() => {
    if (!selected) return [];
    const sums = new Map<ExpenseCategory, number>();
    for (const e of expenses ?? ([] as Doc<"expenses">[])) {
      if (e.direction !== "debit" || e.date.slice(0, 7) !== selected.key) continue;
      sums.set(e.category, (sums.get(e.category) ?? 0) + e.amount);
    }
    return [...sums.entries()].sort((a, b) => b[1] - a[1]);
  }, [expenses, selected]);

  if (expenses === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ color: "var(--color-text-muted)" }}>
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  const maxTrend = Math.max(1, ...buckets.map((b) => b.debit));
  const breakdownTotal = breakdown.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="flex flex-col flex-1 overflow-y-auto pb-24">
      {/* Month switcher */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button
          onClick={() => setOffset((o) => Math.max(o - 1, -(MONTHS_BACK - 1)))}
          disabled={selectedIndex <= 0}
          className="px-2 py-1 text-lg disabled:opacity-30"
          style={{ color: "var(--color-text-secondary)", background: "none", border: "none" }}
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {selected ? monthName(selected.year, selected.month0) : ""}
        </span>
        <button
          onClick={() => setOffset((o) => Math.min(o + 1, 0))}
          disabled={offset >= 0}
          className="px-2 py-1 text-lg disabled:opacity-30"
          style={{ color: "var(--color-text-secondary)", background: "none", border: "none" }}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {/* Totals */}
      <div className="flex gap-3 px-4">
        <Stat label="Spent" value={selected?.debit ?? 0} color="var(--color-debit)" />
        <Stat label="Received" value={selected?.credit ?? 0} color="var(--color-credit)" />
      </div>

      {/* Category breakdown */}
      <div className="px-4 mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>
          Where it went
        </h3>
        {breakdown.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            No spending this month.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {breakdown.map(([cat, amount]) => {
              const meta = CATEGORY_META[cat];
              const pct = breakdownTotal > 0 ? (amount / breakdownTotal) * 100 : 0;
              return (
                <div key={cat} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: "var(--color-text-secondary)" }}>
                      {meta.icon} {meta.label}
                    </span>
                    <span className="tabular-nums" style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}>
                      {formatRupees(amount)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--color-surface-elevated)" }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: meta.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6-month trend */}
      <div className="px-4 mt-8">
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>
          Last {MONTHS_BACK} months
        </h3>
        <div className="flex items-end justify-between gap-2 h-32">
          {buckets.map((b, i) => {
            const heightPct = (b.debit / maxTrend) * 100;
            const isSel = i === selectedIndex;
            return (
              <button
                key={b.key}
                onClick={() => setOffset(i - (buckets.length - 1))}
                className="flex flex-1 flex-col items-center justify-end gap-1 h-full"
                style={{ background: "none", border: "none" }}
              >
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{
                    height: `${Math.max(heightPct, 2)}%`,
                    background: isSel ? "var(--color-accent)" : "var(--color-surface-elevated)",
                  }}
                />
                <span className="text-[10px]" style={{ color: isSel ? "var(--color-accent)" : "var(--color-text-muted)" }}>
                  {new Date(b.year, b.month0, 1).toLocaleString("en-IN", { month: "short" })}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-1 flex-col gap-1 rounded-xl px-4 py-3" style={{ background: "var(--color-surface)" }}>
      <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </span>
      <span className="text-2xl tabular-nums font-medium" style={{ color, fontFamily: "var(--font-mono)", letterSpacing: -0.5 }}>
        {formatRupees(value)}
      </span>
    </div>
  );
}
