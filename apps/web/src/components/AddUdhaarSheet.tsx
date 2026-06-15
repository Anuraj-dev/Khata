import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { formatRupees, todayIso } from "../lib/dates";
import { Sheet } from "./Sheet";
import { AmountInput } from "./AmountInput";
import { Button } from "./Button";

type Props = {
  open: boolean;
  onClose: () => void;
  showToast: (t: { kind: "error" | "info"; message: string }) => void;
};

type Intent = "lent" | "borrowed";

// Log an offline (cash) udhaar from scratch — no SMS, no existing balance needed.
// "I lent" → a debit they owe back; "I borrowed" → a credit you owe back.
export function AddUdhaarSheet({ open, onClose, showToast }: Props) {
  const addRepayment = useMutation(api.udhaar.addRepayment);
  const balances = useQuery(api.udhaar.balances, open ? {} : "skip");
  const contacts = useQuery(api.contacts.listContacts, open ? {} : "skip");

  const [name, setName] = useState("");
  const [intent, setIntent] = useState<Intent>("lent");
  const [paise, setPaise] = useState(0);
  const [busy, setBusy] = useState(false);

  // People you already know, for one-tap pick — ledger names + saved contacts.
  const suggestions = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const b of balances ?? []) if (!seen.has(b.person)) (seen.add(b.person), names.push(b.person));
    for (const c of contacts ?? []) if (!seen.has(c.name)) (seen.add(c.name), names.push(c.name));
    const typed = name.trim().toLowerCase();
    return names
      .filter((p) => p.toLowerCase() !== typed)
      .filter((p) => !typed || p.toLowerCase().includes(typed))
      .slice(0, 8);
  }, [balances, contacts, name]);

  function reset() {
    setName("");
    setIntent("lent");
    setPaise(0);
  }

  async function handleSave() {
    const person = name.trim();
    if (!person || paise <= 0 || busy) return;
    setBusy(true);
    try {
      const direction = intent === "lent" ? "debit" : "credit";
      const note = intent === "lent" ? `Lent ${person}` : `Borrowed from ${person}`;
      await addRepayment({
        clientId: crypto.randomUUID(),
        person,
        amount: paise,
        direction,
        note,
        date: todayIso(),
      });
      showToast({ kind: "info", message: `Saved · ${note}.` });
      reset();
      onClose();
    } catch {
      showToast({ kind: "error", message: "Couldn't save. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add udhaar">
      {open && (
        <div className="flex flex-col gap-4">
          {/* I lent / I borrowed toggle */}
          <div className="flex gap-2 px-4">
            {(["lent", "borrowed"] as const).map((opt) => {
              const active = intent === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setIntent(opt)}
                  className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors"
                  style={{
                    background: active ? "var(--color-accent-subtle)" : "var(--color-surface)",
                    border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border-subtle)"}`,
                    color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
                    transitionDuration: "var(--dur-fast)",
                  }}
                >
                  {opt === "lent" ? "I lent" : "I borrowed"}
                </button>
              );
            })}
          </div>

          <div className="px-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={intent === "lent" ? "Who did you lend to?" : "Who did you borrow from?"}
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

          <AmountInput paise={paise} onChange={setPaise} />

          <div className="px-4">
            <Button
              fullWidth
              loading={busy}
              disabled={!name.trim() || paise <= 0 || busy}
              onClick={() => void handleSave()}
            >
              {intent === "lent" ? "Lent" : "Borrowed"} {formatRupees(paise)}
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
