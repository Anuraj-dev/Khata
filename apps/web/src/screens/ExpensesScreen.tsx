import { useEffect } from "react";
import type { Doc } from "@convex/_generated/dataModel";
import { formatRupees } from "../lib/dates";
import { expenseStore, type LocalExpense } from "../lib/expenseStorage";
import { useExpenseList } from "../hooks/useExpenseList";
import { useExpenseQueries } from "../hooks/useExpenseQueries";
import { ExpenseCard } from "../components/ExpenseCard";
import { DaySectionHeader } from "../components/DaySectionHeader";
import { MonthDivider } from "../components/MonthDivider";
import { EmptyExpenses } from "../components/EmptyExpenses";
import { ReviewBanner } from "../components/ReviewBanner";

type Props = {
  isAuthenticated: boolean;
  onAddPress: () => void;
};

// Sum every day-section in a given month (YYYY-MM) for the divider header.
function monthTotals(
  sections: { date: string; totalDebit: number; totalCredit: number }[],
  month: string
): { totalDebit: number; totalCredit: number } {
  return sections
    .filter((s) => s.date.slice(0, 7) === month)
    .reduce(
      (acc, s) => ({
        totalDebit: acc.totalDebit + s.totalDebit,
        totalCredit: acc.totalCredit + s.totalCredit,
      }),
      { totalDebit: 0, totalCredit: 0 }
    );
}

export function ExpensesScreen({ isAuthenticated, onAddPress }: Props) {
  const { sections, isEmpty, todayDebit, todayCredit } = useExpenseList();
  const { recentExpenses } = useExpenseQueries({ isAuthenticated });

  // Sync server data into local store when it arrives
  useEffect(() => {
    if (!recentExpenses.length) return;
    const serverExpenses: LocalExpense[] = recentExpenses.map((e: Doc<"expenses">) => ({
      id: e.clientId,
      amount: e.amount,
      note: e.note,
      category: e.category,
      source: e.source,
      direction: e.direction,
      upiRef: e.upiRef,
      party: e.party,
      date: e.date,
      createdAt: e._creationTime,
      syncedId: e._id,
    }));
    expenseStore._syncFromServer(serverExpenses);
  }, [recentExpenses]);

  if (isEmpty) {
    return (
      <div className="flex flex-col flex-1">
        <ReviewBanner />
        <EmptyExpenses onAdd={onAddPress} />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <ReviewBanner />
      {/* Today summary bar */}
      {(todayDebit > 0 || todayCredit > 0) && (
        <div
          className="flex gap-8 px-4 py-3 border-b"
          style={{ borderColor: "var(--color-border-subtle)" }}
        >
          {todayDebit > 0 && (
            <div className="flex flex-col gap-0.5">
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Today's spend
              </span>
              <span
                className="text-xl tabular-nums font-medium"
                style={{ color: "var(--color-debit)", fontFamily: "var(--font-mono)", letterSpacing: -0.5 }}
              >
                {formatRupees(todayDebit)}
              </span>
            </div>
          )}
          {todayCredit > 0 && (
            <div className="flex flex-col gap-0.5">
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Received
              </span>
              <span
                className="text-xl tabular-nums font-medium"
                style={{ color: "var(--color-credit)", fontFamily: "var(--font-mono)", letterSpacing: -0.5 }}
              >
                {formatRupees(todayCredit)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Expense list */}
      <div className="flex-1 overflow-y-auto pb-32">
        {sections.map((section, i) => {
          const month = section.date.slice(0, 7);
          const isNewMonth = i === 0 || sections[i - 1].date.slice(0, 7) !== month;
          return (
            <div key={section.date}>
              {isNewMonth && (
                <MonthDivider isoDate={section.date} {...monthTotals(sections, month)} />
              )}
              <DaySectionHeader
                label={section.label}
                totalDebit={section.totalDebit}
                totalCredit={section.totalCredit}
              />
              {section.data.map((expense) => (
                <ExpenseCard key={expense.id} expense={expense} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
