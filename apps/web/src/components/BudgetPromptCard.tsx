import { formatRupees } from "../lib/dates";
import { Button } from "./Button";

type Props = {
  spentThisMonth: number; // paise
  onSet: () => void;
  onLater: () => void;
};

// One-time nudge on the home screen to set a monthly budget, shown only after
// the user has logged enough to have seen value (eligibility decided by the
// caller). "Later" dismisses it permanently; Settings remains the way back in.
export function BudgetPromptCard({ spentThisMonth, onSet, onLater }: Props) {
  return (
    <div className="px-4 pt-3 pb-1">
      <div
        className="flex flex-col gap-2 px-3.5 py-3"
        style={{
          border: "1px solid var(--color-border-subtle)",
          borderRadius: "var(--radius-lg)",
          background: "var(--gradient-surface)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Set a monthly target?
        </p>
        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          {spentThisMonth > 0
            ? `You've logged ${formatRupees(spentThisMonth)} this month. `
            : ""}
          Give yourself a budget and Khata keeps a daily plan for you.
        </p>
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={onSet}>
            Set budget
          </Button>
          <Button size="sm" variant="secondary" onClick={onLater}>
            Later
          </Button>
        </div>
      </div>
    </div>
  );
}
