import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
  type UserPreferences,
} from "../lib/userPreferences";

type Listener = () => void;

let cached: UserPreferences = { ...DEFAULT_PREFERENCES };
let hydrated = false;
const listeners = new Set<Listener>();

function emit() { for (const l of listeners) l(); }

async function hydrate(): Promise<void> {
  if (hydrated) return;
  cached = await loadPreferences();
  hydrated = true;
  emit();
}

void hydrate();

const prefStore = {
  get: () => cached,
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};

export function useUserPreferences() {
  const prefs = useSyncExternalStore(prefStore.subscribe, prefStore.get, prefStore.get);

  const update = useCallback(async (updates: Partial<UserPreferences>) => {
    cached = { ...cached, ...updates };
    emit();
    await savePreferences(cached);
  }, []);

  return { prefs, update };
}

export function resetPreferencesStore() {
  cached = { ...DEFAULT_PREFERENCES };
  hydrated = false;
  emit();
}
