import { useEffect, useState } from "react";
import { Sheet } from "./Sheet";
import { AmountInput } from "./AmountInput";
import { Button } from "./Button";
import { formatRupees, todayIso } from "../lib/dates";

type Props = {
  open: boolean;
  onClose: () => void;
  current: number | null; // existing monthly limit (paise)
  spentThisMonth?: number; // paise — shown as a grounding hint when setting fresh
  onSave: (paise: number) => Promise<void>;
  onRemove?: () => Promise<void>;
};

function daysInCurrentMonth(): number {
  const [y, m] = todayIso().split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function SetBudgetSheet({ open, onClose, current, spentThisMonth, onSave, onRemove }: Props) {
  const [paise, setPaise] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setPaise(current ?? 0);
  }, [open, current]);

  async function handleSave() {
    if (paise <= 0 || busy) return;
    setBusy(true);
    try {
      await onSave(paise);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!onRemove || busy) return;
    setBusy(true);
    try {
      await onRemove();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  const perDay = paise > 0 ? Math.floor(paise / daysInCurrentMonth()) : 0;

  return (
    <Sheet open={open} onClose={onClose} title="Monthly budget">
      <AmountInput paise={paise} onChange={setPaise} />

      <p className="px-4 text-sm text-center" style={{ color: "var(--color-text-muted)" }}>
        {paise > 0
          ? `≈ ${formatRupees(perDay)}/day this month`
          : spentThisMonth && spentThisMonth > 0
            ? `You've spent ${formatRupees(spentThisMonth)} this month so far.`
            : "Set what you want to spend this month."}
      </p>

      <div className="flex flex-col gap-2 px-4">
        <Button fullWidth loading={busy} disabled={paise <= 0 || busy} onClick={() => void handleSave()}>
          {current != null ? "Update budget" : "Set budget"}
        </Button>
        {current != null && onRemove && (
          <Button
            variant="secondary"
            fullWidth
            disabled={busy}
            onClick={() => void handleRemove()}
            style={{ color: "var(--color-error)" }}
          >
            Remove budget
          </Button>
        )}
      </div>
    </Sheet>
  );
}
