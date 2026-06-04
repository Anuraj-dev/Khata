import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id, Doc } from "@convex/_generated/dataModel";
import { formatRupees } from "../lib/dates";
import { computeBalances, applyPayments, simplifyDebts } from "../lib/tripBalances";
import { AddTripExpenseDrawer } from "../components/AddTripExpenseDrawer";

export function TripDetailScreen() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const id = tripId as Id<"trips">;

  const trip = useQuery(api.trips.getTrip, { tripId: id });
  const expenses = useQuery(api.trips.listTripExpenses, { tripId: id });
  const payments = useQuery(api.settlements.listByTrip, { tripId: id });
  const recordPayment = useMutation(api.settlements.recordPayment);
  const deletePayment = useMutation(api.settlements.deletePayment);
  const settleTrip = useMutation(api.trips.settleTrip);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Doc<"tripExpenses"> | null>(null);
  const [busy, setBusy] = useState(false);

  if (trip === undefined || expenses === undefined || payments === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ color: "var(--color-text-muted)" }}>
        <span className="text-sm">Loading…</span>
      </div>
    );
  }
  if (trip === null) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-3" style={{ color: "var(--color-text-secondary)" }}>
        <p className="text-sm">Trip not found.</p>
        <button onClick={() => navigate("/trips")} className="text-sm" style={{ color: "var(--color-accent)" }}>
          ← Back to trips
        </button>
      </div>
    );
  }

  const isSettled = trip.status === "settled";
  const rawNet = computeBalances(trip.members, expenses);
  const net = applyPayments(rawNet, payments);
  const transfers = simplifyDebts(net);
  const allCleared = expenses.length > 0 && transfers.length === 0;
  // Can only close once nobody owes anyone (every suggested transfer ticked paid).
  const canClose = transfers.length === 0;

  function openAdd() {
    setEditing(null);
    setDrawerOpen(true);
  }
  function openEdit(e: Doc<"tripExpenses">) {
    if (isSettled) return;
    setEditing(e);
    setDrawerOpen(true);
  }

  async function markPaid(from: string, to: string, amount: number) {
    if (busy) return;
    setBusy(true);
    try {
      await recordPayment({ tripId: id, fromMember: from, toMember: to, amount });
    } finally {
      setBusy(false);
    }
  }

  async function undoPayment(settlementId: Id<"settlements">) {
    if (busy) return;
    setBusy(true);
    try {
      await deletePayment({ settlementId });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto pb-28">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <button onClick={() => navigate("/trips")} aria-label="Back" className="text-xl pr-1" style={{ background: "none", border: "none", color: "var(--color-text-secondary)" }}>
          ‹
        </button>
        <div className="flex flex-col flex-1 min-w-0">
          <h2 className="text-base font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
            {trip.name}
          </h2>
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {trip.members.join(", ")}
          </span>
        </div>
        {isSettled && (
          <span className="text-xs rounded-full px-2 py-0.5" style={{ background: "var(--color-success-dim)", color: "var(--color-success)" }}>
            Settled
          </span>
        )}
      </div>

      {/* Balances */}
      <Section title="Balances">
        {trip.members.map((m) => {
          const bal = net[m] ?? 0;
          const settled = Math.abs(bal) < 100;
          const color = settled ? "var(--color-text-muted)" : bal > 0 ? "var(--color-credit)" : "var(--color-debit)";
          const label = settled ? "settled up" : bal > 0 ? `gets back ${formatRupees(bal)}` : `owes ${formatRupees(-bal)}`;
          return (
            <div key={m} className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
              <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>{m}</span>
              <span className="text-sm tabular-nums" style={{ color, fontFamily: "var(--font-mono)" }}>{label}</span>
            </div>
          );
        })}
      </Section>

      {/* Settle up — remaining transfers, each tickable */}
      {transfers.length > 0 && (
        <Section title="Settle up">
          {transfers.map((t, i) => (
            <div key={i} className="flex items-center justify-between gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
              <span className="text-sm flex-1 min-w-0" style={{ color: "var(--color-text-secondary)" }}>
                <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{t.from}</span> pays{" "}
                <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{t.to}</span>
              </span>
              <span className="text-sm tabular-nums shrink-0" style={{ color: "var(--color-accent)", fontFamily: "var(--font-mono)" }}>
                {formatRupees(t.amount)}
              </span>
              {!isSettled && (
                <button
                  onClick={() => void markPaid(t.from, t.to, t.amount)}
                  disabled={busy}
                  className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-opacity disabled:opacity-50"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-credit)", color: "var(--color-credit)" }}
                >
                  Mark paid
                </button>
              )}
            </div>
          ))}
        </Section>
      )}

      {allCleared && (
        <div className="mx-4 mt-4 rounded-xl px-4 py-3 text-sm text-center" style={{ background: "var(--color-success-dim)", color: "var(--color-success)" }}>
          🎉 All settled up!
        </div>
      )}

      {/* Recorded payments */}
      {payments.length > 0 && (
        <Section title="Paid">
          {payments.map((p) => (
            <div key={p._id} className="flex items-center justify-between gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
              <span className="text-sm flex-1 min-w-0" style={{ color: "var(--color-text-muted)", textDecoration: "line-through" }}>
                <span style={{ fontWeight: 500 }}>{p.fromMember}</span> paid <span style={{ fontWeight: 500 }}>{p.toMember}</span>
              </span>
              <span className="text-sm tabular-nums shrink-0" style={{ color: "var(--color-credit)", fontFamily: "var(--font-mono)" }}>
                ✓ {formatRupees(p.amount)}
              </span>
              {!isSettled && (
                <button
                  onClick={() => void undoPayment(p._id)}
                  disabled={busy}
                  aria-label="Undo payment"
                  className="shrink-0 px-2 text-sm disabled:opacity-50"
                  style={{ background: "none", border: "none", color: "var(--color-text-muted)" }}
                >
                  undo
                </button>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* Expenses */}
      <Section title={`Expenses (${expenses.length})`}>
        {expenses.length === 0 ? (
          <p className="px-4 py-3 text-sm" style={{ color: "var(--color-text-muted)" }}>No expenses yet.</p>
        ) : (
          expenses.map((e: Doc<"tripExpenses">) => (
            <button
              key={e._id}
              onClick={() => openEdit(e)}
              disabled={isSettled}
              className="flex w-full items-center gap-3 px-4 py-3 text-left active:opacity-70 transition-opacity disabled:active:opacity-100"
              style={{ borderBottom: "1px solid var(--color-border-subtle)", background: "none" }}
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 text-base" style={{ background: "var(--color-surface)" }}>
                {e.emoji || "🧾"}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{e.note}</span>
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {e.paidBy} paid · {e.splitMode === "custom" ? "custom split" : `split ${e.splitAmong.length}`}
                </span>
              </div>
              <span className="text-sm tabular-nums shrink-0" style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}>
                {formatRupees(e.amount)}
              </span>
            </button>
          ))
        )}
      </Section>

      {/* Actions */}
      {!isSettled && (
        <div className="flex flex-col gap-2 px-4 mt-5">
          <button
            onClick={openAdd}
            className="w-full rounded-xl text-base font-bold"
            style={{ height: 52, background: "var(--color-accent)", color: "var(--color-bg)" }}
          >
            + Add shared expense
          </button>
          <button
            onClick={() => canClose && void settleTrip({ tripId: id })}
            disabled={!canClose}
            className="w-full rounded-xl text-sm font-semibold transition-opacity"
            style={{
              height: 46,
              background: "var(--color-surface)",
              border: `1px solid ${canClose ? "var(--color-border-default)" : "var(--color-border-subtle)"}`,
              color: canClose ? "var(--color-text-primary)" : "var(--color-text-muted)",
              opacity: canClose ? 1 : 0.6,
            }}
          >
            Mark settled & close
          </button>
          {!canClose && (
            <p className="text-xs text-center" style={{ color: "var(--color-text-muted)" }}>
              Tick everyone as paid in “Settle up” before closing.
            </p>
          )}
        </div>
      )}

      <AddTripExpenseDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
        tripId={id}
        members={trip.members}
        editing={editing}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
        {title}
      </p>
      <div style={{ borderTop: "1px solid var(--color-border-subtle)" }}>{children}</div>
    </div>
  );
}
