import { useEffect, useState } from "react";
import type { Doc } from "@convex/_generated/dataModel";
import { formatRupees, todayIso } from "../lib/dates";
import { expenseStore, type LocalExpense } from "../lib/expenseStorage";
import { useExpenseList } from "../hooks/useExpenseList";
import { useExpenseQueries } from "../hooks/useExpenseQueries";
import { useCategories } from "../hooks/useCategories";
import { useBudget } from "../hooks/useBudget";
import { ExpenseCard } from "../components/ExpenseCard";
import { DaySectionHeader } from "../components/DaySectionHeader";
import { MonthDivider } from "../components/MonthDivider";
import { EmptyExpenses } from "../components/EmptyExpenses";
import { ReviewBanner } from "../components/ReviewBanner";
import { TripsSummary } from "../components/TripsSummary";
import { BudgetPromptCard } from "../components/BudgetPromptCard";
import { SetBudgetSheet } from "../components/SetBudgetSheet";
import { TagUdhaarSheet } from "../components/TagUdhaarSheet";

const BUDGET_PROMPT_DISMISSED_KEY = "khata:budgetPromptDismissed";
const HISTORY_PAGE = 100;

type Props = {
  isAuthenticated: boolean;
  onAddPress: () => void;
  showToast: (t: { kind: "error" | "info"; message: string }) => void;
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

export function ExpensesScreen({ isAuthenticated, onAddPress, showToast }: Props) {
  const { sections, isEmpty, isHydrated, todayDebit, todayCredit } = useExpenseList();
  const [historyLimit, setHistoryLimit] = useState(HISTORY_PAGE);
  const { recentExpenses, isRecentLoading } = useExpenseQueries({
    isAuthenticated,
    limit: historyLimit,
  });
  const { resolve } = useCategories();
  const budget = useBudget(isAuthenticated);
  const [budgetSheetOpen, setBudgetSheetOpen] = useState(false);
  const [taggingExpense, setTaggingExpense] = useState<LocalExpense | null>(null);
  const [promptDismissed, setPromptDismissed] = useState(
    () => localStorage.getItem(BUDGET_PROMPT_DISMISSED_KEY) === "1"
  );

  // This month's spend (debits), used both to suggest a starting budget and to
  // ground the prompt copy. recentExpenses caps at 100 rows, which is plenty at
  // the stage where the prompt is still showing.
  const month = todayIso().slice(0, 7);
  const spentThisMonth = recentExpenses
    .filter((e) => e.direction === "debit" && e.date.startsWith(month))
    .reduce((sum, e) => sum + e.amount, 0);

  // Prompt once the user has seen value: ≥10 expenses or ≥3 distinct active days.
  const distinctDays = new Set(recentExpenses.map((e) => e.date)).size;
  const promptEligible =
    !budget.loading &&
    budget.status === null &&
    !promptDismissed &&
    (recentExpenses.length >= 10 || distinctDays >= 3);

  function dismissPrompt() {
    localStorage.setItem(BUDGET_PROMPT_DISMISSED_KEY, "1");
    setPromptDismissed(true);
  }

  // Reconcile only after the authenticated query resolves. An empty response is
  // meaningful too: it must clear stale data from a previous account/session.
  useEffect(() => {
    if (!isAuthenticated || isRecentLoading) return;
    const serverExpenses: LocalExpense[] = recentExpenses.map((e: Doc<"expenses">) => ({
      id: e.clientId,
      amount: e.amount,
      note: e.note,
      category: e.category,
      source: e.source,
      direction: e.direction,
      upiRef: e.upiRef,
      party: e.party,
      udhaarPerson: e.udhaarPerson,
      date: e.date,
      createdAt: e._creationTime,
      syncedId: e._id,
    }));
    expenseStore._syncFromServer(serverExpenses);
  }, [isAuthenticated, isRecentLoading, recentExpenses]);

  // Net for the day: what's left after spend vs received. Positive = up, negative = down.
  const todayNet = todayCredit - todayDebit;

  const isExpenseBootstrapPending =
    !isHydrated ||
    !isAuthenticated ||
    isRecentLoading ||
    recentExpenses.length > 0;

  if (isEmpty && isExpenseBootstrapPending) {
    return (
      <div
        className="flex flex-1 items-center justify-center"
        style={{ color: "var(--color-text-muted)" }}
      >
        <span className="text-sm">Loading expenses…</span>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <ReviewBanner />
        <TripsSummary isAuthenticated={isAuthenticated} />
        <EmptyExpenses onAdd={onAddPress} />
      </div>
    );
  }

  // Safe-to-spend, shown whenever a budget exists (even before the first spend
  // of the day, so the morning number is visible). Negative = over today's plan.
  const safeToday = budget.status?.safeToday ?? null;
  const overPlan = safeToday !== null && safeToday < 0;
  // Tomorrow's recomputed plan for the warm over-plan one-liner.
  const daysLeftAfterToday = budget.status ? budget.status.daysRemaining - 1 : 0;
  const tomorrowPlan =
    budget.status && daysLeftAfterToday > 0
      ? Math.max(0, Math.floor((budget.status.monthlyLimit - budget.status.monthSpent) / daysLeftAfterToday))
      : null;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ReviewBanner />
      {/* Today summary bar */}
      {(todayDebit > 0 || todayCredit > 0 || budget.status) && (
        <div
          className="flex flex-wrap gap-x-6 gap-y-2 px-4 py-3 border-b"
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
          {/* Net — only meaningful once there's both a spend and a credit to net. */}
          {todayDebit > 0 && todayCredit > 0 && (
            <div className="flex flex-col gap-0.5">
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Net
              </span>
              <span
                className="text-xl tabular-nums font-medium"
                style={{
                  color: todayNet >= 0 ? "var(--color-credit)" : "var(--color-debit)",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: -0.5,
                }}
              >
                {todayNet >= 0 ? "+" : "−"}{formatRupees(Math.abs(todayNet))}
              </span>
            </div>
          )}
          {/* Safe-to-spend — the one number that answers "can I afford this". */}
          {safeToday !== null && (
            <div className="flex flex-col gap-0.5">
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Left today
              </span>
              <span
                className="text-xl tabular-nums font-medium"
                style={{
                  color: overPlan ? "var(--color-debit)" : "var(--color-credit)",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: -0.5,
                }}
              >
                {overPlan ? "−" : ""}{formatRupees(Math.abs(safeToday))}
              </span>
            </div>
          )}
          {/* Warm over-plan note — concrete, never shaming. */}
          {overPlan && (
            <p className="w-full text-xs" style={{ color: "var(--color-text-secondary)" }}>
              {tomorrowPlan !== null
                ? <>Thoda zyada aaj 😅 — kal se {formatRupees(tomorrowPlan)}/day.</>
                : <>Thoda zyada aaj 😅 — month ends today, fresh start tomorrow.</>}
            </p>
          )}
        </div>
      )}
      {promptEligible && (
        <BudgetPromptCard
          spentThisMonth={spentThisMonth}
          onSet={() => setBudgetSheetOpen(true)}
          onLater={dismissPrompt}
        />
      )}
      <TripsSummary isAuthenticated={isAuthenticated} />

      {/* Expense list */}
      <div
        className="flex-1 min-h-0 overflow-y-auto pb-32"
        style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}
      >
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
                net={section.totalCredit - section.totalDebit}
                showNet={section.label !== "Today"}
              />
              {section.data.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  meta={resolve(expense.category)}
                  onPress={expense.syncedId ? () => setTaggingExpense(expense) : undefined}
                />
              ))}
            </div>
          );
        })}

        {/* Older history loads in +100 steps so a decade of data stays light. */}
        {recentExpenses.length >= historyLimit && (
          <button
            onClick={() => setHistoryLimit((l) => l + HISTORY_PAGE)}
            className="w-full py-4 text-sm font-medium"
            style={{ background: "none", border: "none", color: "var(--color-accent)", cursor: "pointer" }}
          >
            Load older
          </button>
        )}
      </div>

      <TagUdhaarSheet
        expense={taggingExpense}
        onClose={() => setTaggingExpense(null)}
        showToast={showToast}
      />

      <SetBudgetSheet
        open={budgetSheetOpen}
        onClose={() => setBudgetSheetOpen(false)}
        current={budget.status?.monthlyLimit ?? null}
        spentThisMonth={spentThisMonth}
        onSave={async (paise) => {
          await budget.setBudget({ monthlyLimit: paise });
          dismissPrompt();
        }}
      />
    </div>
  );
}
