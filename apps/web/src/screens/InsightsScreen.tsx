import { useMemo, useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { formatRupees } from "../lib/dates";
import {
  INSIGHTS_MONTHS,
  categorySpendDeltas,
  insightsRange,
  lastTwelveMonthKeys,
  type SpendRow,
} from "../lib/insightsMath";
import { monthIsoRange } from "../lib/expenseReport";
import { useCategories } from "../hooks/useCategories";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { dedupeByClientId } from "../lib/expenseStorage";
import { merchantIdentity, type InsightMerchant } from "../../../../convex/insightBuckets";
import { ChevronLeft, ChevronRight } from "../components/icons";
import { Sheet } from "../components/Sheet";

function monthName(year: number, month0: number): string {
  return new Date(year, month0, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
}

function formatDeltaPct(deltaPct: number | null): string {
  if (deltaPct === null) return "—";
  return `${deltaPct > 0 ? "+" : ""}${deltaPct}%`;
}

function deltaColor(deltaPct: number | null): string {
  if (deltaPct === null || deltaPct === 0) return "var(--color-text-muted)";
  return deltaPct > 0 ? "var(--color-debit)" : "var(--color-credit)";
}

function deltaSpoken(deltaPct: number | null): string {
  if (deltaPct === null) return "no previous month to compare";
  if (deltaPct === 0) return "same as last month";
  return deltaPct > 0
    ? `up ${deltaPct} percent from last month`
    : `down ${-deltaPct} percent from last month`;
}

type Drill =
  | { kind: "category"; category: string; title: string }
  | { kind: "merchant"; identity: string; title: string }
  | null;

function merchantLabel(
  merchant: InsightMerchant,
  resolve: (id: string) => { label: string },
): string {
  return merchant.party || merchant.note || resolve(merchant.category).label;
}

export function InsightsScreen() {
  // Freeze "today" for the life of this mount so the 12-month window, current-month
  // daily average, and projected month-end don't shift mid-session.
  const [today] = useState(() => new Date());
  const [offset, setOffset] = useState(0); // 0 = current month, negative = older
  const [drill, setDrill] = useState<Drill>(null);
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const { resolve } = useCategories();
  const online = useOnlineStatus();

  const monthKeys = useMemo(() => lastTwelveMonthKeys(today), [today]);
  const { start: windowStart, end: windowEnd } = useMemo(() => insightsRange(today), [today]);
  // Totals only. Line items for a tapped category come from listRange, one month.
  const summary = useQuery(
    api.expenses.insightsSummary,
    isAuthenticated ? { start: windowStart, end: windowEnd } : "skip"
  );

  const buckets = useMemo(() => {
    const byKey = new Map((summary ?? []).map((m) => [m.key, m]));
    return monthKeys.map((key) => {
      const [year, month] = key.split("-").map(Number);
      const row = byKey.get(key);
      return {
        key,
        year,
        month0: month - 1,
        debit: row?.debit ?? 0,
        credit: row?.credit ?? 0,
        sms: row?.sms ?? 0,
        manual: row?.manual ?? 0,
        categories: row?.categories ?? [],
        merchants: row?.merchants ?? [],
      };
    });
  }, [summary, monthKeys]);

  const selectedIndex = buckets.length - 1 + offset;
  const selected = buckets[selectedIndex];
  const isCurrentMonth = offset === 0;

  const drillRange = drill && selected ? monthIsoRange(selected.key) : null;
  const drillLoaded = useQuery(
    api.expenses.listRange,
    isAuthenticated && drillRange ? drillRange : "skip",
  );

  // Must stay above the loading return. A hook after that return runs only once
  // summary arrives, and React throws "Rendered more hooks than during the previous render."
  const drillItems = useMemo(() => {
    if (!drill) return [];
    return dedupeByClientId(drillLoaded ?? []).filter((e) => {
      if (e.direction !== "debit") return false;
      if (drill.kind === "category") return e.category === drill.category;
      return merchantIdentity(e.party, e.note, e.category) === drill.identity;
    });
  }, [drill, drillLoaded]);

  const spendRows = useMemo(() => {
    const rows: SpendRow[] = [];
    for (const bucket of buckets) {
      for (const category of bucket.categories) {
        rows.push({
          date: `${bucket.key}-01`,
          category: category.category,
          amount: category.amount,
          direction: "debit",
        });
      }
    }
    return rows;
  }, [buckets]);

  const month = useMemo(() => {
    const prevKey = selectedIndex > 0 ? buckets[selectedIndex - 1].key : null;
    return {
      categories: selected ? categorySpendDeltas(spendRows, selected.key, prevKey) : [],
      merchants: selected?.merchants ?? [],
      sms: selected?.sms ?? 0,
      manual: selected?.manual ?? 0,
    };
  }, [spendRows, selected, selectedIndex, buckets]);

  const offline = !online;
  if (summary === undefined) {
    // Skipped query (signed out) or an offline shell must not look like a load.
    // Spinner only while auth is resolving online, or an authenticated fetch is in flight.
    const waitingOnAuth = authLoading && !offline && !isAuthenticated;
    const waitingOnQuery = isAuthenticated && !offline;
    if (waitingOnAuth || waitingOnQuery) {
      return <InsightsStatus>Loading…</InsightsStatus>;
    }
    return (
      <InsightsUnavailable
        title={offline ? "You're offline" : "Insights unavailable"}
        body={
          offline
            ? "Connect to load a year of spending, daily averages, and how each category changed."
            : "Sign in to see a year of spending, daily averages, and how each category changed."
        }
      />
    );
  }

  const debit = selected?.debit ?? 0;
  const credit = selected?.credit ?? 0;
  const prevDebit = selectedIndex > 0 ? buckets[selectedIndex - 1].debit : null;
  const momPct = prevDebit && prevDebit > 0 ? Math.round(((debit - prevDebit) / prevDebit) * 100) : null;

  const daysInMonth = selected ? new Date(selected.year, selected.month0 + 1, 0).getDate() : 30;
  const daysElapsed = isCurrentMonth ? today.getDate() : daysInMonth;
  const dailyAvg = daysElapsed > 0 ? Math.round(debit / daysElapsed) : 0;
  const projected = isCurrentMonth && daysElapsed > 0 ? Math.round((debit / daysElapsed) * daysInMonth) : null;

  const catTotal = month.categories.reduce((s, c) => s + c.amount, 0);
  const maxTrend = Math.max(1, ...buckets.map((b) => b.debit));

  // Tap a category/merchant → that month's matching transactions.
  function openCategory(cat: string) {
    setDrill({ kind: "category", category: cat, title: resolve(cat).label });
  }
  function openMerchant(merchant: InsightMerchant) {
    setDrill({
      kind: "merchant",
      identity: merchant.identity,
      title: merchantLabel(merchant, resolve),
    });
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto pb-24">
      {/* Month switcher */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button
          onClick={() => setOffset((o) => Math.max(o - 1, -(INSIGHTS_MONTHS - 1)))}
          disabled={selectedIndex <= 0}
          className="flex h-11 w-11 items-center justify-center disabled:opacity-30"
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
          className="flex h-11 w-11 items-center justify-center disabled:opacity-30"
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

      {/* How the row got here: SMS auto-log vs typed. Not a payment rail. */}
      {(month.sms > 0 || month.manual > 0) && (
        <div className="px-4 mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>
            SMS vs typed
          </h3>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full" style={{ background: "var(--color-surface-elevated)" }}>
            <div style={{ width: `${(month.sms / (month.sms + month.manual)) * 100}%`, background: "var(--color-accent)" }} />
            <div style={{ width: `${(month.manual / (month.sms + month.manual)) * 100}%`, background: "var(--color-credit)" }} />
          </div>
          <div className="mt-1.5 flex justify-between text-xs" style={{ color: "var(--color-text-secondary)" }}>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--color-accent)" }} aria-hidden />
              SMS {formatRupees(month.sms)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              Typed {formatRupees(month.manual)}
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--color-credit)" }} aria-hidden />
            </span>
          </div>
        </div>
      )}

      {/* Where it went — donut + tappable legend with vs-last-month delta */}
      <div className="px-4 mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>
          Where it went
        </h3>
        {month.categories.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            No spending this month.
          </p>
        ) : (
          <div className="flex items-start gap-4">
            <Donut
              segments={month.categories.map((c) => ({ value: c.amount, color: resolve(c.category).color }))}
              total={catTotal}
            />
            <div className="flex flex-1 flex-col gap-2 min-w-0 pt-1">
              {month.categories.map((row) => {
                const meta = resolve(row.category);
                const pct = catTotal > 0 ? Math.round((row.amount / catTotal) * 100) : 0;
                return (
                  <button
                    key={row.category}
                    onClick={() => openCategory(row.category)}
                    className="flex items-center justify-between gap-2 text-sm"
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    aria-label={`${meta.label}, ${pct} percent of spending, ${deltaSpoken(row.deltaPct)}`}
                  >
                    <span className="flex items-center gap-1.5 min-w-0" style={{ color: "var(--color-text-secondary)" }}>
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: meta.color }} />
                      <span className="truncate">{meta.label}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span
                        className="tabular-nums text-xs min-w-[2.75rem] text-right"
                        style={{ color: deltaColor(row.deltaPct), fontFamily: "var(--font-mono)" }}
                      >
                        {formatDeltaPct(row.deltaPct)}
                      </span>
                      <span className="tabular-nums shrink-0" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>
                        {pct}%
                      </span>
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
            {month.merchants.map((merchant) => (
              <button
                key={merchant.identity}
                onClick={() => openMerchant(merchant)}
                className="flex items-center justify-between gap-3 py-2.5 text-left"
                style={{ background: "none", border: "none", borderBottom: "1px solid var(--color-border-subtle)", cursor: "pointer" }}
              >
                <span className="text-sm truncate" style={{ color: "var(--color-text-secondary)" }}>
                  {merchantLabel(merchant, resolve)}
                </span>
                <span className="text-sm tabular-nums shrink-0" style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}>
                  {formatRupees(merchant.amount)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 12-month spend trend — line chart */}
      <div className="px-4 mt-8">
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>
          Last {INSIGHTS_MONTHS} months
        </h3>
        {buckets.every((b) => b.debit === 0) ? (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            No spending in the last {INSIGHTS_MONTHS} months.
          </p>
        ) : (
          <TrendLine buckets={buckets} maxTrend={maxTrend} selectedIndex={selectedIndex} onSelect={(i) => setOffset(i - (buckets.length - 1))} />
        )}
      </div>

      {/* Drill-down */}
      <Sheet open={drill !== null} onClose={() => setDrill(null)} title={drill?.title ?? ""}>
        {drill && (
          <div className="flex flex-col max-h-[60vh] overflow-y-auto">
            {drillLoaded === undefined ? (
              <p className="px-4 py-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
                Loading…
              </p>
            ) : drillItems.length === 0 ? (
              <p className="px-4 py-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
                No transactions.
              </p>
            ) : (
              drillItems.map((e) => (
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

function InsightsStatus({ children }: { children: string }) {
  return (
    <div
      className="flex flex-1 items-center justify-center"
      style={{ color: "var(--color-text-muted)" }}
      role="status"
      aria-live="polite"
    >
      <span className="text-sm">{children}</span>
    </div>
  );
}

function InsightsUnavailable({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col flex-1 min-h-0 items-center justify-center gap-3 px-8 pb-24 text-center">
      <span
        className="flex h-16 w-16 items-center justify-center text-2xl font-bold"
        style={{
          borderRadius: "var(--radius-xl)",
          background: "var(--gradient-hero), var(--color-surface)",
          color: "var(--color-accent)",
          fontFamily: "var(--font-mono)",
          boxShadow: "inset 0 0 0 1px var(--color-accent-border)",
        }}
        aria-hidden
      >
        ₹
      </span>
      <p className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
        {title}
      </p>
      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        {body}
      </p>
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
  // Fixed viewBox, uniform meet. Month labels live in the same coordinate
  // space as the points, so they stay under the dots when the width changes.
  const W = 320;
  const padX = 16;
  const padTop = 28;
  const plotH = 72;
  const labelBand = 22;
  const H = padTop + plotH + labelBand;
  const plotBottom = padTop + plotH;
  const n = buckets.length;
  const x = (i: number) => (n <= 1 ? W / 2 : padX + (i * (W - 2 * padX)) / (n - 1));
  const y = (v: number) => plotBottom - (maxTrend <= 0 ? 0 : (v / maxTrend) * plotH);
  const slot = n <= 1 ? W : (W - 2 * padX) / Math.max(n - 1, 1);
  const line = buckets.map((b, i) => `${x(i)},${y(b.debit)}`).join(" ");
  const selected = buckets[selectedIndex];
  const amountAnchor = selectedIndex <= 0 ? "start" : selectedIndex >= n - 1 ? "end" : "middle";

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block", width: "100%", height: "auto" }}
      role="group"
      aria-label={
        selected
          ? `Spend over the last ${n} months. ${monthName(selected.year, selected.month0)} ${formatRupees(selected.debit)}`
          : `Spend over the last ${n} months`
      }
    >
      <line
        x1={padX}
        x2={W - padX}
        y1={plotBottom}
        y2={plotBottom}
        stroke="var(--color-border-subtle)"
        strokeWidth={1}
        pointerEvents="none"
      />
      <polyline
        points={line}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        pointerEvents="none"
      />
      {selected && (
        <text
          x={x(selectedIndex)}
          y={16}
          textAnchor={amountAnchor}
          fill="var(--color-text-primary)"
          fontSize={11}
          fontFamily="var(--font-mono)"
          pointerEvents="none"
        >
          {formatRupees(selected.debit)}
        </text>
      )}
      {buckets.map((b, i) => {
        const short = new Date(b.year, b.month0, 1).toLocaleString("en-IN", { month: "short" });
        const selectedPoint = i === selectedIndex;
        const left = Math.max(0, x(i) - slot / 2);
        const width = Math.min(W - left, slot);
        return (
          <g
            key={b.key}
            role="button"
            tabIndex={0}
            aria-label={`${monthName(b.year, b.month0)}, ${formatRupees(b.debit)}`}
            aria-current={selectedPoint ? "true" : undefined}
            onClick={() => onSelect(i)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(i);
              }
            }}
            style={{ cursor: "pointer" }}
          >
            <rect x={left} y={0} width={width} height={H} fill="transparent" />
            <circle
              cx={x(i)}
              cy={y(b.debit)}
              r={selectedPoint ? 4.5 : 3.5}
              fill={selectedPoint ? "var(--color-accent)" : "var(--color-surface)"}
              stroke="var(--color-accent)"
              strokeWidth={1.5}
              pointerEvents="none"
            />
            <text
              x={x(i)}
              y={H - 6}
              textAnchor="middle"
              fill={selectedPoint ? "var(--color-accent)" : "var(--color-text-muted)"}
              fontSize={10}
              fontWeight={selectedPoint ? 600 : 400}
              fontFamily="var(--font-mono)"
              pointerEvents="none"
            >
              {short}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
