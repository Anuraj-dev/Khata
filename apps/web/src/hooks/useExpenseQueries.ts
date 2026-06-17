import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { todayIso } from "../lib/dates";

export function useExpenseQueries({
  isAuthenticated,
  limit = 100,
}: {
  isAuthenticated: boolean;
  // Raised in +100 steps by the "Load older" control on the expense list.
  limit?: number;
}) {
  const today = todayIso();

  const recentExpenses = useQuery(
    api.expenses.listRecent,
    isAuthenticated ? { limit } : "skip"
  );

  return {
    today,
    recentExpenses: recentExpenses ?? [],
    isRecentLoading: recentExpenses === undefined,
  };
}
