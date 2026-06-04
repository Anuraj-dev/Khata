import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { clearPendingJoin } from "../lib/joinLink";

export function JoinTripScreen() {
  const { token } = useParams();
  const navigate = useNavigate();

  // We've reached the screen — the pending-join handoff is done.
  useEffect(() => { clearPendingJoin(); }, []);

  const preview = useQuery(api.tripShares.previewShare, token ? { token } : "skip");
  const redeem = useMutation(api.tripShares.redeemShare);

  const [member, setMember] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preselect the slot they already claimed (re-visit).
  useEffect(() => {
    if (preview?.valid && preview.alreadyJoinedAs) setMember(preview.alreadyJoinedAs);
  }, [preview]);

  // If the link is opened by the trip's own owner (same account that shared it),
  // there's nothing to join — go straight to the trip instead of parking on a
  // dead-end "Open trip" screen.
  useEffect(() => {
    if (preview?.valid && preview.isOwner) {
      navigate(`/trips/${preview.tripId}`, { replace: true });
    }
  }, [preview, navigate]);

  async function join() {
    if (!token || !member || joining) return;
    setJoining(true);
    setError(null);
    try {
      const { tripId } = await redeem({ token, member });
      navigate(`/trips/${tripId}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join. Try again.");
      setJoining(false);
    }
  }

  const Wrap = ({ children }: { children: React.ReactNode }) => (
    <div className="flex flex-col flex-1 min-h-0 items-center justify-center gap-4 px-6 text-center">
      {children}
    </div>
  );

  if (preview === undefined) {
    return <Wrap><span className="text-sm" style={{ color: "var(--color-text-muted)" }}>Loading invite…</span></Wrap>;
  }

  if (!preview.valid) {
    const msg = preview.reason === "expired"
      ? "This invite has expired. Ask the trip owner to share a fresh link."
      : "This invite link is invalid or was revoked.";
    return (
      <Wrap>
        <span style={{ fontSize: 40, opacity: 0.5 }}>🔗</span>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{msg}</p>
        <button onClick={() => navigate("/")} className="text-sm font-semibold" style={{ color: "var(--color-accent)", background: "none", border: "none" }}>
          Go home
        </button>
      </Wrap>
    );
  }

  if (preview.isOwner) {
    return (
      <Wrap>
        <span style={{ fontSize: 40 }}>🧳</span>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          This is your trip — <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{preview.tripName}</span>.
        </p>
        <button onClick={() => navigate(`/trips/${preview.tripId}`, { replace: true })} className="rounded-xl px-4 py-2 text-sm font-semibold" style={{ background: "var(--color-accent)", color: "var(--color-bg)" }}>
          Open trip
        </button>
      </Wrap>
    );
  }

  const claimable = preview.members.filter(
    (m) => !preview.takenByOthers.includes(m) || m === preview.alreadyJoinedAs
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto px-6 pt-10 pb-8">
      <div className="flex flex-col items-center gap-1.5 pb-6 text-center">
        <span style={{ fontSize: 40 }}>🧳</span>
        <h2 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Join “{preview.tripName}”
        </h2>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          You'll see this trip read-only. Which member are you?
        </p>
      </div>

      {claimable.length === 0 ? (
        <p className="text-sm text-center" style={{ color: "var(--color-text-secondary)" }}>
          Every member slot has already been claimed. Ask the owner to add you.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {claimable.map((m) => {
            const active = member === m;
            return (
              <button
                key={m}
                onClick={() => setMember(m)}
                className="flex items-center justify-between rounded-xl px-4 py-3 text-left transition-colors"
                style={{
                  background: active ? "var(--color-accent-subtle)" : "var(--color-surface)",
                  border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border-subtle)"}`,
                  color: active ? "var(--color-accent)" : "var(--color-text-primary)",
                }}
              >
                <span className="text-sm font-medium">{m}</span>
                {active && <span className="text-sm">✓</span>}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p className="mt-3 text-xs text-center" style={{ color: "var(--color-error)" }}>{error}</p>
      )}

      {claimable.length > 0 && (
        <button
          onClick={() => void join()}
          disabled={!member || joining}
          className="mt-6 w-full rounded-xl text-base font-bold transition-opacity"
          style={{
            height: 52,
            background: member ? "var(--color-accent)" : "var(--color-surface)",
            color: member ? "var(--color-bg)" : "var(--color-text-muted)",
            opacity: joining ? 0.6 : 1,
          }}
        >
          {joining ? "Joining…" : member ? `Join as ${member} — read only` : "Pick your name"}
        </button>
      )}
    </div>
  );
}
