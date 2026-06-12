import { useState } from "react";
import { useQuery } from "convex/react";
import { useNavigate, useParams } from "react-router";
import type { Doc } from "@convex/_generated/dataModel";
import { api } from "@convex/_generated/api";
import { formatRupees } from "../lib/dates";
import type { LocalExpense } from "../lib/expenseStorage";
import { useCategories } from "../hooks/useCategories";
import { ExpenseCard } from "../components/ExpenseCard";
import { RecordRepaymentSheet } from "../components/RecordRepaymentSheet";

function toLocal(e: Doc<"expenses">): LocalExpense {
  return {
    id: e.clientId,
    amount: e.amount,
    note: e.note,
    category: e.category,
    source: e.source,
    direction: e.direction,
    upiRef: e.upiRef,
    party: e.party,
    udhaarPerson: e.udhaarPerson,
    date: e.date,
    createdAt: e.createdAt,
    syncedId: e._id,
  };
}

// History with one person: every expense tagged to them, plus the running net.
export function UdhaarPersonScreen() {
  const navigate = useNavigate();
  const { person: encoded } = useParams<{ person: string }>();
  const person = decodeURIComponent(encoded ?? "");
  const history = useQuery(api.udhaar.personHistory, person ? { person } : "skip");
  const { resolve } = useCategories();
  const [repayOpen, setRepayOpen] = useState(false);
  const [toast, setToast] = useState<{ kind: "error" | "info"; message: string } | null>(null);

  const net = (history ?? []).reduce(
    (sum, e) => sum + (e.direction === "debit" ? e.amount : -e.amount),
    0
  );
  const settled = Math.abs(net) < 100;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Person header */}
      <div
        className="flex items-center gap-2 px-2 py-2 border-b"
        style={{ borderColor: "var(--color-border-subtle)" }}
      >
        <button
          onClick={() => navigate("/udhaar")}
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center"
          style={{ background: "none", border: "none", color: "var(--color-text-secondary)", cursor: "pointer" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
            {person}
          </span>
          <span
            className="text-xs tabular-nums"
            style={{
              color: settled
                ? "var(--color-text-muted)"
                : net > 0
                  ? "var(--color-credit)"
                  : "var(--color-debit)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {settled
              ? "settled ✓"
              : net > 0
                ? `owes you ${formatRupees(net)}`
                : `you owe ${formatRupees(-net)}`}
          </span>
        </div>
        {!settled && (
          <button
            onClick={() => setRepayOpen(true)}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold mr-2 active:opacity-70 transition-opacity"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border-default)",
              color: "var(--color-text-primary)",
            }}
          >
            Record repayment
          </button>
        )}
      </div>

      {/* History */}
      <div
        className="flex-1 min-h-0 overflow-y-auto pb-24"
        style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}
      >
        {(history ?? []).map((e) => (
          <ExpenseCard key={e._id} expense={toLocal(e)} meta={resolve(e.category)} />
        ))}
        {history && history.length === 0 && (
          <p className="px-4 pt-6 text-sm text-center" style={{ color: "var(--color-text-muted)" }}>
            Nothing tagged with {person} yet.
          </p>
        )}
      </div>

      <RecordRepaymentSheet
        person={person}
        net={net}
        open={repayOpen}
        onClose={() => setRepayOpen(false)}
        showToast={(t) => {
          setToast(t);
          setTimeout(() => setToast(null), 3000);
        }}
      />

      {toast && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-sm font-medium z-50 pointer-events-none"
          style={{
            background: toast.kind === "error" ? "var(--color-error)" : "var(--color-surface-elevated)",
            color: toast.kind === "error" ? "#fff" : "var(--color-text-primary)",
            boxShadow: "var(--shadow-elevated)",
            border: "1px solid var(--color-border-subtle)",
            whiteSpace: "nowrap",
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
