import { describe, it, expect } from "vitest";
import { shouldShowExpenseSkeleton } from "./expenseGate";

// The contract that kills the "stuck loading screen": a user is only shown the
// skeleton when there's nothing to render AND a load is genuinely in flight.

describe("shouldShowExpenseSkeleton", () => {
  it("never shows a skeleton once there are rows to paint", () => {
    expect(
      shouldShowExpenseSkeleton({
        isHydrated: true,
        isEmpty: false,
        isAuthenticated: true,
        isRecentLoading: true, // query still refetching, but we have cached rows
      })
    ).toBe(false);
  });

  it("shows a skeleton for the brief tick before the cache is read", () => {
    expect(
      shouldShowExpenseSkeleton({
        isHydrated: false,
        isEmpty: true,
        isAuthenticated: true,
        isRecentLoading: true,
      })
    ).toBe(true);
  });

  it("shows a skeleton while an authenticated first fetch is pending and nothing is cached", () => {
    expect(
      shouldShowExpenseSkeleton({
        isHydrated: true,
        isEmpty: true,
        isAuthenticated: true,
        isRecentLoading: true,
      })
    ).toBe(true);
  });

  it("shows the empty state (not a spinner) once the fetch resolves empty", () => {
    expect(
      shouldShowExpenseSkeleton({
        isHydrated: true,
        isEmpty: true,
        isAuthenticated: true,
        isRecentLoading: false,
      })
    ).toBe(false);
  });

  it("never strands an offline / signed-out user with an empty cache", () => {
    // This is the regression: the old gate kept the skeleton up forever when
    // !isAuthenticated, so an offline returning user with no rows saw a spinner.
    expect(
      shouldShowExpenseSkeleton({
        isHydrated: true,
        isEmpty: true,
        isAuthenticated: false,
        isRecentLoading: true,
      })
    ).toBe(false);
  });
});
