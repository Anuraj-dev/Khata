import type { LocalExpense } from "./expenseStorage";

export type WorkspaceSnapshot = {
  capturedAt: number;
  recentExpenses: LocalExpense[];
};

function isDirection(v: unknown): v is LocalExpense["direction"] {
  return v === "debit" || v === "credit";
}

function sanitizeExpenses(value: unknown): LocalExpense[] {
  if (!Array.isArray(value)) return [];
  const validCats = ["food", "travel", "shopping", "bills", "health", "other"];
  return value.filter(
    (e): e is LocalExpense =>
      e !== null &&
      typeof e === "object" &&
      typeof e.id === "string" &&
      typeof e.amount === "number" &&
      typeof e.note === "string" &&
      validCats.includes(e.category) &&
      isDirection(e.direction)
  );
}

export function hydrateWorkspaceSnapshot(raw: string): WorkspaceSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.capturedAt !== "number") return null;
    return {
      capturedAt: parsed.capturedAt,
      recentExpenses: sanitizeExpenses(parsed.recentExpenses),
    };
  } catch {
    return null;
  }
}

export function prepareSnapshotForPersist(snapshot: WorkspaceSnapshot): WorkspaceSnapshot {
  return {
    capturedAt: snapshot.capturedAt,
    recentExpenses: snapshot.recentExpenses.slice(0, 100),
  };
}
