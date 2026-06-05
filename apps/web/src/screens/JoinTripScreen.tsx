import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { clearPendingJoin } from "../lib/joinLink";
import { Button } from "../components/Button";
import { LuggageIcon, LinkOffIcon } from "../components/icons";

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
        <span className="flex h-16 w-16 items-center justify-center" style={{ borderRadius: "var(--radius-xl)", background: "var(--color-surface-elevated)", color: "var(--color-text-muted)" }}>
          <LinkOffIcon size={28} strokeWidth={2} />
        </span>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{msg}</p>
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          Go home
        </Button>
      </Wrap>
    );
  }

  if (preview.isOwner) {
    return (
      <Wrap>
        <span className="flex h-16 w-16 items-center justify-center" style={{ borderRadius: "var(--radius-xl)", background: "var(--color-accent-bg)", color: "var(--color-accent)" }}>
          <LuggageIcon size={30} />
        </span>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          This is your trip — <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{preview.tripName}</span>.
        </p>
        <Button onClick={() => navigate(`/trips/${preview.tripId}`, { replace: true })}>
          Open trip
        </Button>
      </Wrap>
    );
  }

  const claimable = preview.members.filter(
    (m) => !preview.takenByOthers.includes(m) || m === preview.alreadyJoinedAs
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto px-6 pt-10 pb-8">
      <div className="flex flex-col items-center gap-1.5 pb-6 text-center">
        <span className="mb-1.5 flex h-16 w-16 items-center justify-center" style={{ borderRadius: "var(--radius-xl)", background: "var(--color-accent-bg)", color: "var(--color-accent)" }}>
          <LuggageIcon size={30} />
        </span>
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
                className="flex min-h-[48px] items-center justify-between px-4 py-3 text-left transition-colors"
                style={{
                  background: active ? "var(--color-accent-subtle)" : "var(--color-surface)",
                  border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border-subtle)"}`,
                  color: active ? "var(--color-accent)" : "var(--color-text-primary)",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  transitionDuration: "var(--dur-fast)",
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
        <Button
          variant={member ? "primary" : "secondary"}
          fullWidth
          loading={joining}
          disabled={!member || joining}
          onClick={() => void join()}
          className="mt-6"
          style={{ minHeight: 52 }}
        >
          {joining ? "Joining…" : member ? `Join as ${member} — read only` : "Pick your name"}
        </Button>
      )}
    </div>
  );
}
