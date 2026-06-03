import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { todayIso } from "../lib/dates";

export function useExpenseQueries({ isAuthenticated }: { isAuthenticated: boolean }) {
  const today = todayIso();

  const todayExpenses = useQuery(
    api.expenses.listByDate,
    isAuthenticated ? { date: today } : "skip"
  );

  const recentExpenses = useQuery(
    api.expenses.listRecent,
    isAuthenticated ? { limit: 100 } : "skip"
  );

  const isTodayLoading = todayExpenses === undefined;
  const isRecentLoading = recentExpenses === undefined;

  return {
    today,
    todayExpenses: todayExpenses ?? [],
    recentExpenses: recentExpenses ?? [],
    isTodayLoading,
    isRecentLoading,
  };
}
