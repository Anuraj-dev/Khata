import { formatRupees } from "../lib/dates";

type Props = {
  label: string;
  // Net for the day (received − spent). Shown on past days only — Today's numbers
  // already live in the top summary bar, and today is still in flux.
  net?: number;
  showNet?: boolean;
};

// The day label (e.g. "Today") plus, for past days, the day's net so you can scan
// "was yesterday up or down?" without summing the rows yourself.
export function DaySectionHeader({ label, net = 0, showNet = false }: Props) {
  const up = net >= 0;
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
      {showNet && net !== 0 && (
        <span
          className="text-xs tabular-nums font-medium"
          style={{
            color: up ? "var(--color-credit)" : "var(--color-debit)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {up ? "+" : "−"}{formatRupees(Math.abs(net))}
        </span>
      )}
    </div>
  );
}
