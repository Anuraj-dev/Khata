import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Sheet } from "./Sheet";

type Props = {
  open: boolean;
  onClose: () => void;
  tripId: Id<"trips">;
  members: string[];
  // Members that appear on an expense or settlement — can't be removed until
  // those are cleared (server enforces it too; we disable the × and explain).
  usedMembers: Set<string>;
};

export function ManageMembersSheet({ open, onClose, tripId, members, usedMembers }: Props) {
  const addMember = useMutation(api.trips.addTripMember);
  const removeMember = useMutation(api.trips.removeTripMember);

  const [newMember, setNewMember] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleAdd() {
    const name = newMember.trim();
    if (!name || busy) return;
    setBusy(true);
    setError(null);
    try {
      await addMember({ tripId, member: name });
      setNewMember("");
      inputRef.current?.focus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add member");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(member: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await removeMember({ tripId, member });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't remove member");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Manage members">
      <div className="flex flex-col gap-4 px-4 pb-2">
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Add people you split with later, or remove someone added by mistake.
        </p>

        <div className="flex flex-col gap-2">
          {members.map((m) => {
            const locked = m === "You";
            const used = usedMembers.has(m);
            return (
              <div
                key={m}
                className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-subtle)" }}
              >
                <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>
                  {m}
                  {locked && (
                    <span className="ml-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                      (you)
                    </span>
                  )}
                  {!locked && used && (
                    <span className="ml-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                      on expenses
                    </span>
                  )}
                </span>
                {!locked && (
                  <button
                    onClick={() => void handleRemove(m)}
                    disabled={busy || used}
                    aria-label={`Remove ${m}`}
                    className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition-opacity disabled:opacity-40"
                    style={{
                      background: "var(--color-surface-elevated)",
                      border: "1px solid var(--color-border-default)",
                      color: used ? "var(--color-text-muted)" : "var(--color-debit)",
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Add member name"
            value={newMember}
            onChange={(e) => setNewMember(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleAdd(); }}
            maxLength={30}
            className="flex-1 min-w-0 px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-primary)" }}
          />
          <button
            onClick={() => void handleAdd()}
            disabled={busy || !newMember.trim()}
            className="shrink-0 px-4 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-default)", color: "var(--color-text-primary)" }}
          >
            Add
          </button>
        </div>

        {error && (
          <p className="text-xs" style={{ color: "var(--color-error)" }}>{error}</p>
        )}

        <button
          onClick={onClose}
          className="w-full rounded-xl text-base font-bold mt-1"
          style={{ height: 52, background: "var(--color-accent)", color: "var(--color-bg)" }}
        >
          Done
        </button>
      </div>
    </Sheet>
  );
}
