import type { ExpenseCategory } from "../lib/expenseStorage";

const CATEGORIES: { value: ExpenseCategory; label: string; icon: string; color: string }[] = [
  { value: "food",     label: "Food",     icon: "🍜", color: "var(--color-food)" },
  { value: "travel",   label: "Travel",   icon: "✈️", color: "var(--color-travel)" },
  { value: "shopping", label: "Shopping", icon: "🛍️", color: "var(--color-shopping)" },
  { value: "bills",    label: "Bills",    icon: "🧾", color: "var(--color-bills)" },
  { value: "health",   label: "Health",   icon: "💊", color: "var(--color-health)" },
  { value: "other",    label: "Other",    icon: "·",  color: "var(--color-other)" },
];

type Props = {
  value: ExpenseCategory;
  onChange: (cat: ExpenseCategory) => void;
};

export function CategoryPicker({ value, onChange }: Props) {
  return (
    <div className="flex gap-2 px-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
      {CATEGORIES.map((cat) => {
        const active = cat.value === value;
        return (
          <button
            key={cat.value}
            onClick={() => onChange(cat.value)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-colors"
            style={{
              background: active ? cat.color + "33" : "var(--color-surface)",
              border: `1px solid ${active ? cat.color : "var(--color-border-subtle)"}`,
              color: active ? cat.color : "var(--color-text-secondary)",
            }}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}
