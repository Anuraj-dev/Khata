import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { LocalExpense } from "../lib/expenseStorage";
import { formatRupees } from "../lib/dates";
import { Sheet } from "./Sheet";
import { Button } from "./Button";

type Props = {
  expense: LocalExpense | null; // null = closed
  onClose: () => void;
  showToast: (t: { kind: "error" | "info"; message: string }) => void;
};

// Tag an expense as udhaar with a person. Free-text name + autocomplete chips
// seeded from people already in the ledger and the SMS-parsed party.
export function TagUdhaarSheet({ expense, onClose, showToast }: Props) {
  const open = expense !== null;
  const balances = useQuery(api.udhaar.balances, open ? {} : "skip");
  const setTag = useMutation(api.udhaar.setTag);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (expense) setName(expense.udhaarPerson ?? expense.party ?? "");
  }, [expense]);

  const suggestions = useMemo(() => {
    const people = (balances ?? []).map((b) => b.person);
    if (expense?.party && !people.includes(expense.party)) people.push(expense.party);
    const typed = name.trim().toLowerCase();
    return people
      .filter((p) => p.toLowerCase() !== typed)
      .filter((p) => !typed || p.toLowerCase().includes(typed))
      .slice(0, 8);
  }, [balances, expense, name]);

  async function save(person: string | null) {
    if (!expense?.syncedId || busy) return;
    setBusy(true);
    try {
      await setTag({ expenseId: expense.syncedId as Id<"expenses">, person });
      showToast({
        kind: "info",
        message: person === null ? "Udhaar tag removed." : `Tagged as udhaar with ${person.trim()}.`,
      });
      onClose();
    } catch {
      showToast({ kind: "error", message: "Couldn't save the tag. Try again." });
    } finally {
      setBusy(false);
    }
  }

  const isDebit = expense?.direction === "debit";

  return (
    <Sheet open={open} onClose={onClose} title="Udhaar">
      {expense && (
        <>
          <p className="px-4 text-sm -mt-2" style={{ color: "var(--color-text-secondary)" }}>
            {isDebit ? "Gave" : "Got"} {formatRupees(expense.amount)}
            {expense.note ? ` · ${expense.note}` : ""} — with whom?
          </p>

          <div className="px-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name, e.g. Rohit"
              maxLength={40}
              className="w-full px-3 py-3 rounded-xl text-sm outline-none"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border-subtle)",
                color: "var(--color-text-primary)",
                fontFamily: "var(--font-sans)",
              }}
            />
          </div>

          {suggestions.length > 0 && (
            <div className="flex gap-2 px-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {suggestions.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setName(p)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0"
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border-subtle)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          <p className="px-4 text-xs" style={{ color: "var(--color-text-muted)" }}>
            {isDebit
              ? "Money you gave — they'll show as owing you."
              : "Money you got — counts against what they owe (or as your borrow)."}
          </p>

          <div className="flex flex-col gap-2 px-4">
            <Button
              fullWidth
              loading={busy}
              disabled={!name.trim() || !expense.syncedId || busy}
              onClick={() => void save(name)}
            >
              {expense.udhaarPerson ? "Update tag" : "Mark as udhaar"}
            </Button>
            {expense.udhaarPerson && (
              <Button
                variant="secondary"
                fullWidth
                disabled={busy}
                onClick={() => void save(null)}
                style={{ color: "var(--color-error)" }}
              >
                Remove udhaar tag
              </Button>
            )}
          </div>

          {!expense.syncedId && (
            <p className="px-4 text-xs" style={{ color: "var(--color-text-muted)" }}>
              Still syncing — try again in a moment.
            </p>
          )}
        </>
      )}
    </Sheet>
  );
}
