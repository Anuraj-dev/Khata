import { useEffect, useState } from "react";
import { Sheet } from "./Sheet";
import { AmountInput } from "./AmountInput";
import { Button } from "./Button";
import { formatRupees } from "../lib/dates";

type Cat = { id: string; label: string; emoji: string };

type Props = {
  open: boolean;
  onClose: () => void;
  categories: Cat[];
  // Non-null = editing an existing cap (category locked); null = adding a new one.
  preset: { category: string; amount: number } | null;
  cappedIds: string[];
  onSave: (category: string, paise: number) => Promise<void>;
  onRemove: (category: string) => Promise<void>;
  showToast: (t: { kind: "error" | "info"; message: string }) => void;
};

export function CategoryCapSheet({ open, onClose, categories, preset, cappedIds, onSave, onRemove, showToast }: Props) {
  const editing = preset !== null;
  const [category, setCategory] = useState("");
  const [paise, setPaise] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setCategory(preset?.category ?? "");
      setPaise(preset?.amount ?? 0);
    }
  }, [open, preset]);

  const choices = editing
    ? categories.filter((c) => c.id === preset!.category)
    : categories.filter((c) => !cappedIds.includes(c.id));

  async function save() {
    if (!category || paise <= 0 || busy) return;
    setBusy(true);
    try {
      await onSave(category, paise);
      showToast({ kind: "info", message: "Cap saved." });
      onClose();
    } catch {
      showToast({ kind: "error", message: "Couldn't save. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!editing || busy) return;
    setBusy(true);
    try {
      await onRemove(preset!.category);
      showToast({ kind: "info", message: "Cap removed." });
      onClose();
    } catch {
      showToast({ kind: "error", message: "Couldn't remove. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={editing ? "Edit cap" : "Add category cap"}>
      {open && (
        <div className="flex flex-col gap-4">
          <div className="px-4">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={editing}
              className="w-full px-3 py-3 rounded-xl text-sm outline-none"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border-subtle)",
                color: "var(--color-text-primary)",
                fontFamily: "var(--font-sans)",
              }}
            >
              <option value="">Choose category…</option>
              {choices.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </div>

          <AmountInput paise={paise} onChange={setPaise} />

          <div className="flex flex-col gap-2 px-4">
            <Button fullWidth loading={busy} disabled={!category || paise <= 0 || busy} onClick={() => void save()}>
              Save cap {paise > 0 ? formatRupees(paise) : ""}
            </Button>
            {editing && (
              <Button
                variant="secondary"
                fullWidth
                disabled={busy}
                onClick={() => void remove()}
                style={{ color: "var(--color-error)" }}
              >
                Remove cap
              </Button>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}
