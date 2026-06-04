import { useEffect } from "react";
import type { Doc } from "@convex/_generated/dataModel";
import { formatRupees } from "../lib/dates";
import { expenseStore, type LocalExpense } from "../lib/expenseStorage";
import { useExpenseList } from "../hooks/useExpenseList";
import { useExpenseQueries } from "../hooks/useExpenseQueries";
import { ExpenseCard } from "../components/ExpenseCard";
import { DaySectionHeader } from "../components/DaySectionHeader";
import { EmptyExpenses } from "../components/EmptyExpenses";

type Props = {
  isAuthenticated: boolean;
  onAddPress: () => void;
};

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
    return <EmptyExpenses onAdd={onAddPress} />;
  }

  return (
    <div className="flex flex-col flex-1">
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
        {sections.map((section) => (
          <div key={section.date}>
            <DaySectionHeader
              label={section.label}
              totalDebit={section.totalDebit}
              totalCredit={section.totalCredit}
            />
            {section.data.map((expense) => (
              <ExpenseCard key={expense.id} expense={expense} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
