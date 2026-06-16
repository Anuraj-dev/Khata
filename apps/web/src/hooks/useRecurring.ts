import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { todayIso } from "../lib/dates";

// Recurring-bill radar: detected suggestions + confirmed upcoming bills.
export function useRecurring(isAuthenticated: boolean) {
  const candidates = useQuery(api.recurring.detect, isAuthenticated ? {} : "skip");
  const upcoming = useQuery(
    api.recurring.listUpcoming,
    isAuthenticated ? { today: todayIso() } : "skip"
  );
  const confirm = useMutation(api.recurring.confirm);
  const dismiss = useMutation(api.recurring.dismiss);
  const removeRule = useMutation(api.recurring.removeRule);

  return {
    candidates: candidates ?? [],
    upcoming: upcoming ?? [],
    confirm,
    dismiss,
    removeRule,
  };
}
