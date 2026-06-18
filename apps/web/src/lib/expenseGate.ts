// The single decision behind the expense-list loading skeleton. Extracted as a
// pure function so the "never strand the user on a spinner" contract is unit
// tested directly, independent of the screen's many queries.
//
// Rule: a skeleton is only honest when there is genuinely nothing to show AND a
// load is actually in flight. If the local cache already hydrated (even to an
// empty list), or the user is offline / signed out, we show real content (the
// list or the empty state) — never an indefinite spinner.

export type ExpenseGateState = {
  /** localStorage cache has been read (first React tick). */
  isHydrated: boolean;
  /** No expenses to render from cache or live query. */
  isEmpty: boolean;
  /** Convex session resolved to authenticated. */
  isAuthenticated: boolean;
  /** The listRecent query is still in flight (undefined). */
  isRecentLoading: boolean;
};

export function shouldShowExpenseSkeleton(s: ExpenseGateState): boolean {
  if (!s.isEmpty) return false; // we have rows — paint them
  if (!s.isHydrated) return true; // cache not read yet — brief, genuine load
  // Empty + hydrated: only keep the skeleton while an authenticated server
  // fetch is actually pending. Offline / signed-out / resolved-empty → empty state.
  return s.isAuthenticated && s.isRecentLoading;
}
