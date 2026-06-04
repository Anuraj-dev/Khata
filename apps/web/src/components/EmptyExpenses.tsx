type Props = { onAdd: () => void };

export function EmptyExpenses({ onAdd }: Props) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 px-6 pb-24">
      <span
        className="text-5xl font-bold"
        style={{ color: "var(--color-accent-dim)" }}
      >
        ₹
      </span>
      <p className="text-lg font-semibold" style={{ color: "var(--color-text-secondary)" }}>
        No expenses yet
      </p>
      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        Tap + to log your first expense
      </p>
      <button
        onClick={onAdd}
        className="mt-2 text-sm font-medium px-5 py-2 rounded-full"
        style={{ color: "var(--color-accent)", border: "1px solid var(--color-accent-dim)", background: "var(--color-accent-subtle)" }}
      >
        Add expense
      </button>
    </div>
  );
}
