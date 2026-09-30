import { classifyError, logger } from "./logger";
import { todayIso } from "./dates";
import { RETRY_QUEUE_STORAGE_KEY } from "./retry-queue-utils";

const STORAGE_KEY = "khata_expenses_v1";
const LEDGER_OWNER_KEY = "khata_ledger_owner_v1";

/** Last authenticated account. Used only to notice a switch. */
export const LAST_USER_ID_KEY = "khata_last_user_id";

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
  counterpartyHandle?: string;
  contactId?: string;
  udhaarPerson?: string;
  date: string;
  createdAt: number;
  syncedId?: string;
};

function sanitize(value: unknown): LocalExpense[] {
  if (!Array.isArray(value)) return [];
  const validDirections: ExpenseDirection[] = ["debit", "credit"];
  const out: LocalExpense[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    // Drop rows the removed offline-ledger experiment stored before they synced.
    if (e.pending === true) continue;
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
      counterpartyHandle: typeof e.counterpartyHandle === "string" ? e.counterpartyHandle : undefined,
      contactId: typeof e.contactId === "string" ? e.contactId : undefined,
      udhaarPerson: typeof e.udhaarPerson === "string" ? e.udhaarPerson : undefined,
      date: typeof e.date === "string" ? e.date : todayIso(),
      createdAt: typeof e.createdAt === "number" ? e.createdAt : Date.now(),
      syncedId: typeof e.syncedId === "string" ? e.syncedId : undefined,
    });
  }
  return out;
}

/** Better-auth session payload → stable account id, or null when signed out. */
export function sessionUserId(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const user = (data as { user?: unknown }).user;
  if (!user || typeof user !== "object") return null;
  const id = (user as { id?: unknown }).id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

/** Home stamps rows with Convex `_creationTime`. Search orders by that, never a missing `createdAt`. */
export function expenseCreationTime(row: { _creationTime?: number }): number {
  return typeof row._creationTime === "number" && Number.isFinite(row._creationTime)
    ? row._creationTime
    : 0;
}

function dedupeByKey<T>(rows: readonly T[], keyOf: (row: T) => string): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const key = keyOf(row);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

/** First row wins. Home, Insights, and Search share this so a retried clientId cannot double-count. */
export function dedupeByClientId<T extends { clientId?: string | null; _id?: string }>(
  rows: readonly T[],
): T[] {
  return dedupeByKey(rows, (row) => (row.clientId ? `client:${row.clientId}` : `id:${row._id ?? ""}`));
}

type Listener = () => void;

let cached: LocalExpense[] = [];
let hydrated = false;
let hydratingPromise: Promise<void> | null = null;
const listeners = new Set<Listener>();
const wipeListeners = new Set<Listener>();

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
};

function isDeviceLedgerKey(key: string): boolean {
  return (
    key === STORAGE_KEY ||
    key.startsWith(`${STORAGE_KEY}:`) ||
    key === RETRY_QUEUE_STORAGE_KEY ||
    key.startsWith(`${RETRY_QUEUE_STORAGE_KEY}:`) ||
    key === LEDGER_OWNER_KEY
  );
}

export function onLocalStateWipe(listener: Listener): () => void {
  wipeListeners.add(listener);
  return () => { wipeListeners.delete(listener); };
}

/** Drop the on-device ledger and every retry queue, including owner-scoped leftovers. */
export function wipeLocalState(): void {
  try {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && isDeviceLedgerKey(key)) doomed.push(key);
    }
    for (const key of doomed) localStorage.removeItem(key);
  } catch (error) {
    logger.warn("expense_storage_save_failed", { errorType: classifyError(error) });
  }
  cached = [];
  hydrated = true;
  hydratingPromise = null;
  emit();
  for (const listener of [...wipeListeners]) listener();
}

/**
 * Remember who is signed in. No stamp yet means this install has not recorded
 * an account — keep the queue and write the id. Wipe only when the id changes.
 */
export function noteSignedInUser(userId: string | null): void {
  if (!userId) return;
  const previous = localStorage.getItem(LAST_USER_ID_KEY);
  if (previous === userId) return;
  if (previous !== null) wipeLocalState();
  localStorage.setItem(LAST_USER_ID_KEY, userId);
}
