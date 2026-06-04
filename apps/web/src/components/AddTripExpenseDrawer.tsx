import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { todayIso } from "../lib/dates";
import { AmountInput } from "./AmountInput";
import { Sheet } from "./Sheet";

function clientId() {
  return `texp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type Props = {
  open: boolean;
  onClose: () => void;
  tripId: Id<"trips">;
  members: string[];
};

export function AddTripExpenseDrawer({ open, onClose, tripId, members }: Props) {
  const addTripExpense = useMutation(api.trips.addTripExpense);
  const [paise, setPaise] = useState(0);
  const [note, setNote] = useState("");
  const [paidBy, setPaidBy] = useState(members[0] ?? "You");
  const [splitAmong, setSplitAmong] = useState<string[]>(members);
  const [date, setDate] = useState(todayIso());
  const [saving, setSaving] = useState(false);

  function reset() {
    setPaise(0);
    setNote("");
    setPaidBy(members[0] ?? "You");
    setSplitAmong(members);
    setDate(todayIso());
    setSaving(false);
  }

  function toggleSplit(m: string) {
    setSplitAmong((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  async function handleSave() {
    if (paise === 0 || splitAmong.length === 0 || saving) return;
    setSaving(true);
    try {
      await addTripExpense({
        clientId: clientId(),
        tripId,
        paidBy,
        amount: paise,
        note: note.trim() || "Shared expense",
        splitAmong,
        date,
      });
      reset();
      onClose();
    } catch {
      setSaving(false);
    }
  }

  const canSave = paise > 0 && splitAmong.length > 0 && !saving;

  return (
    <Sheet open={open} onClose={onClose} title="Add shared expense">
      <AmountInput paise={paise} onChange={setPaise} />

      <div className="px-4">
        <input
          type="text"
          placeholder="What was this for?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={80}
          className="w-full px-3 py-3 rounded-xl text-sm outline-none"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-primary)" }}
        />
      </div>

      {/* Paid by */}
      <div className="flex flex-col gap-2 px-4">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
          Paid by
        </span>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {members.map((m) => {
            const active = paidBy === m;
            return (
              <button
                key={m}
                onClick={() => setPaidBy(m)}
                className="px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0"
                style={{
                  background: active ? "var(--color-accent-subtle)" : "var(--color-surface)",
                  border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border-subtle)"}`,
                  color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
                }}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      {/* Split among */}
      <div className="flex flex-col gap-2 px-4">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
          Split among ({splitAmong.length})
        </span>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => {
            const active = splitAmong.includes(m);
            return (
              <button
                key={m}
                onClick={() => toggleSplit(m)}
                className="px-3 py-1.5 rounded-full text-sm font-medium"
                style={{
                  background: active ? "var(--color-credit)18" : "var(--color-surface)",
                  border: `1px solid ${active ? "var(--color-credit)" : "var(--color-border-subtle)"}`,
                  color: active ? "var(--color-credit)" : "var(--color-text-muted)",
                }}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date */}
      <div className="px-4">
        <input
          type="date"
          value={date}
          max={todayIso()}
          onChange={(e) => setDate(e.target.value || todayIso())}
          aria-label="Date"
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}
        />
      </div>

      <div className="px-4">
        <button
          onClick={() => void handleSave()}
          disabled={!canSave}
          className="w-full rounded-xl text-base font-bold transition-opacity"
          style={{ height: 52, background: canSave ? "var(--color-accent)" : "var(--color-surface)", color: canSave ? "var(--color-bg)" : "var(--color-text-muted)" }}
        >
          {saving ? "Saving…" : "Add expense"}
        </button>
      </div>
    </Sheet>
  );
}
