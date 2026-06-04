import { useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { todayIso } from "../lib/dates";
import { Sheet } from "./Sheet";

function clientId() {
  return `trip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (id: Id<"trips">) => void;
};

export function CreateTripDrawer({ open, onClose, onCreated }: Props) {
  const createTrip = useMutation(api.trips.createTrip);
  const [name, setName] = useState("");
  const [members, setMembers] = useState<string[]>(["You"]);
  const [newMember, setNewMember] = useState("");
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Focus the name field only once the sheet is actually open. A bare `autoFocus`
  // attribute fires on mount even while the sheet sits closed off-screen, which
  // pops the mobile keyboard the instant you visit the Trips tab.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => nameRef.current?.focus(), 320);
    return () => clearTimeout(t);
  }, [open]);

  function reset() {
    setName("");
    setMembers(["You"]);
    setNewMember("");
    setSaving(false);
  }

  function addMember() {
    const m = newMember.trim();
    if (!m || members.some((x) => x.toLowerCase() === m.toLowerCase())) {
      setNewMember("");
      return;
    }
    setMembers((prev) => [...prev, m]);
    setNewMember("");
  }

  async function handleCreate() {
    if (!name.trim() || members.length < 2 || saving) return;
    setSaving(true);
    try {
      const id = await createTrip({
        clientId: clientId(),
        name: name.trim(),
        members,
        startDate: todayIso(),
      });
      reset();
      onCreated(id);
    } catch {
      setSaving(false);
    }
  }

  const canCreate = name.trim().length > 0 && members.length >= 2 && !saving;

  return (
    <Sheet open={open} onClose={onClose} title="New trip">
      <div className="flex flex-col gap-4 px-4 pb-2">
        <input
          ref={nameRef}
          type="text"
          placeholder="Trip name (e.g. Goa 2026)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          className="w-full px-3 py-3 rounded-xl text-sm outline-none"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-primary)" }}
        />

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
            Members
          </span>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <span
                key={m}
                className="flex items-center gap-1.5 rounded-full pl-3 pr-2 py-1.5 text-sm"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-primary)" }}
              >
                {m}
                {m !== "You" && (
                  <button
                    onClick={() => setMembers((prev) => prev.filter((x) => x !== m))}
                    aria-label={`Remove ${m}`}
                    style={{ background: "none", border: "none", color: "var(--color-text-muted)", lineHeight: 1 }}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add member name"
              value={newMember}
              onChange={(e) => setNewMember(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addMember(); }}
              maxLength={30}
              className="flex-1 min-w-0 px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-primary)" }}
            />
            <button
              onClick={addMember}
              className="shrink-0 px-4 rounded-xl text-sm font-semibold"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-default)", color: "var(--color-text-primary)" }}
            >
              Add
            </button>
          </div>
        </div>

        <button
          onClick={() => void handleCreate()}
          disabled={!canCreate}
          className="w-full rounded-xl text-base font-bold transition-opacity"
          style={{ height: 52, background: canCreate ? "var(--color-accent)" : "var(--color-surface)", color: canCreate ? "var(--color-bg)" : "var(--color-text-muted)" }}
        >
          {saving ? "Creating…" : "Create trip"}
        </button>
      </div>
    </Sheet>
  );
}
