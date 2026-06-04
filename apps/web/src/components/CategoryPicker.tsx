import { useState } from "react";
import { useCategories } from "../hooks/useCategories";
import { AddCategoryForm } from "./AddCategoryForm";

type Props = {
  value: string;
  onChange: (cat: string) => void;
};

export function CategoryPicker({ value, onChange }: Props) {
  const { categories, addCategory } = useCategories();
  const [adding, setAdding] = useState(false);

  async function handleAdd(label: string, emoji: string) {
    const created = await addCategory(label, emoji);
    if (created) onChange(created.id);
    setAdding(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 px-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {categories.map((cat) => {
          const active = cat.id === value;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onChange(cat.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-colors"
              style={{
                background: active ? cat.color + "33" : "var(--color-surface)",
                border: `1px solid ${active ? cat.color : "var(--color-border-subtle)"}`,
                color: active ? cat.color : "var(--color-text-secondary)",
              }}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}

        {/* Inline add */}
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          aria-label="Add category"
          className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 text-lg transition-colors"
          style={{
            background: "var(--color-surface)",
            border: `1px dashed ${adding ? "var(--color-accent)" : "var(--color-border-default)"}`,
            color: adding ? "var(--color-accent)" : "var(--color-text-secondary)",
          }}
        >
          +
        </button>
      </div>

      {adding && (
        <div className="px-4">
          <AddCategoryForm onAdd={handleAdd} onCancel={() => setAdding(false)} />
        </div>
      )}
    </div>
  );
}
