import { formatRupees, monthLabel } from "../lib/dates";

type Props = {
  isoDate: string; // any date within the month (YYYY-MM-DD)
  totalDebit: number;
  totalCredit: number;
};

// Sticky-feeling separator shown when the list crosses into a new month, so a
// year of history stays scannable instead of an endless flat day list.
export function MonthDivider({ isoDate, totalDebit, totalCredit }: Props) {
  return (
    <div
      className="flex items-baseline justify-between px-4 pt-6 pb-2"
      style={{ background: "var(--color-bg)" }}
    >
      <span
        className="text-sm font-bold tracking-tight"
        style={{ color: "var(--color-text-primary)" }}
      >
        {monthLabel(isoDate)}
      </span>
      <div className="flex gap-3 tabular-nums">
        {totalCredit > 0 && (
          <span className="text-xs" style={{ color: "var(--color-credit)", fontFamily: "var(--font-mono)" }}>
            +{formatRupees(totalCredit)}
          </span>
        )}
        {totalDebit > 0 && (
          <span className="text-xs" style={{ color: "var(--color-debit)", fontFamily: "var(--font-mono)" }}>
            −{formatRupees(totalDebit)}
          </span>
        )}
      </div>
    </div>
  );
}
