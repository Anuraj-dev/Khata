import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { formatRupees, todayIso } from "../lib/dates";
import { CategoryPicker } from "./CategoryPicker";
import type { ExpenseCategory, ExpenseDirection } from "../lib/expenseStorage";

export type SmsQueueItem = {
  _id: Id<"smsReviewQueue">;
  rawSms: string;
  parsedAmount?: number;
  parsedParty?: string;
  parsedDirection?: "debit" | "credit";
  parsedUpiRef?: string;
  parsedDate?: string;
  createdAt: number;
};

// Messages land in this queue precisely because the parser COULDN'T pull a
// confident amount/direction — so the card must let the user complete those by
// hand. It's a full editable form (amount, direction, category, note, date)
// pre-filled with whatever parsed; nothing is gated on a successful parse.
export function SmsApprovalCard({ item }: { item: SmsQueueItem }) {
  const [amountRupees, setAmountRupees] = useState(
    item.parsedAmount != null ? String(item.parsedAmount / 100) : ""
  );
  const [direction, setDirection] = useState<ExpenseDirection>(
    item.parsedDirection ?? "debit"
  );
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [note, setNote] = useState(item.parsedParty ?? "");
  const [date, setDate] = useState(item.parsedDate ?? todayIso());
  const [rawExpanded, setRawExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  const approve = useMutation(api.smsQueue.approve);
  const reject = useMutation(api.smsQueue.reject);

  const paise = Math.round((parseFloat(amountRupees) || 0) * 100);
  const canSave = paise > 0 && !busy;
  const amountColor = direction === "debit" ? "var(--color-debit)" : "var(--color-credit)";

  async function handleSave() {
    if (!canSave) return;
    setBusy(true);
    try {
      await approve({
        queueId: item._id,
        amount: paise,
        note: note.trim() || item.parsedParty || (direction === "debit" ? "UPI payment" : "UPI credit"),
        category,
        direction,
        date,
        party: item.parsedParty,
        upiRef: item.parsedUpiRef,
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    setBusy(true);
    try {
      await reject({ queueId: item._id });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="mx-4 my-2 rounded-2xl overflow-hidden"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-subtle)" }}
    >
      {/* Header — live summary of what will be saved */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-base"
          style={{ background: amountColor + "22", color: amountColor }}
        >
          {direction === "debit" ? "↑" : "↓"}
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
            {item.parsedParty ?? (direction === "debit" ? "Payment" : "Credit")}
          </span>
          {item.parsedUpiRef && (
            <span
              className="text-xs truncate"
              style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
            >
              Ref {item.parsedUpiRef}
            </span>
          )}
        </div>
        {paise > 0 && (
          <span
            className="text-base font-semibold shrink-0 tabular-nums"
            style={{ color: amountColor, fontFamily: "var(--font-mono)" }}
          >
            {direction === "debit" ? "−" : "+"}{formatRupees(paise)}
          </span>
        )}
      </div>

      {/* Raw SMS toggle */}
      <button
        onClick={() => setRawExpanded((v) => !v)}
        className="w-full px-4 pb-1 text-left"
        style={{ background: "none", border: "none", cursor: "pointer" }}
      >
        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {rawExpanded ? "▲ Hide SMS" : "▼ Show SMS"}
        </span>
      </button>
      {rawExpanded && (
        <div
          className="mx-4 mb-3 px-3 py-2 rounded-lg text-xs leading-relaxed"
          style={{
            background: "var(--color-bg)",
            color: "var(--color-text-secondary)",
            fontFamily: "var(--font-mono)",
            wordBreak: "break-word",
          }}
        >
          {item.rawSms}
        </div>
      )}

      {/* Editable form — always available so an unparsed SMS can be completed */}
      <div className="px-4 pb-3 pt-1 flex flex-col gap-3" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
        {/* Direction toggle */}
        <div className="flex gap-2">
          {(["debit", "credit"] as const).map((dir) => {
            const active = direction === dir;
            const color = dir === "debit" ? "var(--color-debit)" : "var(--color-credit)";
            return (
              <button
                key={dir}
                type="button"
                onClick={() => setDirection(dir)}
                className="flex-1 py-2 rounded-xl text-sm font-medium"
                style={{
                  background: active ? color + "22" : "var(--color-bg)",
                  color: active ? color : "var(--color-text-secondary)",
                  border: `1px solid ${active ? color : "var(--color-border-subtle)"}`,
                  cursor: "pointer",
                }}
              >
                {dir === "debit" ? "Spent" : "Received"}
              </button>
            );
          })}
        </div>

        {/* Amount + date */}
        <div className="flex gap-2">
          <div
            className="flex items-center flex-1 px-3 rounded-xl"
            style={{ background: "var(--color-bg)", border: "1px solid var(--color-border-default)" }}
          >
            <span className="text-sm" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>₹</span>
            <input
              inputMode="decimal"
              aria-label="Amount"
              className="w-full px-2 py-2 text-sm bg-transparent outline-none"
              style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}
              placeholder="0"
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value.replace(/[^0-9.]/g, ""))}
            />
          </div>
          <input
            type="date"
            aria-label="Date"
            value={date}
            max={todayIso()}
            onChange={(e) => setDate(e.target.value || todayIso())}
            className="shrink-0 px-3 py-2 rounded-xl text-sm outline-none"
            style={{
              background: "var(--color-bg)",
              border: "1px solid var(--color-border-default)",
              color: "var(--color-text-secondary)",
              fontFamily: "var(--font-mono)",
            }}
          />
        </div>

        <CategoryPicker value={category} onChange={setCategory} />

        <input
          className="w-full px-3 py-2 rounded-xl text-sm"
          style={{
            background: "var(--color-bg)",
            border: "1px solid var(--color-border-default)",
            color: "var(--color-text-primary)",
            outline: "none",
          }}
          placeholder="Note (e.g. Groceries)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity"
            style={{
              background: "var(--color-accent)",
              color: "#000",
              opacity: canSave ? 1 : 0.4,
              border: "none",
              cursor: canSave ? "pointer" : "not-allowed",
            }}
          >
            {busy ? "Saving…" : "Save expense"}
          </button>
          <button
            onClick={handleReject}
            disabled={busy}
            className="px-4 py-2.5 rounded-xl text-sm font-medium transition-opacity"
            style={{
              background: "var(--color-surface-elevated)",
              color: "var(--color-text-muted)",
              border: "1px solid var(--color-border-subtle)",
              opacity: busy ? 0.5 : 1,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
