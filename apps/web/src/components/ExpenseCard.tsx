import { formatRupees } from "../lib/dates";
import type { LocalExpense } from "../lib/expenseStorage";
import { resolveCategory } from "../lib/categories";

// Marks an entry that was captured automatically from a bank/UPI alert.
function UpiTag() {
  return (
    <span
      className="shrink-0 rounded px-1.5 py-px text-[9px] font-bold uppercase tracking-wide"
      style={{ background: "var(--color-accent-subtle)", color: "var(--color-accent)" }}
    >
      UPI
    </span>
  );
}

type CategoryMeta = { emoji: string; color: string; label: string };

type Props = {
  expense: LocalExpense;
  // Resolved category look. Optional so the card still renders standalone; falls
  // back to the built-in/generic resolution when omitted.
  meta?: CategoryMeta;
  onLongPress?: () => void;
};

export function ExpenseCard({ expense, meta }: Props) {
  const isDebit = expense.direction === "debit";
  const amountColor = isDebit ? "var(--color-debit)" : "var(--color-credit)";
  const amountPrefix = isDebit ? "−" : "+";
  const cat = meta ?? resolveCategory(expense.category, []);
  const catColor = cat.color;
  const icon = cat.emoji;

  const timeStr = new Date(expense.createdAt).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 transition-colors active:[background:var(--color-surface-elevated)]"
      style={{
        borderBottom: "1px solid var(--color-border-subtle)",
        transitionDuration: "var(--dur-fast)",
      }}
    >
      {/* Category dot */}
      <div
        className="flex items-center justify-center w-10 h-10 rounded-full shrink-0 text-lg"
        style={{ background: catColor + "22", color: catColor, boxShadow: `inset 0 0 0 1px ${catColor}33` }}
      >
        {icon}
      </div>

      {/* Note + meta */}
      <div className="flex flex-col flex-1 min-w-0 gap-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="text-sm font-medium truncate"
            style={{ color: "var(--color-text-primary)" }}
          >
            {expense.note || cat.label}
          </span>
          {expense.source === "sms" && <UpiTag />}
        </div>
        <span
          className="text-xs truncate"
          style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
        >
          {timeStr}
        </span>
      </div>

      {/* Amount */}
      <span
        className="text-sm shrink-0 tabular-nums"
        style={{ color: amountColor, fontFamily: "var(--font-mono)", fontWeight: 500 }}
      >
        {amountPrefix}{formatRupees(expense.amount)}
      </span>
    </div>
  );
}
