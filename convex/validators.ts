// Shared input guards for money mutations. Convex's `v.number()` accepts any
// finite number — including 0, negatives, fractions, and absurd values — which
// would silently corrupt totals and budgets. Every server insert/patch of a
// money amount runs through assertValidAmount so a malformed or hostile client
// can't poison the ledger.

// Amounts are integer paise. Cap at ₹1 crore (1,000,000,000 paise): comfortably
// above any real personal expense, low enough to bound damage from a bad client.
export const MAX_AMOUNT_PAISE = 1_000_000_000;

export function assertValidAmount(amount: number): void {
  if (!Number.isInteger(amount) || amount <= 0 || amount > MAX_AMOUNT_PAISE) {
    throw new Error("Invalid amount");
  }
}
