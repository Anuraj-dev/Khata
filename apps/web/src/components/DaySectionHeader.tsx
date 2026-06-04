import { formatRupees } from "../lib/dates";

type Props = {
  label: string;
  totalDebit: number;
  totalCredit: number;
};

export function DaySectionHeader({ label, totalDebit, totalCredit }: Props) {
  return (
    <div
      className="sticky top-0 z-10 flex items-center justify-between px-4 pt-5 pb-2"
      style={{ background: "var(--color-bg)" }}
    >
      <span
        className="text-xs font-semibold tracking-wide uppercase"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {label}
      </span>
      <div className="flex gap-3">
        {totalCredit > 0 && (
          <span
            className="text-xs tabular-nums"
            style={{ color: "var(--color-credit)", fontFamily: "var(--font-mono)", opacity: 0.8 }}
          >
            +{formatRupees(totalCredit)}
          </span>
        )}
        {totalDebit > 0 && (
          <span
            className="text-xs tabular-nums"
            style={{ color: "var(--color-debit)", fontFamily: "var(--font-mono)", opacity: 0.8 }}
          >
            −{formatRupees(totalDebit)}
          </span>
        )}
      </div>
    </div>
  );
}
