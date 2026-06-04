// better-auth and some Convex internals reference localStorage at module load time.
// React Native has no localStorage — provide a no-op in-memory shim so the import
// doesn't crash. Our auth-client.ts uses SecureStore/AsyncStorage for real persistence.
type Store = Record<string, string>;

function makeLocalStorage(): Storage {
  const store: Store = {};
  return {
    get length() { return Object.keys(store).length; },
    getItem(key: string) { return store[key] ?? null; },
    setItem(key: string, value: string) { store[key] = value; },
    removeItem(key: string) { delete store[key]; },
    clear() { for (const k of Object.keys(store)) delete store[k]; },
    key(index: number) { return Object.keys(store)[index] ?? null; },
  };
}

if (typeof globalThis.localStorage === "undefined") {
  (globalThis as unknown as { localStorage: Storage }).localStorage = makeLocalStorage();
}

if (typeof globalThis.sessionStorage === "undefined") {
  (globalThis as unknown as { sessionStorage: Storage }).sessionStorage = makeLocalStorage();
}
