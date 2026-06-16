import { useRecurring } from "../hooks/useRecurring";
import { formatRupees } from "../lib/dates";

function dueLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// Home-screen radar: confirmed bills due this month + one-tap "track this?"
// suggestions detected from the spend history. Renders nothing when both empty.
export function RecurringCard({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { candidates, upcoming, confirm, dismiss } = useRecurring(isAuthenticated);
  const dueSoon = upcoming.filter((u) => !u.seenThisMonth);

  if (candidates.length === 0 && dueSoon.length === 0) return null;

  return (
    <div
      className="mx-4 mt-3 flex flex-col gap-3 px-4 py-3"
      style={{
        background: "var(--gradient-surface)",
        border: "1px solid var(--color-border-subtle)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {dueSoon.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
            Upcoming bills
          </h4>
          {dueSoon.slice(0, 3).map((u) => (
            <div key={u.ruleId} className="flex items-center justify-between text-sm">
              <span style={{ color: "var(--color-text-secondary)" }}>📅 {u.label}</span>
              <span className="tabular-nums" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>
                ~{formatRupees(u.typicalAmount)} · {dueLabel(u.dueDate)}
              </span>
            </div>
          ))}
        </div>
      )}

      {candidates.slice(0, 2).map((c) => (
        <div key={c.key} className="flex flex-col gap-1.5">
          <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>
            Looks recurring: <b>{c.label}</b> · ~{formatRupees(c.typicalAmount)}/mo
          </span>
          <div className="flex gap-2">
            <button
              onClick={() =>
                void confirm({ key: c.key, label: c.label, typicalAmount: c.typicalAmount, dayOfMonth: c.dayOfMonth })
              }
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: "var(--color-accent-subtle)", color: "var(--color-accent)", border: "none", cursor: "pointer" }}
            >
              Track it
            </button>
            <button
              onClick={() => void dismiss({ key: c.key, label: c.label })}
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{ background: "var(--color-surface)", color: "var(--color-text-muted)", border: "1px solid var(--color-border-subtle)", cursor: "pointer" }}
            >
              Not a bill
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
