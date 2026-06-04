import { useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { api } from "@convex/_generated/api";
import { formatRupees } from "../lib/dates";

// Read-only home-screen card: per active trip, whether "You" are owed money or
// owe it. Derived live from trip balances on the server — it never writes to the
// personal ledger (so UPI/SMS-captured cash is never double-counted).
export function TripsSummary({ isAuthenticated }: { isAuthenticated: boolean }) {
  const navigate = useNavigate();
  const balances = useQuery(api.trips.myTripBalances, isAuthenticated ? {} : "skip");

  // Ignore sub-₹1 rounding dust and fully-settled trips.
  const rows = (balances ?? []).filter((b) => Math.abs(b.net) >= 100);
  if (rows.length === 0) return null;

  return (
    <div className="px-4 pt-3 pb-1">
      <div className="flex items-center gap-1.5 pb-1.5">
        <span className="text-sm">🧳</span>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
          Trips
        </span>
      </div>
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border-subtle)" }}>
        {rows.map((b, i) => {
          const owed = b.net > 0;
          const color = owed ? "var(--color-credit)" : "var(--color-debit)";
          return (
            <button
              key={b.tripId}
              onClick={() => navigate(`/trips/${b.tripId}`)}
              className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left active:opacity-70 transition-opacity"
              style={{
                background: "var(--color-surface)",
                borderTop: i === 0 ? "none" : "1px solid var(--color-border-subtle)",
              }}
            >
              <span className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                {b.name}
              </span>
              <span className="flex items-baseline gap-1.5 shrink-0">
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {owed ? "you're owed" : "you owe"}
                </span>
                <span className="text-sm tabular-nums font-medium" style={{ color, fontFamily: "var(--font-mono)" }}>
                  {formatRupees(Math.abs(b.net))}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
