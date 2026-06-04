// Split math for trips. All amounts in paise.

export type TripExpenseLite = {
  paidBy: string;
  amount: number;
  splitAmong: string[];
  splitMode?: "equal" | "custom";
  shares?: { member: string; amount: number }[];
};

export type PaymentLite = { fromMember: string; toMember: string; amount: number };

export type Settlement = { from: string; to: string; amount: number };

// Net position per member: positive = they are owed money, negative = they owe.
// The payer is credited the full amount. Custom-split expenses debit each member
// their explicit share; equal splits divide evenly, spreading remainder paise
// over the first few sharers so the books balance to the rupee.
export function computeBalances(
  members: string[],
  expenses: TripExpenseLite[]
): Record<string, number> {
  const net: Record<string, number> = {};
  for (const m of members) net[m] = 0;

  for (const e of expenses) {
    if (e.amount <= 0) continue;
    net[e.paidBy] = (net[e.paidBy] ?? 0) + e.amount;

    if (e.splitMode === "custom" && e.shares && e.shares.length > 0) {
      for (const s of e.shares) net[s.member] = (net[s.member] ?? 0) - s.amount;
      continue;
    }

    const n = e.splitAmong.length;
    if (n === 0) continue;
    const base = Math.floor(e.amount / n);
    let remainder = e.amount - base * n; // distribute leftover paise
    for (const m of e.splitAmong) {
      const share = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;
      net[m] = (net[m] ?? 0) - share;
    }
  }
  return net;
}

// Apply recorded payments to a net-balance map: the payer's debt shrinks, the
// receiver's credit shrinks. Returns a new map (does not mutate the input).
export function applyPayments(
  net: Record<string, number>,
  payments: PaymentLite[]
): Record<string, number> {
  const out = { ...net };
  for (const p of payments) {
    out[p.fromMember] = (out[p.fromMember] ?? 0) + p.amount;
    out[p.toMember] = (out[p.toMember] ?? 0) - p.amount;
  }
  return out;
}

// Greedy minimum-cash-flow: who should pay whom to settle up with the fewest
// transfers. Dust under 1 rupee from rounding is ignored.
export function simplifyDebts(net: Record<string, number>): Settlement[] {
  const EPS = 100; // ignore < ₹1 of rounding dust
  const creditors = Object.entries(net)
    .filter(([, v]) => v > EPS)
    .map(([m, v]) => ({ m, v }))
    .sort((a, b) => b.v - a.v);
  const debtors = Object.entries(net)
    .filter(([, v]) => v < -EPS)
    .map(([m, v]) => ({ m, v: -v }))
    .sort((a, b) => b.v - a.v);

  const result: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].v, creditors[j].v);
    result.push({ from: debtors[i].m, to: creditors[j].m, amount: pay });
    debtors[i].v -= pay;
    creditors[j].v -= pay;
    if (debtors[i].v <= EPS) i++;
    if (creditors[j].v <= EPS) j++;
  }
  return result;
}
