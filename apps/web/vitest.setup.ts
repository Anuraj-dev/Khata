import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Unmount React trees between tests so DOM assertions never leak across cases.
afterEach(() => {
  cleanup();
});

// Node exposes `localStorage` as a getter that yields undefined unless
// `--localstorage-file` is set, so `localStorage.clear()` throws in web tests.
// Install one in-memory Storage on both globals when `clear` is missing.
installMemoryLocalStorage();

// jsdom doesn't implement matchMedia; a few components read it defensively.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

function localStorageClearMissing(): boolean {
  // Node's lazy getter warns and returns undefined unless --localstorage-file
  // is set. Detect that getter without reading it so the suite stays quiet.
  const desc = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  if (desc?.get && String(desc.get).includes("internal/webstorage")) {
    const flagged = [...process.execArgv, ...process.argv].some((arg) =>
      arg.startsWith("--localstorage-file"),
    );
    if (!flagged) return true;
  }
  try {
    return typeof globalThis.localStorage?.clear !== "function";
  } catch {
    return true;
  }
}

function createMemoryStorage(): Storage {
  const buckets = new Map<string, string>();
  return {
    get length() {
      return buckets.size;
    },
    clear() {
      buckets.clear();
    },
    getItem(key: string) {
      const value = buckets.get(String(key));
      return value === undefined ? null : value;
    },
    key(index: number) {
      return Array.from(buckets.keys())[index] ?? null;
    },
    removeItem(key: string) {
      buckets.delete(String(key));
    },
    setItem(key: string, value: string) {
      buckets.set(String(key), String(value));
    },
  };
}

function installOn(target: object, storage: Storage): void {
  try {
    Object.defineProperty(target, "localStorage", {
      configurable: true,
      enumerable: true,
      writable: true,
      value: storage,
    });
  } catch {
    try {
      (target as { localStorage: Storage }).localStorage = storage;
    } catch {
      // Host refused the override. Tests that need clear() will still fail.
    }
  }
}

function installMemoryLocalStorage(): void {
  if (!localStorageClearMissing()) return;
  const storage = createMemoryStorage();
  installOn(globalThis, storage);
  if (typeof window !== "undefined") installOn(window, storage);
}
