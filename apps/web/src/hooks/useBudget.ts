import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { todayIso } from "../lib/dates";

export type BudgetStatus = {
  monthlyLimit: number;
  monthSpent: number;
  todaySpent: number;
  daysRemaining: number;
  dailyPlan: number;
  safeToday: number;
};

// Server-computed budget status (null = no budget set). The client's local date
// is passed in so the daily-plan math matches the user's calendar, not UTC.
export function useBudget(isAuthenticated: boolean) {
  const status = useQuery(
    api.budget.getStatus,
    isAuthenticated ? { today: todayIso() } : "skip"
  );
  const setBudget = useMutation(api.budget.setBudget);
  const clearBudget = useMutation(api.budget.clearBudget);

  return {
    status: (status ?? null) as BudgetStatus | null,
    loading: status === undefined,
    setBudget,
    clearBudget,
  };
}
