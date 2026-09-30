import { describe, expect, it } from "vitest";
import { expensesToCsv, filterExpenses, monthIsoRange } from "./expenseReport";

const rows = [
  {
    date: "2026-09-01",
    note: "Chai at Cafe",
    party: "IRCTC",
    udhaarPerson: "Ravi",
    category: "food",
    direction: "debit" as const,
    amount: 25050,
    source: "manual" as const,
  },
  {
    date: "2026-09-02",
    note: "Rent",
    party: "Landlord",
    udhaarPerson: undefined,
    category: "bills",
    direction: "debit" as const,
    amount: 1500000,
    source: "manual" as const,
  },
  {
    date: "2026-09-03",
    note: "Refund",
    party: "Amazon",
    category: "shopping",
    direction: "credit" as const,
    amount: 50000,
    source: "sms" as const,
  },
];

describe("filterExpenses", () => {
  it("matches a note regardless of case", () => {
    expect(filterExpenses(rows, { text: "CHAI" }).map((row) => row.note)).toEqual([
      "Chai at Cafe",
    ]);
  });

  it("matches a party regardless of case", () => {
    expect(filterExpenses(rows, { text: "amazon" }).map((row) => row.party)).toEqual([
      "Amazon",
    ]);
  });

  it("matches an udhaar person", () => {
    expect(filterExpenses(rows, { text: "ravi" })).toHaveLength(1);
  });

  it("filters by category id and direction", () => {
    expect(filterExpenses(rows, { categoryId: "food", direction: "debit" })).toHaveLength(1);
    expect(filterExpenses(rows, { categoryId: "food", direction: "credit" })).toHaveLength(0);
    expect(filterExpenses(rows, { direction: "credit" }).map((row) => row.note)).toEqual([
      "Refund",
    ]);
    expect(filterExpenses(rows, { categoryId: "bills" }).map((row) => row.note)).toEqual([
      "Rent",
    ]);
  });

  it("treats blank text as no text filter", () => {
    expect(filterExpenses(rows, { text: "   " })).toHaveLength(rows.length);
  });
});

describe("expensesToCsv", () => {
  it("quotes fields that contain commas and renders 25050 paise as 250.50", () => {
    const csv = expensesToCsv([
      {
        date: "2026-09-01",
        direction: "debit",
        amount: 25050,
        category: "Food, drinks",
        note: 'Said "thanks"',
        party: "A, B",
        udhaarPerson: "Ravi",
        source: "manual",
      },
    ]);

    expect(csv.split("\n")[0]).toBe(
      "date,direction,amount_rupees,category,note,party,udhaar_person,source",
    );
    expect(csv).toContain(",250.50,");
    expect(csv).toContain('"Food, drinks"');
    expect(csv).toContain('"Said ""thanks"""');
    expect(csv).toContain('"A, B"');
    expect(csv).toContain(",Ravi,manual");
  });

  it("neutralizes formula-looking text and leaves a negative amount numeric", () => {
    const csv = expensesToCsv([
      {
        date: "2026-09-04",
        direction: "debit",
        amount: -25050,
        category: "-cmd",
        note: "=1+1",
        party: "+cmd",
        udhaarPerson: "@cmd",
        source: "\tcmd",
      },
      {
        date: "2026-09-05",
        direction: "credit",
        amount: 100,
        category: "bills",
        note: "\r=1",
        source: "manual",
      },
    ]);

    expect(csv).toContain(",-250.50,");
    expect(csv).not.toContain('"-250.50"');
    expect(csv).not.toContain("'-250.50");
    expect(csv).toContain(`"'-cmd"`);
    expect(csv).toContain(`"'=1+1"`);
    expect(csv).toContain(`"'+cmd"`);
    expect(csv).toContain(`"'@cmd"`);
    expect(csv).toContain(`"'\tcmd"`);
    expect(csv).toContain(`"'\r=1"`);
    expect(csv).not.toMatch(/(^|,)=1\+1(,|$)/);
  });

  it("leaves plain fields unquoted and writes empty party and person", () => {
    const csv = expensesToCsv([
      {
        date: "2026-09-02",
        direction: "credit",
        amount: 100,
        category: "bills",
        note: "Rent",
        source: "sms",
      },
    ]);
    expect(csv.split("\n")[1]).toBe("2026-09-02,credit,1.00,bills,Rent,,,sms");
  });
});

describe("monthIsoRange", () => {
  it("covers a whole month, including a leap February", () => {
    expect(monthIsoRange("2026-09")).toEqual({ start: "2026-09-01", end: "2026-09-30" });
    expect(monthIsoRange("2024-02")).toEqual({ start: "2024-02-01", end: "2024-02-29" });
    expect(monthIsoRange("2026-13")).toBeNull();
  });
});
