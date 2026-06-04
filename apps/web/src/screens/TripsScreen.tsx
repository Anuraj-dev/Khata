import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { CreateTripDrawer } from "../components/CreateTripDrawer";
import { ScanInviteSheet } from "../components/ScanInviteSheet";

export function TripsScreen() {
  const navigate = useNavigate();
  const trips = useQuery(api.trips.listTrips, {});
  const [createOpen, setCreateOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto pb-24">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Trips
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScanOpen(true)}
            className="rounded-xl px-3 py-1.5 text-sm font-semibold"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-default)", color: "var(--color-text-primary)" }}
          >
            Scan
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-xl px-3 py-1.5 text-sm font-semibold"
            style={{ background: "var(--color-accent)", color: "var(--color-bg)" }}
          >
            + New
          </button>
        </div>
      </div>

      {trips === undefined && (
        <div className="flex flex-1 items-center justify-center" style={{ color: "var(--color-text-muted)" }}>
          <span className="text-sm">Loading…</span>
        </div>
      )}

      {trips && trips.length === 0 && (
        <div className="flex flex-col flex-1 items-center justify-center gap-3 px-6 pb-16" style={{ color: "var(--color-text-secondary)" }}>
          <span style={{ fontSize: 40, opacity: 0.4 }}>🧳</span>
          <p className="text-sm text-center">No trips yet. Create one to split shared expenses with friends.</p>
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-xl px-4 py-2 text-sm font-semibold"
            style={{ background: "var(--color-accent)", color: "var(--color-bg)" }}
          >
            Create a trip
          </button>
        </div>
      )}

      {trips && trips.length > 0 && (
        <div className="flex flex-col">
          {trips.map((trip) => (
            <button
              key={trip._id}
              onClick={() => navigate(`/trips/${trip._id}`)}
              className="flex items-center gap-3 px-4 py-3.5 text-left active:opacity-70 transition-opacity"
              style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
            >
              <div
                className="flex items-center justify-center w-10 h-10 rounded-full shrink-0 text-lg"
                style={{ background: "var(--color-accent-subtle)" }}
              >
                🧳
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                  {trip.name}
                </span>
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {trip.members.length} members
                </span>
              </div>
              {trip.role === "viewer" && (
                <span className="text-xs rounded-full px-2 py-0.5" style={{ background: "var(--color-accent-subtle)", color: "var(--color-accent)" }}>
                  Shared
                </span>
              )}
              {trip.status === "settled" ? (
                <span className="text-xs rounded-full px-2 py-0.5" style={{ background: "var(--color-success-dim)", color: "var(--color-success)" }}>
                  Settled
                </span>
              ) : (
                <span style={{ color: "var(--color-text-muted)" }}>›</span>
              )}
            </button>
          ))}
        </div>
      )}

      <CreateTripDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          setCreateOpen(false);
          navigate(`/trips/${id}`);
        }}
      />

      <ScanInviteSheet open={scanOpen} onClose={() => setScanOpen(false)} />
    </div>
  );
}
