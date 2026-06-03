import { useCallback, useEffect, useRef, useState } from "react";
import { haptic } from "../lib/haptic";
import { classifyError, createActionId, mobileLogger } from "../lib/logger";
import { retryQueueStorage } from "../lib/retry-queue-storage";
import { hydrateRetryQueue, prepareRetryQueueForPersist } from "../lib/retry-queue-utils";
import type { Id } from "../../../../convex/_generated/dataModel";

const RETRY_QUEUE_STORAGE_KEY = "khata_mobile_retry_queue_v1";
const MAX_RETRY_ATTEMPTS = 5;

export type RetryPayload =
  | {
      type: "addExpense";
      clientId: string;
      amount: number;
      note: string;
      category: "food" | "travel" | "shopping" | "bills" | "health" | "other";
      direction: "debit" | "credit";
      date: string;
      party?: string;
      upiRef?: string;
    }
  | {
      type: "deleteExpense";
      expenseId: Id<"expenses">;
    }
  | {
      type: "addTripExpense";
      clientId: string;
      tripId: Id<"trips">;
      paidBy: string;
      amount: number;
      note: string;
      splitAmong: string[];
      date: string;
    };

export type RetryQueueItem = {
  id: string;
  label: string;
  attempts: number;
  payload: RetryPayload;
};

export function useRetryQueue({
  runRetryPayload,
  onRetryComplete,
}: {
  runRetryPayload: (payload: RetryPayload) => Promise<void>;
  onRetryComplete: (message: string) => void;
}) {
  const [retryQueue, setRetryQueue] = useState<RetryQueueItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const lastLogMsRef = useRef<number>(0);

  const enqueueRetry = useCallback((item: Omit<RetryQueueItem, "id" | "attempts">) => {
    setRetryQueue((current) => {
      const next = [...current, { id: `${Date.now()}-${current.length}`, attempts: 0, ...item }];
      mobileLogger.warn("retry_enqueued", { label: item.label, nextQueueSize: next.length });
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void retryQueueStorage.getItem(RETRY_QUEUE_STORAGE_KEY).then((raw) => {
      if (cancelled) return;
      if (!raw) { setIsHydrated(true); return; }
      try {
        setRetryQueue(hydrateRetryQueue(raw));
      } catch {
        void retryQueueStorage.removeItem(RETRY_QUEUE_STORAGE_KEY);
      } finally {
        if (!cancelled) setIsHydrated(true);
      }
    }).catch(() => { if (!cancelled) setIsHydrated(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    const toStore = prepareRetryQueueForPersist(retryQueue);
    void retryQueueStorage.setItem(RETRY_QUEUE_STORAGE_KEY, JSON.stringify(toStore)).catch(() => {});

    if (!__DEV__) return;
    const now = Date.now();
    if (now - lastLogMsRef.current < 2000) return;
    lastLogMsRef.current = now;
    mobileLogger.debug("retry_queue_persisted", { queueSize: retryQueue.length });
  }, [isHydrated, retryQueue]);

  const retryQueuedMutations = useCallback(async () => {
    if (!retryQueue.length) return;
    const actionId = createActionId("retry");
    const snapshot = [...retryQueue];
    setRetryQueue([]);
    let failed = 0;

    for (const queued of snapshot) {
      try {
        await runRetryPayload(queued.payload);
      } catch {
        failed += 1;
        const nextAttempts = queued.attempts + 1;
        if (nextAttempts < MAX_RETRY_ATTEMPTS) {
          setRetryQueue((c) => [...c, { ...queued, attempts: nextAttempts }]);
        }
        mobileLogger.warn("retry_item_failed", { actionId, label: queued.label, attempts: nextAttempts });
      }
    }

    if (failed === 0) {
      onRetryComplete("Sync complete");
      haptic.success();
    }
  }, [onRetryComplete, retryQueue, runRetryPayload]);

  return { retryQueue, enqueueRetry, retryQueuedMutations };
}
