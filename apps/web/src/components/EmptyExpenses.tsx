import { Button } from "./Button";
import { PlusIcon } from "./icons";

type Props = { onAdd: () => void };

export function EmptyExpenses({ onAdd }: Props) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 px-6 pb-24">
      <span
        className="flex h-20 w-20 items-center justify-center text-4xl font-bold"
        style={{
          borderRadius: "var(--radius-xl)",
          background: "var(--gradient-hero), var(--color-surface)",
          color: "var(--color-accent)",
          fontFamily: "var(--font-mono)",
          boxShadow: "inset 0 0 0 1px var(--color-accent-border)",
        }}
      >
        ₹
      </span>
      <p className="text-lg font-semibold" style={{ color: "var(--color-text-secondary)" }}>
        No expenses yet
      </p>
      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        Tap + to log your first expense
      </p>
      <Button className="mt-2" leftIcon={<PlusIcon size={16} />} onClick={onAdd}>
        Add expense
      </Button>
    </div>
  );
}
