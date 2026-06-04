import { useCallback, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  BUILTIN_CATEGORIES,
  autoColor,
  resolveCategory,
  slugify,
  type CategoryDef,
} from "../lib/categories";

// Merges the built-in categories with the user's synced custom ones and exposes
// add/delete plus an id→metadata resolver. Convex dedupes the underlying query,
// so it's cheap to call from multiple components.
export function useCategories() {
  const customDocs = useQuery(api.categories.listCategories);
  const addMut = useMutation(api.categories.addCategory);
  const deleteMut = useMutation(api.categories.deleteCategory);

  const customDefs: CategoryDef[] = useMemo(
    () =>
      (customDocs ?? []).map((c) => ({
        id: c.clientId,
        label: c.label,
        emoji: c.emoji,
        color: c.color,
        builtIn: false,
      })),
    [customDocs]
  );

  const categories = useMemo(
    () => [...BUILTIN_CATEGORIES, ...customDefs],
    [customDefs]
  );

  const resolve = useCallback(
    (id: string) => resolveCategory(id, customDefs),
    [customDefs]
  );

  // Creates a category (or returns the existing match) and resolves to its def so
  // callers can immediately select it.
  const addCategory = useCallback(
    async (label: string, emoji: string): Promise<CategoryDef | null> => {
      const trimmed = label.trim();
      if (!trimmed) return null;
      const id = slugify(trimmed);
      const dupe = categories.find(
        (c) => c.id === id || c.label.toLowerCase() === trimmed.toLowerCase()
      );
      if (dupe) return dupe;
      const color = autoColor(id);
      const finalEmoji = emoji || "🏷️";
      await addMut({ clientId: id, label: trimmed, emoji: finalEmoji, color });
      return { id, label: trimmed, emoji: finalEmoji, color, builtIn: false };
    },
    [addMut, categories]
  );

  const deleteCategory = useCallback(
    (categoryId: Id<"categories">) => deleteMut({ categoryId }),
    [deleteMut]
  );

  return {
    categories,
    customDocs: customDocs ?? [],
    loading: customDocs === undefined,
    resolve,
    addCategory,
    deleteCategory,
  };
}
