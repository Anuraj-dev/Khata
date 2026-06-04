import { formatRupees, monthLabel } from "../lib/dates";

type Props = {
  isoDate: string; // any date within the month (YYYY-MM-DD)
  totalDebit: number;
  totalCredit: number;
};

// Sticky-feeling separator shown when the list crosses into a new month, so a
// year of history stays scannable instead of an endless flat day list. Shows
// the month's net only (received − spent) — green when up, red when down.
export function MonthDivider({ isoDate, totalDebit, totalCredit }: Props) {
  const net = totalCredit - totalDebit;
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
      {net !== 0 && (
        <span
          className="text-xs tabular-nums"
          style={{ color: net > 0 ? "var(--color-credit)" : "var(--color-debit)", fontFamily: "var(--font-mono)" }}
        >
          {net > 0 ? "+" : "−"}{formatRupees(Math.abs(net))}
        </span>
      )}
    </div>
  );
}
