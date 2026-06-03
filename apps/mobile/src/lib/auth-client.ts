import { createAuthClient } from "better-auth/react";
import { convexClient, crossDomainClient } from "@convex-dev/better-auth/client/plugins";
import * as SecureStore from "expo-secure-store";
import { mobileLogger } from "./logger";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL ?? "";
const baseURL = convexUrl.replace(".convex.cloud", ".convex.site");

// Synchronous in-memory cache backed by SecureStore. Auth calls are sync-first
// so the cache must be populated before any session reads happen.
const memCache = new Map<string, string>();
let storageReady!: () => void;

export const authStorageReady: Promise<void> = new Promise((resolve) => {
  storageReady = resolve;
});

async function hydrateCache(): Promise<void> {
  try {
    const keys = ["khata_session", "khata_session_data"];
    await Promise.all(
      keys.map(async (key) => {
        const val = await SecureStore.getItemAsync(key);
        if (val) memCache.set(key, val);
      })
    );
  } catch (error) {
    mobileLogger.warn("auth_cache_hydration_failed", { error: String(error) });
  } finally {
    storageReady();
  }
}

void hydrateCache();

const authStorage = {
  getItem: (key: string): string | null => memCache.get(key) ?? null,
  setItem: (key: string, value: string): void => {
    memCache.set(key, value);
    void SecureStore.setItemAsync(key, value).catch((e) =>
      mobileLogger.warn("auth_storage_set_failed", { key, error: String(e) })
    );
  },
  removeItem: (key: string): void => {
    memCache.delete(key);
    void SecureStore.deleteItemAsync(key).catch((e) =>
      mobileLogger.warn("auth_storage_remove_failed", { key, error: String(e) })
    );
  },
};

export const authClient = createAuthClient({
  baseURL,
  plugins: [convexClient(), crossDomainClient()],
  storage: authStorage,
});

export function hasCachedAuthSessionHint(): boolean {
  return memCache.has("khata_session");
}
