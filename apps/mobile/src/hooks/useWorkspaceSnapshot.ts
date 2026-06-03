import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { classifyError, mobileLogger } from "../lib/logger";
import type { LocalExpense } from "../lib/expenseStorage";
import { hydrateWorkspaceSnapshot, prepareSnapshotForPersist, type WorkspaceSnapshot } from "../lib/workspace-snapshot";

const SNAPSHOT_KEY = "khata_workspace_snapshot_v1";

export function useWorkspaceSnapshot({
  canHydrate,
  shouldPersist,
  recentExpenses,
}: {
  canHydrate: boolean;
  shouldPersist: boolean;
  recentExpenses: LocalExpense[];
}) {
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const isClearedRef = useRef(false);

  useEffect(() => {
    if (!canHydrate) return;
    let cancelled = false;
    void AsyncStorage.getItem(SNAPSHOT_KEY).then((raw) => {
      if (cancelled || isClearedRef.current) return;
      if (raw) {
        const hydrated = hydrateWorkspaceSnapshot(raw);
        if (hydrated) setSnapshot(hydrated);
      }
    }).catch((e) => {
      mobileLogger.warn("snapshot_hydration_failed", { errorType: classifyError(e) });
    }).finally(() => {
      if (!cancelled) setIsHydrated(true);
    });
    return () => { cancelled = true; };
  }, [canHydrate]);

  useEffect(() => {
    if (!shouldPersist) return;
    const next: WorkspaceSnapshot = { capturedAt: Date.now(), recentExpenses };
    const toStore = prepareSnapshotForPersist(next);
    void AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(toStore)).catch((e) => {
      mobileLogger.warn("snapshot_persist_failed", { errorType: classifyError(e) });
    });
  }, [shouldPersist, recentExpenses]);

  const clearSnapshot = useCallback(async () => {
    isClearedRef.current = true;
    setSnapshot(null);
    try { await AsyncStorage.removeItem(SNAPSHOT_KEY); } catch {}
  }, []);

  return { snapshot, isHydrated, clearSnapshot };
}
