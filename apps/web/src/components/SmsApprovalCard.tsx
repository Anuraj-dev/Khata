import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { formatRupees, todayIso } from "../lib/dates";
import { CategoryPicker } from "./CategoryPicker";
import type { ExpenseCategory } from "../lib/expenseStorage";

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

export function SmsApprovalCard({ item }: { item: SmsQueueItem }) {
  const [approving, setApproving] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [note, setNote] = useState(item.parsedParty ?? "");
  const [rawExpanded, setRawExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  const approve = useMutation(api.smsQueue.approve);
  const reject = useMutation(api.smsQueue.reject);

  const isDebit = item.parsedDirection !== "credit";
  const amountColor = isDebit ? "var(--color-debit)" : "var(--color-credit)";
  const amountPrefix = isDebit ? "−" : "+";

  async function handleApprove() {
    if (!item.parsedAmount || !item.parsedDirection) return;
    setBusy(true);
    try {
      await approve({
        queueId: item._id,
        amount: item.parsedAmount,
        note: note.trim() || item.parsedParty || "UPI",
        category,
        direction: item.parsedDirection,
        date: item.parsedDate ?? todayIso(),
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
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        {/* Direction badge */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-base"
          style={{ background: amountColor + "22", color: amountColor }}
        >
          {isDebit ? "↑" : "↓"}
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <span
            className="text-sm font-medium truncate"
            style={{ color: "var(--color-text-primary)" }}
          >
            {item.parsedParty ?? (isDebit ? "Payment" : "Credit")}
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

        {item.parsedAmount != null && (
          <span
            className="text-base font-semibold shrink-0 tabular-nums"
            style={{ color: amountColor, fontFamily: "var(--font-mono)" }}
          >
            {amountPrefix}{formatRupees(item.parsedAmount)}
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

      {/* Approve form */}
      {approving && (
        <div
          className="px-4 pb-3 pt-1 flex flex-col gap-3"
          style={{ borderTop: "1px solid var(--color-border-subtle)" }}
        >
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
              onClick={handleApprove}
              disabled={busy || !item.parsedAmount}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity"
              style={{
                background: "var(--color-accent)",
                color: "#000",
                opacity: busy ? 0.5 : 1,
                border: "none",
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              {busy ? "Saving…" : "Save expense"}
            </button>
            <button
              onClick={() => setApproving(false)}
              disabled={busy}
              className="px-4 py-2.5 rounded-xl text-sm font-medium"
              style={{
                background: "var(--color-surface-elevated)",
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border-subtle)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action row */}
      {!approving && (
        <div
          className="flex gap-2 px-4 pb-4 pt-2"
          style={{ borderTop: "1px solid var(--color-border-subtle)" }}
        >
          <button
            onClick={() => setApproving(true)}
            disabled={busy || !item.parsedAmount}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity"
            style={{
              background: "var(--color-accent)",
              color: "#000",
              opacity: busy || !item.parsedAmount ? 0.4 : 1,
              border: "none",
              cursor: busy || !item.parsedAmount ? "not-allowed" : "pointer",
            }}
          >
            Add as expense
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
      )}
    </div>
  );
}
