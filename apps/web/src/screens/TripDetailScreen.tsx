import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id, Doc } from "@convex/_generated/dataModel";
import { formatRupees } from "../lib/dates";
import { computeBalances, simplifyDebts } from "../lib/tripBalances";
import { AddTripExpenseDrawer } from "../components/AddTripExpenseDrawer";

export function TripDetailScreen() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const id = tripId as Id<"trips">;

  const trip = useQuery(api.trips.getTrip, { tripId: id });
  const expenses = useQuery(api.trips.listTripExpenses, { tripId: id });
  const savedSettlements = useQuery(api.settlements.listByTrip, { tripId: id });
  const saveSettlements = useMutation(api.settlements.saveSettlements);
  const settleTrip = useMutation(api.trips.settleTrip);

  const [addOpen, setAddOpen] = useState(false);
  const [settling, setSettling] = useState(false);

  if (trip === undefined || expenses === undefined) {
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
  const balances = computeBalances(trip.members, expenses);
  const transfers = isSettled
    ? (savedSettlements ?? []).map((s) => ({ from: s.fromMember, to: s.toMember, amount: s.amount }))
    : simplifyDebts(balances);

  async function handleSettle() {
    if (settling) return;
    setSettling(true);
    try {
      await saveSettlements({
        tripId: id,
        settlements: simplifyDebts(balances).map((t) => ({
          fromMember: t.from,
          toMember: t.to,
          amount: t.amount,
        })),
      });
      await settleTrip({ tripId: id });
    } finally {
      setSettling(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-y-auto pb-28">
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
          const net = balances[m] ?? 0;
          const settled = Math.abs(net) < 100;
          const color = settled ? "var(--color-text-muted)" : net > 0 ? "var(--color-credit)" : "var(--color-debit)";
          const label = settled ? "settled up" : net > 0 ? `gets back ${formatRupees(net)}` : `owes ${formatRupees(-net)}`;
          return (
            <div key={m} className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
              <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>{m}</span>
              <span className="text-sm tabular-nums" style={{ color, fontFamily: "var(--font-mono)" }}>{label}</span>
            </div>
          );
        })}
      </Section>

      {/* Settle up */}
      {transfers.length > 0 && (
        <Section title={isSettled ? "Final settlement" : "Settle up"}>
          {transfers.map((t, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
              <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{t.from}</span> pays{" "}
                <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{t.to}</span>
              </span>
              <span className="text-sm tabular-nums" style={{ color: "var(--color-accent)", fontFamily: "var(--font-mono)" }}>
                {formatRupees(t.amount)}
              </span>
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
            <div key={e._id} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{e.note}</span>
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {e.paidBy} paid · split {e.splitAmong.length}
                </span>
              </div>
              <span className="text-sm tabular-nums shrink-0" style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}>
                {formatRupees(e.amount)}
              </span>
            </div>
          ))
        )}
      </Section>

      {/* Actions */}
      {!isSettled && (
        <div className="flex flex-col gap-2 px-4 mt-5">
          <button
            onClick={() => setAddOpen(true)}
            className="w-full rounded-xl text-base font-bold"
            style={{ height: 52, background: "var(--color-accent)", color: "var(--color-bg)" }}
          >
            + Add shared expense
          </button>
          {transfers.length > 0 && (
            <button
              onClick={() => void handleSettle()}
              disabled={settling}
              className="w-full rounded-xl text-sm font-semibold transition-opacity disabled:opacity-60"
              style={{ height: 46, background: "var(--color-surface)", border: "1px solid var(--color-border-default)", color: "var(--color-text-primary)" }}
            >
              {settling ? "Settling…" : "Mark as settled & close"}
            </button>
          )}
        </div>
      )}

      <AddTripExpenseDrawer open={addOpen} onClose={() => setAddOpen(false)} tripId={id} members={trip.members} />
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
