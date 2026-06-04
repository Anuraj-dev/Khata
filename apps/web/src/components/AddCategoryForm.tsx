import { useEffect, useRef, useState } from "react";
import { CATEGORY_EMOJIS } from "../lib/categories";

type Props = {
  onAdd: (label: string, emoji: string) => void | Promise<void>;
  onCancel?: () => void;
  busy?: boolean;
  autoFocus?: boolean;
};

// Compact "name + emoji" creator (color is auto-assigned). Mounts on demand, so
// autofocusing the name field here never pops the keyboard unexpectedly.
export function AddCategoryForm({ onAdd, onCancel, busy, autoFocus = true }: Props) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(CATEGORY_EMOJIS[0]);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) nameRef.current?.focus();
  }, [autoFocus]);

  const canAdd = name.trim().length > 0 && !busy;

  function submit() {
    if (!canAdd) return;
    void onAdd(name.trim(), emoji);
    setName("");
    setEmoji(CATEGORY_EMOJIS[0]);
  }

  return (
    <div
      className="flex flex-col gap-2.5 rounded-xl p-3"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-subtle)" }}
    >
      {/* Emoji choices */}
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {CATEGORY_EMOJIS.map((e) => {
          const active = e === emoji;
          return (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 text-lg transition-colors"
              style={{
                background: active ? "var(--color-accent-subtle)" : "var(--color-surface-elevated)",
                border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border-subtle)"}`,
              }}
            >
              {e}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <input
          ref={nameRef}
          type="text"
          placeholder="Category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") onCancel?.();
          }}
          maxLength={24}
          className="flex-1 min-w-0 px-3 py-2.5 rounded-xl text-sm outline-none"
          style={{
            background: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border-subtle)",
            color: "var(--color-text-primary)",
          }}
        />
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 px-3 rounded-xl text-sm font-medium"
            style={{ background: "var(--color-surface-elevated)", color: "var(--color-text-secondary)" }}
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={!canAdd}
          className="shrink-0 px-4 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40"
          style={{ background: "var(--color-accent)", color: "var(--color-bg)" }}
        >
          Add
        </button>
      </div>
    </div>
  );
}
