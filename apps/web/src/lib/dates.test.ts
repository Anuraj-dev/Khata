import { describe, it, expect } from "vitest";
import {
  toIsoDate,
  isIsoDate,
  addDays,
  formatRupees,
  formatRupeesCompact,
  monthLabel,
} from "./dates";

// Money + date formatting is the foundation every screen renders through. These
// lock the exact display contract so a refactor can't silently change what a
// user sees (e.g. paise rounding, IST-safe local dates).

describe("formatRupees", () => {
  it("drops decimals for whole-rupee amounts", () => {
    expect(formatRupees(10000)).toBe("₹100");
  });

  it("shows two decimals only when paise are non-zero", () => {
    expect(formatRupees(10050)).toBe("₹100.50");
    expect(formatRupees(12345)).toBe("₹123.45");
  });

  it("groups thousands in the Indian system", () => {
    expect(formatRupees(10000000)).toBe("₹1,00,000");
  });

  it("handles zero", () => {
    expect(formatRupees(0)).toBe("₹0");
  });
});

describe("formatRupeesCompact", () => {
  it("abbreviates lakhs and thousands", () => {
    expect(formatRupeesCompact(15000000)).toBe("₹1.5L");
    expect(formatRupeesCompact(500000)).toBe("₹5.0K");
    expect(formatRupeesCompact(45000)).toBe("₹450.00");
  });
});

describe("toIsoDate / addDays", () => {
  it("formats local date components, not UTC", () => {
    // A fixed local date — months are 0-indexed in the Date constructor.
    const d = new Date(2026, 5, 18); // 18 Jun 2026, local
    expect(toIsoDate(d)).toBe("2026-06-18");
  });

  it("rolls across month and year boundaries", () => {
    expect(toIsoDate(addDays(new Date(2026, 11, 31), 1))).toBe("2027-01-01");
    expect(toIsoDate(addDays(new Date(2026, 5, 1), -1))).toBe("2026-05-31");
  });
});

describe("isIsoDate", () => {
  it("accepts yyyy-mm-dd and rejects anything else", () => {
    expect(isIsoDate("2026-06-18")).toBe(true);
    expect(isIsoDate("18-06-2026")).toBe(false);
    expect(isIsoDate("2026/06/18")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });
});

describe("monthLabel", () => {
  it("renders a long month + year from an ISO date", () => {
    expect(monthLabel("2026-06-18")).toBe("June 2026");
  });
});
