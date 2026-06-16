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

// Marks an expense tagged as udhaar (money lent/borrowed with a person).
function UdhaarTag({ person }: { person: string }) {
  return (
    <span
      className="shrink-0 rounded px-1.5 py-px text-[9px] font-bold tracking-wide truncate max-w-24"
      style={{ background: "var(--color-credit)" + "1a", color: "var(--color-credit)" }}
    >
      🤝 {person}
    </span>
  );
}

type CategoryMeta = { emoji: string; color: string; label: string };

type Props = {
  expense: LocalExpense;
  // Resolved category look. Optional so the card still renders standalone; falls
  // back to the built-in/generic resolution when omitted.
  meta?: CategoryMeta;
  // Tap action (e.g. open the udhaar tag sheet). Card stays a plain row when omitted.
  onPress?: () => void;
  onLongPress?: () => void;
};

export function ExpenseCard({ expense, meta, onPress }: Props) {
  const isDebit = expense.direction === "debit";
  const amountColor = isDebit ? "var(--color-debit)" : "var(--color-credit)";
  const amountPrefix = isDebit ? "−" : "+";
  const cat = meta ?? resolveCategory(expense.category, []);
  const catColor = cat.color;
  const icon = cat.emoji;

  // Phone-only counterparty (no name parsed): show the formatted number rather
  // than a generic "Bank transaction", and hint that a tap can name it.
  const phone =
    !expense.party && expense.counterpartyHandle && /^\d{10}$/.test(expense.counterpartyHandle)
      ? `${expense.counterpartyHandle.slice(0, 5)} ${expense.counterpartyHandle.slice(5)}`
      : null;
  const title = expense.party || phone || expense.note || cat.label;

  const timeStr = new Date(expense.createdAt).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const Tag = onPress ? "button" : "div";

  return (
    <Tag
      onClick={onPress}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:[background:var(--color-surface-elevated)]"
      style={{
        background: "transparent",
        border: "none",
        borderBottom: "1px solid var(--color-border-subtle)",
        transitionDuration: "var(--dur-fast)",
        cursor: onPress ? "pointer" : undefined,
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
            style={{ color: phone ? "var(--color-text-secondary)" : "var(--color-text-primary)" }}
          >
            {title}
          </span>
          {expense.source === "sms" && <UpiTag />}
          {expense.udhaarPerson && <UdhaarTag person={expense.udhaarPerson} />}
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
    </Tag>
  );
}
