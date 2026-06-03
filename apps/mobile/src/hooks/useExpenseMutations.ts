import { useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { classifyError, createActionId, mobileLogger } from "../lib/logger";
import { haptic } from "../lib/haptic";
import type { RetryPayload } from "./useRetryQueue";
import type { ExpenseDraft } from "../lib/expenseStorage";
import { todayIso } from "../lib/dates";

export function useExpenseMutations({
  showToast,
  enqueueRetry,
}: {
  showToast: (t: { kind: "error" | "info"; message: string }) => void;
  enqueueRetry: (item: { label: string; payload: RetryPayload }) => void;
}) {
  const addExpenseMutation = useMutation(api.expenses.addExpense);
  const deleteExpenseMutation = useMutation(api.expenses.deleteExpense);

  const addExpense = useCallback(
    async (draft: ExpenseDraft): Promise<boolean> => {
      const actionId = createActionId("add_expense");
      try {
        await addExpenseMutation({
          clientId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          amount: draft.amount,
          note: draft.note,
          category: draft.category,
          source: draft.source ?? "manual",
          direction: draft.direction,
          date: draft.date ?? todayIso(),
          party: draft.party,
          upiRef: draft.upiRef,
        });
        haptic.medium();
        mobileLogger.info("add_expense_succeeded", { actionId });
        return true;
      } catch (error) {
        const isOffline = classifyError(error) === "network";
        if (isOffline) {
          enqueueRetry({
            label: `Add ₹${(draft.amount / 100).toFixed(2)} expense`,
            payload: {
              type: "addExpense",
              clientId: `retry-${Date.now()}`,
              amount: draft.amount,
              note: draft.note,
              category: draft.category,
              direction: draft.direction,
              date: draft.date ?? todayIso(),
              party: draft.party,
              upiRef: draft.upiRef,
            },
          });
          showToast({ kind: "error", message: "Offline. Expense queued for sync." });
        } else {
          showToast({ kind: "error", message: "Could not save expense. Try again." });
        }
        haptic.error();
        mobileLogger.error("add_expense_failed", { actionId, errorType: classifyError(error) });
        return false;
      }
    },
    [addExpenseMutation, enqueueRetry, showToast]
  );

  const deleteExpense = useCallback(
    async (expenseId: Parameters<typeof deleteExpenseMutation>[0]["expenseId"]): Promise<void> => {
      const actionId = createActionId("delete_expense");
      try {
        await deleteExpenseMutation({ expenseId });
        haptic.light();
        mobileLogger.info("delete_expense_succeeded", { actionId });
      } catch (error) {
        showToast({ kind: "error", message: "Could not delete expense." });
        mobileLogger.error("delete_expense_failed", { actionId, errorType: classifyError(error) });
      }
    },
    [deleteExpenseMutation, showToast]
  );

  return { addExpense, deleteExpense };
}
