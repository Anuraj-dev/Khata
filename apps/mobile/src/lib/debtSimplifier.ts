// Greedy debt simplification algorithm.
// Input: map of who paid what and who it was split among.
// Output: minimum set of transactions to settle all debts.

export type Debt = {
  fromMember: string;
  toMember: string;
  amount: number;
};

export type TripExpenseInput = {
  paidBy: string;
  amount: number;
  splitAmong: string[];
};

export function computeDebts(expenses: TripExpenseInput[]): Debt[] {
  // Build net balance map (positive = owed money, negative = owes money)
  const balance = new Map<string, number>();

  for (const expense of expenses) {
    const share = Math.floor(expense.amount / expense.splitAmong.length);
    const remainder = expense.amount - share * expense.splitAmong.length;

    balance.set(expense.paidBy, (balance.get(expense.paidBy) ?? 0) + expense.amount);

    expense.splitAmong.forEach((member, i) => {
      const owes = i === 0 ? share + remainder : share;
      balance.set(member, (balance.get(member) ?? 0) - owes);
    });
  }

  // Separate into creditors (positive balance) and debtors (negative balance)
  const creditors: Array<{ member: string; amount: number }> = [];
  const debtors: Array<{ member: string; amount: number }> = [];

  for (const [member, amount] of balance.entries()) {
    if (amount > 1) creditors.push({ member, amount });
    else if (amount < -1) debtors.push({ member, amount: -amount });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const debts: Debt[] = [];

  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const settled = Math.min(creditor.amount, debtor.amount);

    debts.push({ fromMember: debtor.member, toMember: creditor.member, amount: settled });

    creditor.amount -= settled;
    debtor.amount -= settled;

    if (creditor.amount < 2) ci++;
    if (debtor.amount < 2) di++;
  }

  return debts;
}
