import { useMemo, useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { ExpenseCard } from "../components/ExpenseCard";
import { Button } from "../components/Button";
import { ChevronLeft, ChevronRight } from "../components/icons";
import { useCategories } from "../hooks/useCategories";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { monthLabel } from "../lib/dates";
import { dedupeByClientId, expenseCreationTime } from "../lib/expenseStorage";
import {
  expensesToCsv,
  filterExpenses,
  monthIsoRange,
  type ExpenseDirection,
} from "../lib/expenseReport";

function currentMonthKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const next = new Date(year, monthNumber - 1 + delta, 1);
  return currentMonthKey(next);
}

const fieldStyle = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border-subtle)",
  color: "var(--color-text-primary)",
  borderRadius: "var(--radius-md)",
  fontFamily: "var(--font-sans)",
} as const;

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function SearchScreen() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { categories, resolve } = useCategories();
  const [month, setMonth] = useState(currentMonthKey);
  const [text, setText] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [direction, setDirection] = useState<ExpenseDirection | "">("");
  const online = useOnlineStatus();

  const range = monthIsoRange(month);
  const canSearch = online && isAuthenticated && range !== null;
  const loaded = useQuery(
    api.expenses.listRange,
    canSearch ? { start: range.start, end: range.end } : "skip",
  );

  const rows = useMemo(() => {
    const list = dedupeByClientId(loaded ?? []);
    return [...list].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return expenseCreationTime(b) - expenseCreationTime(a);
    });
  }, [loaded]);

  const filtered = useMemo(
    () => filterExpenses(rows, { text, categoryId, direction }),
    [rows, text, categoryId, direction],
  );

  const thisMonth = currentMonthKey();
  const monthTitle = range ? monthLabel(range.start) : month;

  function exportCsv() {
    const csv = expensesToCsv(
      filtered.map((row) => ({
        date: row.date,
        direction: row.direction,
        amount: row.amount,
        category: resolve(row.category).label,
        note: row.note,
        party: row.party,
        udhaarPerson: row.udhaarPerson,
        source: row.source,
      })),
    );
    downloadCsv(`khata-${month}.csv`, csv);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div
        className="shrink-0 px-4 pt-4 pb-3 flex flex-col gap-3"
        style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMonth((value) => shiftMonth(value, -1))}
            aria-label="Previous month"
            className="flex h-11 w-11 items-center justify-center shrink-0"
            style={{
              color: "var(--color-text-secondary)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <ChevronLeft size={20} strokeWidth={2} />
          </button>
          <label htmlFor="search-month" className="sr-only">
            Month
          </label>
          <input
            id="search-month"
            type="month"
            value={month}
            max={thisMonth}
            onChange={(event) => {
              const next = event.target.value;
              if (next) setMonth(next);
            }}
            className="min-w-0 flex-1 px-3 text-sm font-semibold text-center"
            style={{ ...fieldStyle, minHeight: 44 }}
          />
          <button
            type="button"
            onClick={() => setMonth((value) => shiftMonth(value, 1))}
            disabled={month >= thisMonth}
            aria-label="Next month"
            className="flex h-11 w-11 items-center justify-center shrink-0 disabled:opacity-30"
            style={{
              color: "var(--color-text-secondary)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <ChevronRight size={20} strokeWidth={2} />
          </button>
        </div>

        <label htmlFor="search-text" className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
          Search note, party, or person
          <input
            id="search-text"
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Tea, IRCTC, Ravi…"
            autoComplete="off"
            className="w-full px-3 text-sm font-normal outline-none"
            style={{ ...fieldStyle, color: "var(--color-text-primary)", minHeight: 44 }}
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label htmlFor="search-category" className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
            Category
            <select
              id="search-category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="w-full px-2 text-sm font-normal"
              style={{ ...fieldStyle, minHeight: 44 }}
            >
              <option value="">All</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.emoji} {category.label}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="search-direction" className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
            Direction
            <select
              id="search-direction"
              value={direction}
              onChange={(event) => setDirection(event.target.value as ExpenseDirection | "")}
              className="w-full px-2 text-sm font-normal"
              style={{ ...fieldStyle, minHeight: 44 }}
            >
              <option value="">All</option>
              <option value="debit">Spent</option>
              <option value="credit">Received</option>
            </select>
          </label>
        </div>
      </div>

      {!online ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center gap-2">
          <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
            Search needs a connection.
          </p>
          <p className="text-xs max-w-xs" style={{ color: "var(--color-text-muted)" }}>
            A month search reads the full ledger, past the recent list on Home.
          </p>
        </div>
      ) : !authLoading && !isAuthenticated ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center gap-2">
          <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
            Sign in to search your expenses.
          </p>
          <p className="text-xs max-w-xs" style={{ color: "var(--color-text-muted)" }}>
            A month search reads this account's full ledger, past the recent list on Home.
          </p>
        </div>
      ) : range === null ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center gap-2">
          <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
            That month isn't valid.
          </p>
        </div>
      ) : loaded === undefined ? (
        <div className="flex flex-1 items-center justify-center" style={{ color: "var(--color-text-muted)" }}>
          <span className="text-sm">Loading…</span>
        </div>
      ) : (
        <>
          <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3">
            <p className="text-sm min-w-0" style={{ color: "var(--color-text-secondary)" }} aria-live="polite">
              <span className="font-semibold tabular-nums" style={{ color: "var(--color-text-primary)" }}>
                {filtered.length}
              </span>
              {filtered.length === rows.length
                ? ` expense${filtered.length === 1 ? "" : "s"} in ${monthTitle}`
                : ` of ${rows.length} in ${monthTitle}`}
            </p>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              disabled={filtered.length === 0}
              onClick={exportCsv}
            >
              Download CSV
            </Button>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {rows.length === 0
                  ? `Nothing logged in ${monthTitle}.`
                  : "Nothing matches these filters."}
              </p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto pb-24">
              <ul>
                {filtered.map((expense) => (
                  <li key={expense._id}>
                    <ExpenseCard
                      expense={{
                        id: expense._id,
                        amount: expense.amount,
                        note: expense.note,
                        category: expense.category,
                        source: expense.source,
                        direction: expense.direction,
                        party: expense.party,
                        udhaarPerson: expense.udhaarPerson,
                        counterpartyHandle: expense.counterpartyHandle,
                        date: expense.date,
                        createdAt: expenseCreationTime(expense),
                      }}
                      meta={resolve(expense.category)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
