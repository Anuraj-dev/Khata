import { useState, useEffect, useRef } from "react";
import { todayIso } from "../lib/dates";
import { type ExpenseCategory, type ExpenseDirection } from "../lib/expenseStorage";
import { AmountInput } from "./AmountInput";
import { CategoryPicker } from "./CategoryPicker";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (draft: {
    amount: number;
    note: string;
    category: ExpenseCategory;
    direction: ExpenseDirection;
    date: string;
  }) => Promise<boolean>;
};

export function AddExpenseDrawer({ open, onClose, onSave }: Props) {
  const [paise, setPaise] = useState(0);
  const [note, setNote] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [direction, setDirection] = useState<ExpenseDirection>("debit");
  const [date, setDate] = useState(todayIso());
  const [isSaving, setIsSaving] = useState(false);
  const noteRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // lock scroll on body when drawer is open
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function reset() {
    setPaise(0);
    setNote("");
    setCategory("other");
    setDirection("debit");
    setDate(todayIso());
    setIsSaving(false);
  }

  async function handleSave() {
    if (paise === 0 || isSaving) return;
    setIsSaving(true);
    // onSave issues the Convex mutation with an optimistic update, so the row is
    // already in the list by the time this resolves — no separate local write.
    const saved = await onSave({ amount: paise, note, category, direction, date });
    if (saved) {
      reset();
      onClose();
    } else {
      setIsSaving(false);
    }
  }

  const canSave = paise > 0 && !isSaving;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 transition-opacity duration-200"
        style={{
          background: "rgba(0,0,0,0.55)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col gap-4 rounded-t-2xl pt-3 pb-8 transition-transform duration-300 ease-out"
        style={{
          background: "var(--color-surface-elevated)",
          transform: open ? "translateY(0)" : "translateY(110%)",
          paddingBottom: `max(2rem, env(safe-area-inset-bottom, 0px) + 1rem)`,
          maxHeight: "92dvh",
          overflowY: "auto",
        }}
      >
        {/* Handle */}
        <div
          className="self-center w-9 h-1 rounded-full mb-1"
          style={{ background: "var(--color-border-default)" }}
        />

        {/* Direction toggle */}
        <div className="px-4">
          <div
            className="relative flex h-11 rounded-xl overflow-hidden"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border-subtle)",
            }}
          >
            {/* Sliding pill — moves instead of each button fading in/out */}
            <div
              className="absolute inset-0 w-1/2 pointer-events-none"
              style={{
                transform: direction === "debit" ? "translateX(0%)" : "translateX(100%)",
                transition: "transform 200ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms ease",
                background: direction === "debit"
                  ? "var(--color-debit)" + "20"
                  : "var(--color-credit)" + "20",
                boxShadow: direction === "debit"
                  ? `inset 0 0 0 1px ${"var(--color-debit)"}55`
                  : `inset 0 0 0 1px ${"var(--color-credit)"}55`,
              }}
            />
            {(["debit", "credit"] as const).map((dir) => {
              const active = direction === dir;
              const color = dir === "debit" ? "var(--color-debit)" : "var(--color-credit)";
              return (
                <button
                  key={dir}
                  onClick={() => setDirection(dir)}
                  className="relative flex-1 h-full text-sm font-semibold z-10"
                  style={{
                    color: active ? color : "var(--color-text-secondary)",
                    transition: "color 150ms ease",
                    background: "transparent",
                    border: "none",
                  }}
                >
                  {dir === "debit" ? "Spent" : "Received"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount keypad */}
        <AmountInput paise={paise} onChange={setPaise} />

        {/* Note + date */}
        <div className="flex gap-2 px-4">
          <input
            ref={noteRef}
            type="text"
            placeholder={direction === "debit" ? "What was this for? e.g. lunch with Riya" : "Where did it come from? e.g. salary, refund"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={80}
            className="flex-1 min-w-0 px-3 py-3 rounded-xl text-sm outline-none"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border-subtle)",
              color: "var(--color-text-primary)",
              fontFamily: "var(--font-sans)",
            }}
          />
          <input
            type="date"
            value={date}
            max={todayIso()}
            onChange={(e) => setDate(e.target.value || todayIso())}
            aria-label="Date"
            className="shrink-0 px-3 py-3 rounded-xl text-sm outline-none"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border-subtle)",
              color: "var(--color-text-secondary)",
              fontFamily: "var(--font-mono)",
            }}
          />
        </div>

        {/* Category picker */}
        <CategoryPicker value={category} onChange={setCategory} />

        {/* Save */}
        <div className="px-4">
          <button
            onClick={() => void handleSave()}
            disabled={!canSave}
            className="w-full h-13 rounded-xl text-base font-bold transition-opacity"
            style={{
              height: 52,
              background: canSave ? "var(--color-accent)" : "var(--color-surface)",
              color: canSave ? "var(--color-bg)" : "var(--color-text-muted)",
              opacity: isSaving ? 0.7 : 1,
            }}
          >
            {isSaving ? "Saving…" : direction === "debit" ? "Log Expense" : "Log Income"}
          </button>
        </div>
      </div>
    </>
  );
}
