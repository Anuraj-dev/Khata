import { formatRupees } from "../lib/dates";
import type { LocalExpense, ExpenseCategory } from "../lib/expenseStorage";

const CATEGORY_ICON: Record<ExpenseCategory, string> = {
  food: "🍜",
  travel: "✈️",
  shopping: "🛍️",
  bills: "🧾",
  health: "💊",
  other: "·",
};

const CATEGORY_COLOR: Record<ExpenseCategory, string> = {
  food: "var(--color-food)",
  travel: "var(--color-travel)",
  shopping: "var(--color-shopping)",
  bills: "var(--color-bills)",
  health: "var(--color-health)",
  other: "var(--color-other)",
};

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

type Props = {
  expense: LocalExpense;
  onLongPress?: () => void;
};

export function ExpenseCard({ expense }: Props) {
  const isDebit = expense.direction === "debit";
  const amountColor = isDebit ? "var(--color-debit)" : "var(--color-credit)";
  const amountPrefix = isDebit ? "−" : "+";
  const catColor = CATEGORY_COLOR[expense.category];
  const icon = CATEGORY_ICON[expense.category];

  const timeStr = new Date(expense.createdAt).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 active:opacity-70 transition-opacity"
      style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
    >
      {/* Category dot */}
      <div
        className="flex items-center justify-center w-10 h-10 rounded-full shrink-0 text-lg"
        style={{ background: catColor + "22", color: catColor }}
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
            {expense.note || expense.category}
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
