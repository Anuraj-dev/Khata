import { useMemo, useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { formatRupees, toIsoDate } from "../lib/dates";
import { useCategories } from "../hooks/useCategories";
import { ChevronLeft, ChevronRight } from "../components/icons";
import { Sheet } from "../components/Sheet";

const MONTHS_BACK = 6;

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthName(year: number, month0: number): string {
  return new Date(year, month0, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
}

type Drill = { title: string; items: Doc<"expenses">[] } | null;

export function InsightsScreen() {
  const now = new Date();
  const [offset, setOffset] = useState(0); // 0 = current month, negative = older
  const [drill, setDrill] = useState<Drill>(null);
  const { isAuthenticated } = useConvexAuth();
  const { resolve } = useCategories();

  const windowStart = toIsoDate(new Date(now.getFullYear(), now.getMonth() - (MONTHS_BACK - 1), 1));
  const windowEnd = toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const expenses = useQuery(
    api.expenses.listRange,
    isAuthenticated ? { start: windowStart, end: windowEnd } : "skip"
  );

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

  const selectedIndex = buckets.length - 1 + offset;
  const selected = buckets[selectedIndex];
  const isCurrentMonth = offset === 0;

  // One pass over the selected month's rows: category sums, merchant sums, and a
  // cash-vs-UPI split (manual entries ≈ cash, SMS ≈ UPI).
  const month = useMemo(() => {
    const rows = (expenses ?? ([] as Doc<"expenses">[])).filter(
      (e) => selected && e.date.slice(0, 7) === selected.key
    );
    const debits = rows.filter((e) => e.direction === "debit");
    const catSums = new Map<string, number>();
    const merchantSums = new Map<string, number>();
    let cash = 0;
    let upi = 0;
    for (const e of debits) {
      catSums.set(e.category, (catSums.get(e.category) ?? 0) + e.amount);
      const key = e.party || e.note || resolve(e.category).label;
      merchantSums.set(key, (merchantSums.get(key) ?? 0) + e.amount);
      if (e.source === "sms") upi += e.amount;
      else cash += e.amount;
    }
    return {
      rows,
      categories: [...catSums.entries()].sort((a, b) => b[1] - a[1]),
      merchants: [...merchantSums.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
      cash,
      upi,
    };
  }, [expenses, selected, resolve]);

  if (expenses === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ color: "var(--color-text-muted)" }}>
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  const debit = selected?.debit ?? 0;
  const credit = selected?.credit ?? 0;
  const prevDebit = selectedIndex > 0 ? buckets[selectedIndex - 1].debit : null;
  const momPct = prevDebit && prevDebit > 0 ? Math.round(((debit - prevDebit) / prevDebit) * 100) : null;

  const daysInMonth = selected ? new Date(selected.year, selected.month0 + 1, 0).getDate() : 30;
  const daysElapsed = isCurrentMonth ? now.getDate() : daysInMonth;
  const dailyAvg = daysElapsed > 0 ? Math.round(debit / daysElapsed) : 0;
  const projected = isCurrentMonth && daysElapsed > 0 ? Math.round((debit / daysElapsed) * daysInMonth) : null;

  const catTotal = month.categories.reduce((s, [, v]) => s + v, 0);
  const maxTrend = Math.max(1, ...buckets.map((b) => b.debit));

  // Tap a category/merchant → that month's matching transactions.
  function openCategory(cat: string) {
    setDrill({
      title: resolve(cat).label,
      items: month.rows.filter((e) => e.direction === "debit" && e.category === cat),
    });
  }
  function openMerchant(key: string) {
    setDrill({
      title: key,
      items: month.rows.filter(
        (e) => e.direction === "debit" && (e.party || e.note || resolve(e.category).label) === key
      ),
    });
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto pb-24">
      {/* Month switcher */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button
          onClick={() => setOffset((o) => Math.max(o - 1, -(MONTHS_BACK - 1)))}
          disabled={selectedIndex <= 0}
          className="flex h-10 w-10 items-center justify-center disabled:opacity-30"
          style={{ color: "var(--color-text-secondary)", background: "none", border: "none", cursor: "pointer" }}
          aria-label="Previous month"
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
        <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {selected ? monthName(selected.year, selected.month0) : ""}
        </span>
        <button
          onClick={() => setOffset((o) => Math.min(o + 1, 0))}
          disabled={offset >= 0}
          className="flex h-10 w-10 items-center justify-center disabled:opacity-30"
          style={{ color: "var(--color-text-secondary)", background: "none", border: "none", cursor: "pointer" }}
          aria-label="Next month"
        >
          <ChevronRight size={20} strokeWidth={2} />
        </button>
      </div>

      {/* Totals */}
      <div className="flex gap-3 px-4">
        <Stat label="Spent" value={debit} color="var(--color-debit)" />
        <Stat label="Received" value={credit} color="var(--color-credit)" />
      </div>

      {/* Actionable trends */}
      <div className="flex gap-3 px-4 mt-3">
        <MiniStat
          label={isCurrentMonth ? "Daily avg" : "Daily avg"}
          value={formatRupees(dailyAvg)}
        />
        {projected !== null ? (
          <MiniStat label="On track for" value={formatRupees(projected)} hint={`by ${monthName(selected!.year, selected!.month0).split(" ")[0]}-end`} />
        ) : (
          <MiniStat label="Vs last month" value={momPct === null ? "—" : `${momPct > 0 ? "+" : ""}${momPct}%`} valueColor={momPct === null ? undefined : momPct > 0 ? "var(--color-debit)" : "var(--color-credit)"} />
        )}
      </div>
      {isCurrentMonth && momPct !== null && (
        <p className="px-4 mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
          {momPct > 0
            ? `Spending ${momPct}% more than last month so far.`
            : momPct < 0
              ? `Spending ${-momPct}% less than last month — nice.`
              : `About the same as last month.`}
        </p>
      )}

      {/* Cash vs UPI split */}
      {(month.cash > 0 || month.upi > 0) && (
        <div className="px-4 mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>
            Cash vs UPI
          </h3>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full" style={{ background: "var(--color-surface-elevated)" }}>
            <div style={{ width: `${(month.upi / (month.cash + month.upi)) * 100}%`, background: "var(--color-accent)" }} />
            <div style={{ width: `${(month.cash / (month.cash + month.upi)) * 100}%`, background: "var(--color-credit)" }} />
          </div>
          <div className="mt-1.5 flex justify-between text-xs" style={{ color: "var(--color-text-secondary)" }}>
            <span>● UPI {formatRupees(month.upi)}</span>
            <span>Cash {formatRupees(month.cash)} ●</span>
          </div>
        </div>
      )}

      {/* Where it went — donut + tappable legend */}
      <div className="px-4 mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>
          Where it went
        </h3>
        {month.categories.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            No spending this month.
          </p>
        ) : (
          <div className="flex items-center gap-4">
            <Donut
              segments={month.categories.map(([cat, v]) => ({ value: v, color: resolve(cat).color }))}
              total={catTotal}
            />
            <div className="flex flex-1 flex-col gap-2 min-w-0">
              {month.categories.slice(0, 5).map(([cat, amount]) => {
                const meta = resolve(cat);
                const pct = catTotal > 0 ? Math.round((amount / catTotal) * 100) : 0;
                return (
                  <button
                    key={cat}
                    onClick={() => openCategory(cat)}
                    className="flex items-center justify-between gap-2 text-sm"
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    <span className="flex items-center gap-1.5 min-w-0" style={{ color: "var(--color-text-secondary)" }}>
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: meta.color }} />
                      <span className="truncate">{meta.label}</span>
                    </span>
                    <span className="tabular-nums shrink-0" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>
                      {pct}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Top merchants — tappable */}
      {month.merchants.length > 0 && (
        <div className="px-4 mt-7">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>
            Top merchants
          </h3>
          <div className="flex flex-col">
            {month.merchants.map(([key, amount]) => (
              <button
                key={key}
                onClick={() => openMerchant(key)}
                className="flex items-center justify-between gap-3 py-2.5 text-left"
                style={{ background: "none", border: "none", borderBottom: "1px solid var(--color-border-subtle)", cursor: "pointer" }}
              >
                <span className="text-sm truncate" style={{ color: "var(--color-text-secondary)" }}>
                  {key}
                </span>
                <span className="text-sm tabular-nums shrink-0" style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}>
                  {formatRupees(amount)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 6-month spend trend — line chart */}
      <div className="px-4 mt-8">
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>
          Last {MONTHS_BACK} months
        </h3>
        <TrendLine buckets={buckets} maxTrend={maxTrend} selectedIndex={selectedIndex} onSelect={(i) => setOffset(i - (buckets.length - 1))} />
      </div>

      {/* Drill-down */}
      <Sheet open={drill !== null} onClose={() => setDrill(null)} title={drill?.title ?? ""}>
        {drill && (
          <div className="flex flex-col max-h-[60vh] overflow-y-auto">
            {drill.items.length === 0 ? (
              <p className="px-4 py-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
                No transactions.
              </p>
            ) : (
              drill.items.map((e) => (
                <div
                  key={e._id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                  style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm truncate" style={{ color: "var(--color-text-primary)" }}>
                      {e.note || drill.title}
                    </span>
                    <span className="text-xs" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>
                      {e.date}
                    </span>
                  </div>
                  <span className="text-sm tabular-nums shrink-0" style={{ color: "var(--color-debit)", fontFamily: "var(--font-mono)" }}>
                    −{formatRupees(e.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="flex flex-1 flex-col gap-1 px-4 py-3"
      style={{
        background: "var(--gradient-surface)",
        border: "1px solid var(--color-border-subtle)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </span>
      <span className="text-2xl tabular-nums font-medium" style={{ color, fontFamily: "var(--font-mono)", letterSpacing: -0.5 }}>
        {formatRupees(value)}
      </span>
    </div>
  );
}

function MiniStat({ label, value, hint, valueColor }: { label: string; value: string; hint?: string; valueColor?: string }) {
  return (
    <div
      className="flex flex-1 flex-col gap-0.5 px-3 py-2.5"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-subtle)", borderRadius: "var(--radius-lg)" }}
    >
      <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </span>
      <span className="text-lg tabular-nums font-medium" style={{ color: valueColor ?? "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}>
        {value}
      </span>
      {hint && <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{hint}</span>}
    </div>
  );
}

function Donut({ segments, total }: { segments: { value: number; color: string }[]; total: number }) {
  const size = 124;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-elevated)" strokeWidth={stroke} />
          {total > 0 &&
            segments.map((s, i) => {
              const len = (s.value / total) * c;
              const seg = (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-acc}
                />
              );
              acc += len;
              return seg;
            })}
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm tabular-nums font-semibold" style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}>
          {formatRupees(total)}
        </span>
        <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
          spent
        </span>
      </div>
    </div>
  );
}

function TrendLine({
  buckets,
  maxTrend,
  selectedIndex,
  onSelect,
}: {
  buckets: { key: string; year: number; month0: number; debit: number }[];
  maxTrend: number;
  selectedIndex: number;
  onSelect: (i: number) => void;
}) {
  const W = 320;
  const H = 96;
  const pad = 10;
  const n = buckets.length;
  const x = (i: number) => (n <= 1 ? W / 2 : pad + (i * (W - 2 * pad)) / (n - 1));
  const y = (v: number) => H - pad - (v / maxTrend) * (H - 2 * pad);
  const line = buckets.map((b, i) => `${x(i)},${y(b.debit)}`).join(" ");

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block" }}>
        <polyline points={line} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {buckets.map((b, i) => (
          <circle
            key={b.key}
            cx={x(i)}
            cy={y(b.debit)}
            r={i === selectedIndex ? 4.5 : 3}
            fill={i === selectedIndex ? "var(--color-accent)" : "var(--color-surface)"}
            stroke="var(--color-accent)"
            strokeWidth={1.5}
          />
        ))}
      </svg>
      <div className="flex justify-between mt-1">
        {buckets.map((b, i) => (
          <button
            key={b.key}
            onClick={() => onSelect(i)}
            className="flex-1 text-[10px]"
            style={{ background: "none", border: "none", cursor: "pointer", color: i === selectedIndex ? "var(--color-accent)" : "var(--color-text-muted)" }}
          >
            {new Date(b.year, b.month0, 1).toLocaleString("en-IN", { month: "short" })}
          </button>
        ))}
      </div>
    </div>
  );
}
