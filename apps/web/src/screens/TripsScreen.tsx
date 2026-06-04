import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { CreateTripDrawer } from "../components/CreateTripDrawer";
import { ScanInviteSheet } from "../components/ScanInviteSheet";
import { Button } from "../components/Button";
import { LuggageIcon, ChevronRight, PlusIcon } from "../components/icons";

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
          <Button variant="secondary" size="sm" onClick={() => setScanOpen(true)}>
            Scan
          </Button>
          <Button size="sm" leftIcon={<PlusIcon size={16} />} onClick={() => setCreateOpen(true)}>
            New
          </Button>
        </div>
      </div>

      {trips === undefined && (
        <div className="flex flex-1 items-center justify-center" style={{ color: "var(--color-text-muted)" }}>
          <span className="text-sm">Loading…</span>
        </div>
      )}

      {trips && trips.length === 0 && (
        <div className="flex flex-col flex-1 items-center justify-center gap-3 px-6 pb-16" style={{ color: "var(--color-text-secondary)" }}>
          <span
            className="flex h-16 w-16 items-center justify-center"
            style={{ borderRadius: "var(--radius-xl)", background: "var(--color-accent-bg)", color: "var(--color-accent)" }}
          >
            <LuggageIcon size={30} />
          </span>
          <p className="text-sm text-center">No trips yet. Create one to split shared expenses with friends.</p>
          <Button leftIcon={<PlusIcon size={16} />} onClick={() => setCreateOpen(true)}>
            Create a trip
          </Button>
        </div>
      )}

      {trips && trips.length > 0 && (
        <div className="flex flex-col">
          {trips.map((trip) => (
            <button
              key={trip._id}
              onClick={() => navigate(`/trips/${trip._id}`)}
              className="flex items-center gap-3 px-4 py-3.5 text-left transition-colors active:[background:var(--color-surface-elevated)]"
              style={{ borderBottom: "1px solid var(--color-border-subtle)", transitionDuration: "var(--dur-fast)", cursor: "pointer" }}
            >
              <div
                className="flex items-center justify-center w-10 h-10 shrink-0"
                style={{ borderRadius: "var(--radius-md)", background: "var(--color-accent-bg)", color: "var(--color-accent)", boxShadow: "inset 0 0 0 1px var(--color-accent-border)" }}
              >
                <LuggageIcon size={20} />
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
                <span className="shrink-0" style={{ color: "var(--color-text-muted)" }}>
                  <ChevronRight size={18} strokeWidth={2} />
                </span>
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
