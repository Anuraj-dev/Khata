import { describe, it } from "vitest";

// Living checklist of the bugs this hardening round fixes. Each `todo` becomes a
// real red→green test in the PR that fixes it (kept here so the suite output
// always shows the outstanding regression coverage). See plan.md → M12.

describe("M12 regressions", () => {
  // PR2 — state refactor (Convex-truth + optimistic + cache-seeded gate)
  //   ✓ optimisticExpenses.test.ts — added expense shows instantly; clean rollback
  //   ✓ expenseGate.test.ts        — never strands the user on a spinner

  // PR3 — SMS review card
  it.todo("an unparsed SMS (no amount/direction) can be completed and saved by hand");
});
