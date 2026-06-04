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
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-text-muted)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M12 12v3" />
        </svg>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
          Trips
        </span>
      </div>
      <div
        className="overflow-hidden"
        style={{
          border: "1px solid var(--color-border-subtle)",
          borderRadius: "var(--radius-lg)",
          background: "var(--gradient-surface)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {rows.map((b, i) => {
          const owed = b.net > 0;
          const color = owed ? "var(--color-credit)" : "var(--color-debit)";
          return (
            <button
              key={b.tripId}
              onClick={() => navigate(`/trips/${b.tripId}`)}
              className="flex min-h-[44px] w-full items-center justify-between gap-2 px-3.5 py-3 text-left transition-colors active:[background:var(--color-surface-elevated)]"
              style={{
                background: "transparent",
                borderTop: i === 0 ? "none" : "1px solid var(--color-border-subtle)",
                transitionDuration: "var(--dur-fast)",
                cursor: "pointer",
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
