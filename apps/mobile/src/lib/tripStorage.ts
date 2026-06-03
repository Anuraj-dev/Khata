import AsyncStorage from "@react-native-async-storage/async-storage";
import { classifyError, mobileLogger } from "./logger";

const STORAGE_KEY = "khata_trips_v1";

export type LocalTrip = {
  id: string;
  name: string;
  members: string[];
  startDate?: string;
  status: "active" | "settled";
  createdAt: number;
  syncedId?: string;
};

function makeId(): string {
  const maybe = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (maybe?.randomUUID) return maybe.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitize(value: unknown): LocalTrip[] {
  if (!Array.isArray(value)) return [];
  const out: LocalTrip[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.id !== "string" || typeof e.name !== "string" || !Array.isArray(e.members)) continue;
    out.push({
      id: e.id,
      name: e.name,
      members: e.members.filter((m): m is string => typeof m === "string"),
      startDate: typeof e.startDate === "string" ? e.startDate : undefined,
      status: e.status === "settled" ? "settled" : "active",
      createdAt: typeof e.createdAt === "number" ? e.createdAt : Date.now(),
      syncedId: typeof e.syncedId === "string" ? e.syncedId : undefined,
    });
  }
  return out;
}

type Listener = () => void;

let cached: LocalTrip[] = [];
let hydrated = false;
let hydratingPromise: Promise<void> | null = null;
const listeners = new Set<Listener>();

function emit() { for (const l of listeners) l(); }

async function load(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) cached = sanitize(JSON.parse(raw));
  } catch (error) {
    mobileLogger.warn("trip_storage_load_failed", { errorType: classifyError(error) });
  } finally {
    hydrated = true;
    emit();
  }
}

function ensureHydrated(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (hydratingPromise) return hydratingPromise;
  hydratingPromise = load();
  return hydratingPromise;
}

async function persist(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch (error) {
    mobileLogger.warn("trip_storage_save_failed", { errorType: classifyError(error) });
  }
}

export const tripStore = {
  hydrate: ensureHydrated,
  isHydrated: () => hydrated,
  get: () => cached,
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    void ensureHydrated();
    return () => { listeners.delete(listener); };
  },
  async add(name: string, members: string[], startDate?: string): Promise<LocalTrip> {
    await ensureHydrated();
    const trip: LocalTrip = {
      id: makeId(),
      name: name.trim(),
      members: members.map((m) => m.trim()).filter(Boolean),
      startDate,
      status: "active",
      createdAt: Date.now(),
    };
    cached = [trip, ...cached];
    void persist();
    emit();
    return trip;
  },
  remove(id: string): void {
    const next = cached.filter((t) => t.id !== id);
    if (next.length === cached.length) return;
    cached = next;
    void persist();
    emit();
  },
  markSynced(id: string, syncedId: string): void {
    cached = cached.map((t) => t.id === id ? { ...t, syncedId } : t);
    void persist();
    emit();
  },
  reset(): void {
    cached = [];
    hydrated = false;
    hydratingPromise = null;
    emit();
  },
};
