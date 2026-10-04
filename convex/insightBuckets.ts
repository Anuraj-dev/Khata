// Pure Insights aggregation. Amounts are paise.
// First row for a non-empty clientId wins, in the order the caller passes
// (the expenses query uses the by_owner_date index, oldest first). That matches
// dedupeByClientId on the client, so a retried insert cannot inflate a month.

export type InsightSource = "manual" | "sms";

export type InsightExpense = {
  clientId?: string | null;
  amount: number;
  note: string;
  category: string;
  source: InsightSource;
  direction: "debit" | "credit";
  party?: string;
  date: string;
};

export type InsightMerchant = {
  identity: string;
  party: string;
  note: string;
  category: string;
  amount: number;
};

export type InsightMonth = {
  key: string;
  debit: number;
  credit: number;
  /** Debit paise logged from SMS. This is the entry path, not a payment rail. */
  sms: number;
  /** Debit paise typed in by hand (source "manual"). */
  manual: number;
  categories: { category: string; amount: number }[];
  merchants: InsightMerchant[];
};

const MERCHANT_CAP = 6;

/** Stable bucket for "who was this". Party, then note, then category slug. */
export function merchantIdentity(
  party: string | undefined,
  note: string | undefined,
  category: string,
): string {
  if (party) return `p:${party}`;
  if (note) return `n:${note}`;
  return `c:${category}`;
}

export function aggregateInsights(rows: readonly InsightExpense[]): InsightMonth[] {
  const seen = new Set<string>();
  const months = new Map<
    string,
    {
      key: string;
      debit: number;
      credit: number;
      sms: number;
      manual: number;
      categories: Map<string, number>;
      merchants: Map<string, InsightMerchant>;
    }
  >();

  for (const e of rows) {
    if (e.clientId) {
      if (seen.has(e.clientId)) continue;
      seen.add(e.clientId);
    }
    const key = e.date.slice(0, 7);
    let month = months.get(key);
    if (!month) {
      month = {
        key,
        debit: 0,
        credit: 0,
        sms: 0,
        manual: 0,
        categories: new Map(),
        merchants: new Map(),
      };
      months.set(key, month);
    }
    if (e.direction === "credit") {
      month.credit += e.amount;
      continue;
    }
    month.debit += e.amount;
    if (e.source === "sms") month.sms += e.amount;
    else month.manual += e.amount;
    month.categories.set(e.category, (month.categories.get(e.category) ?? 0) + e.amount);
    const identity = merchantIdentity(e.party, e.note, e.category);
    const existing = month.merchants.get(identity);
    if (existing) {
      existing.amount += e.amount;
    } else {
      month.merchants.set(identity, {
        identity,
        party: e.party ?? "",
        note: e.note ?? "",
        category: e.category,
        amount: e.amount,
      });
    }
  }

  return [...months.values()].map((month) => ({
    key: month.key,
    debit: month.debit,
    credit: month.credit,
    sms: month.sms,
    manual: month.manual,
    categories: [...month.categories.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
    merchants: [...month.merchants.values()]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, MERCHANT_CAP),
  }));
}
