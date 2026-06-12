import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { formatRupees } from "../lib/dates";
import { todayIso } from "../lib/dates";
import { Sheet } from "./Sheet";
import { AmountInput } from "./AmountInput";
import { Button } from "./Button";

type Props = {
  person: string;
  net: number; // paise, signed: >0 they owe you, <0 you owe them
  open: boolean;
  onClose: () => void;
  showToast: (t: { kind: "error" | "info"; message: string }) => void;
};

// "They paid me" / "I paid them" quick-settle sheet for the udhaar ledger.
// Pre-fills the outstanding amount; editable for partial repayments.
export function RecordRepaymentSheet({ person, net, open, onClose, showToast }: Props) {
  const addRepayment = useMutation(api.udhaar.addRepayment);

  // credit = they paid you (net > 0 path); debit = you paid them (net < 0 path)
  const direction = net >= 0 ? "credit" : "debit";
  const outstanding = Math.abs(net);

  const [paise, setPaise] = useState(outstanding);
  const [busy, setBusy] = useState(false);

  // Reset amount when sheet opens with a new person/balance
  const handleOpen = () => setPaise(outstanding);

  async function handleSave() {
    if (paise <= 0 || busy) return;
    setBusy(true);
    try {
      const note =
        direction === "credit"
          ? `${person} paid back`
          : `Paid back ${person}`;
      await addRepayment({
        clientId: crypto.randomUUID(),
        person,
        amount: paise,
        direction,
        note,
        date: todayIso(),
      });
      showToast({ kind: "info", message: "Repayment recorded." });
      onClose();
    } catch {
      showToast({ kind: "error", message: "Couldn't save. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Record repayment">
      {open && (
        <div onAnimationStart={handleOpen} className="flex flex-col gap-4">
          {/* Context line */}
          <p className="px-4 text-sm -mt-2" style={{ color: "var(--color-text-secondary)" }}>
            {net > 0
              ? `${person} owes you ${formatRupees(outstanding)} — how much did they pay?`
              : `You owe ${person} ${formatRupees(outstanding)} — how much did you pay?`}
          </p>

          <AmountInput paise={paise} onChange={setPaise} />

          {/* Direction indicator */}
          <p className="px-4 text-xs text-center" style={{ color: "var(--color-text-muted)" }}>
            {direction === "credit"
              ? `Records ${formatRupees(paise)} as received from ${person}`
              : `Records ${formatRupees(paise)} as paid to ${person}`}
          </p>

          <div className="px-4">
            <Button
              fullWidth
              loading={busy}
              disabled={paise <= 0 || busy}
              onClick={() => void handleSave()}
            >
              {direction === "credit" ? "They paid me" : "I paid them"} {formatRupees(paise)}
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
