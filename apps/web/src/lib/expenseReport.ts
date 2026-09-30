// Pure month-search helpers. The screen loads one calendar month with
// `expenses.listRange` (no 100-row cap); these functions narrow that month
// and turn the visible rows into a spreadsheet.

export type ExpenseDirection = "debit" | "credit";

export type ExpenseSearchFields = {
  note: string;
  party?: string | null;
  udhaarPerson?: string | null;
  category: string;
  direction: ExpenseDirection;
};

export type ExpenseSearchFilters = {
  /** Case-insensitive substring over note, party, and udhaar person. */
  text?: string;
  /** Category id. Empty or omitted keeps every category. */
  categoryId?: string;
  /** Empty or omitted keeps both directions. */
  direction?: ExpenseDirection | "";
};

export type CsvExpense = {
  date: string;
  direction: ExpenseDirection;
  /** Amount in paise. */
  amount: number;
  category: string;
  note: string;
  party?: string | null;
  udhaarPerson?: string | null;
  source: string;
};

const CSV_HEADER =
  "date,direction,amount_rupees,category,note,party,udhaar_person,source";

export function filterExpenses<T extends ExpenseSearchFields>(
  rows: readonly T[],
  filters: ExpenseSearchFilters,
): T[] {
  const needle = (filters.text ?? "").trim().toLowerCase();
  const categoryId = filters.categoryId ?? "";
  const direction = filters.direction ?? "";

  return rows.filter((row) => {
    if (categoryId && row.category !== categoryId) return false;
    if (direction && row.direction !== direction) return false;
    if (!needle) return true;
    const haystack = [row.note, row.party ?? "", row.udhaarPerson ?? ""]
      .join("\n")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

/** Inclusive ISO dates for a `YYYY-MM` month, or null when the key is invalid. */
export function monthIsoRange(month: string): { start: string; end: string } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) return null;
  // Day 0 of the next month is the last local day of this month, including leaps.
  const lastDay = new Date(year, monthNumber, 0).getDate();
  const mm = match[2];
  return {
    start: `${match[1]}-${mm}-01`,
    end: `${match[1]}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}

// Excel treats a text cell that starts with one of these as a formula.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function csvField(value: string): string {
  const neutralize = FORMULA_PREFIX.test(value);
  const text = neutralize ? `'${value}` : value;
  if (neutralize || /[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function paiseToRupees(paise: number): string {
  return (paise / 100).toFixed(2);
}

export function expensesToCsv(rows: readonly CsvExpense[]): string {
  const lines = [CSV_HEADER];
  for (const row of rows) {
    lines.push(
      [
        csvField(row.date),
        csvField(row.direction),
        paiseToRupees(row.amount),
        csvField(row.category),
        csvField(row.note),
        csvField(row.party ?? ""),
        csvField(row.udhaarPerson ?? ""),
        csvField(row.source),
      ].join(","),
    );
  }
  return lines.join("\n");
}
