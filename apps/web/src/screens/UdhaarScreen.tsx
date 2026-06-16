import { useState } from "react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { api } from "@convex/_generated/api";
import { formatRupees } from "../lib/dates";
import { AddUdhaarSheet } from "../components/AddUdhaarSheet";
import { MergeContactsSheet } from "../components/MergeContactsSheet";
import { PlusIcon } from "../components/icons";

// The khata itself: who owes you, whom you owe. Balances derive entirely from
// udhaar-tagged expenses — there is no separate book to keep in sync.
export function UdhaarScreen() {
  const navigate = useNavigate();
  const balances = useQuery(api.udhaar.balances);
  const [addOpen, setAddOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [toast, setToast] = useState<{ kind: "error" | "info"; message: string } | null>(null);

  const showToast = (t: { kind: "error" | "info"; message: string }) => {
    setToast(t);
    setTimeout(() => setToast(null), 3000);
  };

  const all = balances ?? [];
  const active = all.filter((b) => Math.abs(b.net) >= 100);
  const settled = all.filter((b) => Math.abs(b.net) < 100);
  const isEmpty = balances && all.length === 0;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto pb-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
            Udhaar
          </h2>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Tag an expense on home, or add cash udhaar here.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {all.length >= 2 && (
            <button
              type="button"
              onClick={() => setMergeOpen(true)}
              className="rounded-full px-3 py-1.5 text-xs font-medium"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border-subtle)",
                color: "var(--color-text-secondary)",
              }}
            >
              Merge
            </button>
          )}
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ background: "var(--color-accent-subtle)", color: "var(--color-accent)" }}
          >
            <PlusIcon size={14} /> Add
          </button>
        </div>
      </div>

      {isEmpty && (
        <div className="flex flex-col flex-1 min-h-0 items-center justify-center gap-3 px-8 text-center">
          <span className="text-4xl">🤝</span>
          <p className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
            No udhaar yet
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Lent a friend money, or borrowed some? Tap any expense on the home
            screen and mark it udhaar — or tap <b>Add</b> for offline cash.
          </p>
        </div>
      )}

      {active.map((b) => {
        const owed = b.net > 0;
        return (
          <button
            key={b.person}
            onClick={() => navigate(`/udhaar/${encodeURIComponent(b.person)}`)}
            className="flex min-h-[56px] w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors active:[background:var(--color-surface-elevated)]"
            style={{
              background: "transparent",
              border: "none",
              borderBottom: "1px solid var(--color-border-subtle)",
              cursor: "pointer",
              transitionDuration: "var(--dur-fast)",
            }}
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                {b.person}
              </span>
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {owed ? "owes you" : "you owe"} · {b.count} entr{b.count === 1 ? "y" : "ies"}
              </span>
            </div>
            <span
              className="text-base shrink-0 tabular-nums font-medium"
              style={{
                color: owed ? "var(--color-credit)" : "var(--color-debit)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {owed ? "+" : "−"}{formatRupees(Math.abs(b.net))}
            </span>
          </button>
        );
      })}

      {settled.length > 0 && (
        <>
          <p
            className="px-4 pt-5 pb-1.5 text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-muted)" }}
          >
            Settled
          </p>
          {settled.map((b) => (
            <button
              key={b.person}
              onClick={() => navigate(`/udhaar/${encodeURIComponent(b.person)}`)}
              className="flex min-h-[44px] w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors active:[background:var(--color-surface-elevated)]"
              style={{
                background: "transparent",
                border: "none",
                borderBottom: "1px solid var(--color-border-subtle)",
                cursor: "pointer",
                transitionDuration: "var(--dur-fast)",
              }}
            >
              <span className="text-sm truncate" style={{ color: "var(--color-text-secondary)" }}>
                {b.person}
              </span>
              <span className="text-xs shrink-0" style={{ color: "var(--color-credit)" }}>
                settled ✓
              </span>
            </button>
          ))}
        </>
      )}

      <AddUdhaarSheet open={addOpen} onClose={() => setAddOpen(false)} showToast={showToast} />
      <MergeContactsSheet open={mergeOpen} onClose={() => setMergeOpen(false)} showToast={showToast} />

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
