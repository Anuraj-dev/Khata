import { classifyError, logger } from "./logger";
import { todayIso } from "./dates";

const STORAGE_KEY = "khata_expenses_v1";

// Category id — one of the built-ins or a user-defined slug from the `categories`
// table. Kept as a plain string so custom categories round-trip without churn.
export type ExpenseCategory = string;
export type ExpenseDirection = "debit" | "credit";

export type LocalExpense = {
  id: string;
  amount: number;
  note: string;
  category: ExpenseCategory;
  source: "manual" | "sms";
  direction: ExpenseDirection;
  upiRef?: string;
  party?: string;
  udhaarPerson?: string;
  date: string;
  createdAt: number;
  syncedId?: string;
};

function makeId(): string {
  const maybe = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (maybe?.randomUUID) return maybe.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitize(value: unknown): LocalExpense[] {
  if (!Array.isArray(value)) return [];
  const validDirections: ExpenseDirection[] = ["debit", "credit"];
  const out: LocalExpense[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (
      typeof e.id !== "string" ||
      typeof e.amount !== "number" ||
      typeof e.note !== "string" ||
      typeof e.category !== "string" ||
      !validDirections.includes(e.direction as ExpenseDirection)
    ) continue;
    out.push({
      id: e.id,
      amount: e.amount,
      note: e.note,
      category: e.category as ExpenseCategory,
      source: e.source === "sms" ? "sms" : "manual",
      direction: e.direction as ExpenseDirection,
      upiRef: typeof e.upiRef === "string" ? e.upiRef : undefined,
      party: typeof e.party === "string" ? e.party : undefined,
      udhaarPerson: typeof e.udhaarPerson === "string" ? e.udhaarPerson : undefined,
      date: typeof e.date === "string" ? e.date : todayIso(),
      createdAt: typeof e.createdAt === "number" ? e.createdAt : Date.now(),
      syncedId: typeof e.syncedId === "string" ? e.syncedId : undefined,
    });
  }
  return out;
}

type Listener = () => void;

let cached: LocalExpense[] = [];
let hydrated = false;
let hydratingPromise: Promise<void> | null = null;
const listeners = new Set<Listener>();

function emit() { for (const l of listeners) l(); }

function load(): Promise<void> {
  return new Promise<void>((resolve) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) cached = sanitize(JSON.parse(raw));
    } catch (error) {
      logger.warn("expense_storage_load_failed", { errorType: classifyError(error) });
    } finally {
      hydrated = true;
      emit();
      resolve();
    }
  });
}

function ensureHydrated(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (hydratingPromise) return hydratingPromise;
  hydratingPromise = load();
  return hydratingPromise;
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch (error) {
    logger.warn("expense_storage_save_failed", { errorType: classifyError(error) });
  }
}

export type ExpenseDraft = {
  amount: number;
  note: string;
  category: ExpenseCategory;
  direction: ExpenseDirection;
  date?: string;
  party?: string;
  upiRef?: string;
  source?: "manual" | "sms";
};

export const expenseStore = {
  hydrate: ensureHydrated,
  isHydrated: () => hydrated,
  get: () => cached,
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    void ensureHydrated();
    return () => { listeners.delete(listener); };
  },
  async add(draft: ExpenseDraft): Promise<LocalExpense> {
    await ensureHydrated();
    const expense: LocalExpense = {
      id: makeId(),
      amount: draft.amount,
      note: draft.note,
      category: draft.category,
      direction: draft.direction,
      source: draft.source ?? "manual",
      date: draft.date ?? todayIso(),
      party: draft.party,
      upiRef: draft.upiRef,
      createdAt: Date.now(),
    };
    cached = [expense, ...cached];
    persist();
    emit();
    return expense;
  },
  remove(id: string): void {
    const next = cached.filter((e) => e.id !== id);
    if (next.length === cached.length) return;
    cached = next;
    persist();
    emit();
  },
  markSynced(id: string, syncedId: string): void {
    cached = cached.map((e) => e.id === id ? { ...e, syncedId } : e);
    persist();
    emit();
  },
  _syncFromServer(expenses: LocalExpense[]): void {
    cached = expenses;
    hydrated = true;
    hydratingPromise = null;
    persist();
    emit();
  },
  reset(): void {
    cached = [];
    hydrated = false;
    hydratingPromise = null;
    emit();
  },
  // Wipes local expenses AND persisted storage (used by "clear all data"). Unlike
  // reset(), it stays hydrated and clears localStorage so stale data can't reload.
  clearAllLocal(): void {
    cached = [];
    hydrated = true;
    hydratingPromise = null;
    persist();
    emit();
  },
};
