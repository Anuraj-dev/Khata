import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { todayIso, formatRupees } from "../lib/dates";
import { AmountInput } from "./AmountInput";
import { Sheet } from "./Sheet";

function clientId() {
  return `texp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Trip-flavoured emoji shortcuts (tap again to clear).
const TRIP_EMOJIS = ["🏨", "🍽️", "🚕", "🎟️", "🛒", "🍻", "☕", "⛽", "🏖️", "🎁"];

const rupeesToPaise = (s: string) => Math.round((parseFloat(s) || 0) * 100);
const paiseToRupees = (p: number) => (p % 100 === 0 ? String(p / 100) : (p / 100).toFixed(2));

type Props = {
  open: boolean;
  onClose: () => void;
  tripId: Id<"trips">;
  members: string[];
  editing?: Doc<"tripExpenses"> | null;
};

export function AddTripExpenseDrawer({ open, onClose, tripId, members, editing }: Props) {
  const addTripExpense = useMutation(api.trips.addTripExpense);
  const updateTripExpense = useMutation(api.trips.updateTripExpense);
  const deleteTripExpense = useMutation(api.trips.deleteTripExpense);

  const [paise, setPaise] = useState(0);
  const [note, setNote] = useState("");
  const [emoji, setEmoji] = useState("");
  const [paidBy, setPaidBy] = useState(members[0] ?? "You");
  const [mode, setMode] = useState<"equal" | "custom">("equal");
  const [splitAmong, setSplitAmong] = useState<string[]>(members);
  // Per-member rupee strings for custom mode.
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [date, setDate] = useState(todayIso());
  const [saving, setSaving] = useState(false);

  const isEdit = !!editing;

  // Prefill (edit) or reset (add) whenever the sheet opens.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setPaise(editing.amount);
      setNote(editing.note === "Shared expense" ? "" : editing.note);
      setEmoji(editing.emoji ?? "");
      setPaidBy(editing.paidBy);
      setDate(editing.date);
      if (editing.splitMode === "custom" && editing.shares) {
        setMode("custom");
        setSplitAmong(editing.splitAmong);
        setCustom(
          Object.fromEntries(editing.shares.map((s) => [s.member, paiseToRupees(s.amount)]))
        );
      } else {
        setMode("equal");
        setSplitAmong(editing.splitAmong);
        setCustom({});
      }
    } else {
      setPaise(0);
      setNote("");
      setEmoji("");
      setPaidBy(members[0] ?? "You");
      setMode("equal");
      setSplitAmong(members);
      setCustom({});
      setDate(todayIso());
    }
    setSaving(false);
  }, [open, editing, members]);

  function toggleSplit(m: string) {
    setSplitAmong((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  // Fill custom inputs with an even split of the current total (remainder paise
  // go to the first members so the shares sum exactly to the total).
  function splitEvenly() {
    if (paise <= 0) return;
    const n = members.length;
    const base = Math.floor(paise / n);
    let rem = paise - base * n;
    const next: Record<string, string> = {};
    for (const m of members) {
      const share = base + (rem > 0 ? 1 : 0);
      if (rem > 0) rem--;
      next[m] = paiseToRupees(share);
    }
    setCustom(next);
  }

  const assigned = Object.values(custom).reduce((sum, v) => sum + rupeesToPaise(v), 0);
  const remaining = paise - assigned;
  const customMembers = members.filter((m) => rupeesToPaise(custom[m] ?? "") > 0);

  const canSave =
    paise > 0 &&
    !saving &&
    (mode === "equal" ? splitAmong.length > 0 : remaining === 0 && customMembers.length > 0);

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    const common = {
      paidBy,
      amount: paise,
      note: note.trim() || "Shared expense",
      emoji: emoji || undefined,
      date,
      ...(mode === "custom"
        ? {
            splitMode: "custom" as const,
            splitAmong: customMembers,
            shares: customMembers.map((m) => ({ member: m, amount: rupeesToPaise(custom[m]) })),
          }
        : { splitMode: "equal" as const, splitAmong, shares: undefined }),
    };
    try {
      if (editing) {
        await updateTripExpense({ expenseId: editing._id, ...common });
      } else {
        await addTripExpense({ clientId: clientId(), tripId, ...common });
      }
      onClose();
    } catch {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editing || saving) return;
    setSaving(true);
    try {
      await deleteTripExpense({ expenseId: editing._id });
      onClose();
    } catch {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={isEdit ? "Edit shared expense" : "Add shared expense"}>
      <AmountInput paise={paise} onChange={setPaise} />

      {/* Emoji + note */}
      <div className="flex flex-col gap-2 px-4">
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {TRIP_EMOJIS.map((e) => {
            const active = e === emoji;
            return (
              <button
                key={e}
                onClick={() => setEmoji(active ? "" : e)}
                className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 text-lg transition-colors"
                style={{
                  background: active ? "var(--color-accent-subtle)" : "var(--color-surface)",
                  border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border-subtle)"}`,
                }}
              >
                {e}
              </button>
            );
          })}
        </div>
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

      {/* Split mode toggle */}
      <div className="flex flex-col gap-2 px-4">
        <div className="flex gap-2">
          {(["equal", "custom"] as const).map((md) => {
            const active = mode === md;
            return (
              <button
                key={md}
                onClick={() => {
                  setMode(md);
                  if (md === "custom" && Object.keys(custom).length === 0) splitEvenly();
                }}
                className="flex-1 h-9 rounded-xl text-sm font-semibold transition-colors"
                style={{
                  background: active ? "var(--color-accent-subtle)" : "var(--color-surface)",
                  border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border-subtle)"}`,
                  color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
                }}
              >
                {md === "equal" ? "Split equally" : "Unequally"}
              </button>
            );
          })}
        </div>

        {mode === "equal" ? (
          <>
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
            {splitAmong.length > 0 && paise > 0 && (
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                ≈ {formatRupees(Math.floor(paise / splitAmong.length))} each · {splitAmong.length} people
              </span>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-2">
            {members.map((m) => (
              <div key={m} className="flex items-center gap-2">
                <span className="flex-1 text-sm truncate" style={{ color: "var(--color-text-primary)" }}>{m}</span>
                <div className="flex items-center gap-1 rounded-xl px-2.5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-subtle)" }}>
                  <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>₹</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={custom[m] ?? ""}
                    onChange={(e) => setCustom((prev) => ({ ...prev, [m]: e.target.value }))}
                    className="w-20 py-2 text-sm text-right outline-none bg-transparent"
                    style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}
                  />
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <button onClick={splitEvenly} className="text-xs font-semibold" style={{ color: "var(--color-accent)", background: "none", border: "none" }}>
                Split evenly
              </button>
              <span
                className="text-xs tabular-nums"
                style={{
                  color: remaining === 0 ? "var(--color-credit)" : "var(--color-debit)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {remaining === 0
                  ? "✓ all assigned"
                  : remaining > 0
                  ? `${formatRupees(remaining)} left`
                  : `over by ${formatRupees(-remaining)}`}
              </span>
            </div>
          </div>
        )}
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

      <div className="flex flex-col gap-2 px-4">
        <button
          onClick={() => void handleSave()}
          disabled={!canSave}
          className="w-full rounded-xl text-base font-bold transition-opacity"
          style={{ height: 52, background: canSave ? "var(--color-accent)" : "var(--color-surface)", color: canSave ? "var(--color-bg)" : "var(--color-text-muted)" }}
        >
          {saving ? "Saving…" : isEdit ? "Save changes" : "Add expense"}
        </button>
        {isEdit && (
          <button
            onClick={() => void handleDelete()}
            disabled={saving}
            className="w-full rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ height: 44, background: "var(--color-surface)", border: "1px solid var(--color-border-default)", color: "var(--color-error)" }}
          >
            Delete expense
          </button>
        )}
      </div>
    </Sheet>
  );
}
