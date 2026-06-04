// Category catalog. The six built-ins ship with the app and always exist; custom
// categories are synced per-user from the Convex `categories` table. Every expense
// stores a category *id* (a slug); the UI resolves that id to a label/emoji/color.

export type CategoryDef = {
  id: string;
  label: string;
  emoji: string;
  color: string; // CSS color — built-ins use theme vars, custom ones use hex
  builtIn: boolean;
};

export const BUILTIN_CATEGORIES: CategoryDef[] = [
  { id: "food", label: "Food", emoji: "🍜", color: "var(--color-food)", builtIn: true },
  { id: "travel", label: "Travel", emoji: "✈️", color: "var(--color-travel)", builtIn: true },
  { id: "shopping", label: "Shopping", emoji: "🛍️", color: "var(--color-shopping)", builtIn: true },
  { id: "bills", label: "Bills", emoji: "🧾", color: "var(--color-bills)", builtIn: true },
  { id: "health", label: "Health", emoji: "💊", color: "var(--color-health)", builtIn: true },
  { id: "other", label: "Other", emoji: "·", color: "var(--color-other)", builtIn: true },
];

// Emoji suggestions for the "add category" form (user can also type their own).
export const CATEGORY_EMOJIS = [
  "🛒", "🎬", "🏠", "🚗", "🎮", "☕", "🐶", "💪", "📚", "🎁", "💼", "🍻", "✏️", "🎵", "🌿",
];

// Palette for auto-assigning a custom category's color (chosen by name hash so the
// same name always lands on the same color).
const CATEGORY_PALETTE = [
  "#fb923c", "#60a5fa", "#a78bfa", "#f472b6", "#34d399",
  "#22d3ee", "#fbbf24", "#fb7185", "#4ade80", "#818cf8", "#e879f9", "#2dd4bf",
];

export function autoColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return CATEGORY_PALETTE[h % CATEGORY_PALETTE.length];
}

export function slugify(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || `cat-${Date.now().toString(36)}`;
}

const FALLBACK_EMOJI = "🏷️";

// Resolve a stored category id to its display metadata. Unknown ids (e.g. a custom
// category that was later deleted) degrade to a generic tag look.
export function resolveCategory(id: string, custom: CategoryDef[]): CategoryDef {
  return (
    BUILTIN_CATEGORIES.find((c) => c.id === id) ||
    custom.find((c) => c.id === id) || {
      id,
      label: id,
      emoji: FALLBACK_EMOJI,
      color: "var(--color-other)",
      builtIn: false,
    }
  );
}
