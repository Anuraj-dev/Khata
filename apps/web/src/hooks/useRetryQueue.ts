import { useCallback, useEffect, useRef, useState } from "react";
import { classifyError, createActionId, logger } from "../lib/logger";
import { retryQueueStorage } from "../lib/retry-queue-storage";
import {
  RETRY_QUEUE_STORAGE_KEY,
  hydrateRetryQueue,
  prepareRetryQueueForPersist,
  retryBackoffMs,
} from "../lib/retry-queue-utils";
import { onLocalStateWipe } from "../lib/expenseStorage";
import type { Id } from "@convex/_generated/dataModel";

const MAX_RETRY_ATTEMPTS = 5;

export type RetryPayload =
  | {
      type: "addExpense";
      clientId: string;
      amount: number;
      note: string;
      category: string;
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
  online,
  authenticated,
  signedInUserId,
  deviceUserId,
  runRetryPayload,
  onRetryComplete,
  onRetryGiveUp,
}: {
  online: boolean;
  authenticated: boolean;
  /** Session account. Null until the auth client has a user id. */
  signedInUserId: string | null;
  /** Id noteSignedInUser has already stamped. Flush waits until these match. */
  deviceUserId: string | null;
  runRetryPayload: (payload: RetryPayload) => Promise<void>;
  onRetryComplete: (message: string) => void;
  onRetryGiveUp: (message: string) => void;
}) {
  const [retryQueue, setRetryQueue] = useState<RetryQueueItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const flushing = useRef(false);
  const generation = useRef(0);
  const queueRef = useRef<RetryQueueItem[]>([]);
  const roundsRef = useRef(0);
  const nextFlushAtRef = useRef(0);
  const onlineRef = useRef(online);
  const authRef = useRef(authenticated);
  const signedInUserIdRef = useRef(signedInUserId);
  const deviceUserIdRef = useRef(deviceUserId);
  const runRef = useRef(runRetryPayload);
  const onCompleteRef = useRef(onRetryComplete);
  const onGiveUpRef = useRef(onRetryGiveUp);
  onlineRef.current = online;
  authRef.current = authenticated;
  signedInUserIdRef.current = signedInUserId;
  deviceUserIdRef.current = deviceUserId;
  runRef.current = runRetryPayload;
  onCompleteRef.current = onRetryComplete;
  onGiveUpRef.current = onRetryGiveUp;

  const enqueueRetry = useCallback((item: Omit<RetryQueueItem, "id" | "attempts">) => {
    const next = [
      ...queueRef.current,
      { id: `${Date.now()}-${queueRef.current.length}`, attempts: 0, ...item },
    ];
    queueRef.current = next;
    logger.warn("retry_enqueued", { label: item.label, nextQueueSize: next.length });
    setRetryQueue(next);
  }, []);

  const flush = useCallback(async (): Promise<number | "skipped"> => {
    // "skipped" is not a successful round — the caller must keep the queue clock.
    if (flushing.current) return "skipped";
    const userId = signedInUserIdRef.current;
    const accountReady = authRef.current && userId !== null && userId === deviceUserIdRef.current;
    if (!onlineRef.current || !accountReady) return "skipped";
    const snapshot = [...queueRef.current];
    if (snapshot.length === 0) return 0;
    flushing.current = true;
    const gen = generation.current;
    const actionId = createActionId("retry");
    let failed = 0;
    let attempted = 0;
    const kept: RetryQueueItem[] = [];
    let aborted = false;
    try {
      for (const queued of snapshot) {
        if (generation.current !== gen) {
          aborted = true;
          break;
        }
        if (!queueRef.current.some((item) => item.id === queued.id)) continue;
        attempted += 1;
        try {
          await runRef.current(queued.payload);
          if (generation.current !== gen) {
            aborted = true;
            break;
          }
        } catch (error) {
          if (generation.current !== gen) {
            aborted = true;
            break;
          }
          failed += 1;
          const kind = classifyError(error);
          // A cafe WiFi blip is the same class that queued the add. Keep the only copy.
          const terminal = kind === "auth" || kind === "validation";
          const nextAttempts = terminal ? queued.attempts + 1 : queued.attempts;
          if (!terminal || nextAttempts < MAX_RETRY_ATTEMPTS) kept.push({ ...queued, attempts: nextAttempts });
          else onGiveUpRef.current(`Couldn't sync "${queued.label}".`);
          logger.warn("retry_item_failed", { actionId, label: queued.label, attempts: nextAttempts, errorType: kind });
        }
      }
    } finally {
      flushing.current = false;
    }
    if (aborted || generation.current !== gen) return failed;
    const snapshotIds = new Set(snapshot.map((item) => item.id));
    const arrived = queueRef.current.filter((item) => !snapshotIds.has(item.id));
    const merged = [...kept, ...arrived];
    queueRef.current = merged;
    setRetryQueue(merged);
    if (failed === 0 && attempted > 0 && arrived.length === 0) onCompleteRef.current("Sync complete");
    return failed;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const gen = generation.current;
    void retryQueueStorage.getItem(RETRY_QUEUE_STORAGE_KEY).then((raw) => {
      if (cancelled) return;
      if (generation.current !== gen) {
        setIsHydrated(true);
        return;
      }
      if (!raw) {
        setIsHydrated(true);
        return;
      }
      try {
        const loaded = hydrateRetryQueue(raw);
        queueRef.current = loaded;
        setRetryQueue(loaded);
      } catch {
        void retryQueueStorage.removeItem(RETRY_QUEUE_STORAGE_KEY);
        queueRef.current = [];
        setRetryQueue([]);
      } finally {
        if (!cancelled) setIsHydrated(true);
      }
    }).catch(() => { if (!cancelled) setIsHydrated(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => onLocalStateWipe(() => {
    generation.current += 1;
    roundsRef.current = 0;
    nextFlushAtRef.current = 0;
    queueRef.current = [];
    setRetryQueue([]);
  }), []);

  useEffect(() => {
    if (!isHydrated) return;
    if (retryQueue.length === 0) {
      void retryQueueStorage.removeItem(RETRY_QUEUE_STORAGE_KEY).catch(() => {});
      return;
    }
    const toStore = prepareRetryQueueForPersist(retryQueue);
    void retryQueueStorage.setItem(RETRY_QUEUE_STORAGE_KEY, JSON.stringify(toStore)).catch(() => {});
  }, [isHydrated, retryQueue]);

  const canFlush =
    isHydrated &&
    online &&
    authenticated &&
    signedInUserId !== null &&
    signedInUserId === deviceUserId &&
    retryQueue.length > 0;

  // One clock for the queue. A newly enqueued item does not shorten the wait.
  useEffect(() => {
    if (!canFlush) return;
    let cancelled = false;
    let timer = 0;

    const schedule = () => {
      const wait = Math.max(0, nextFlushAtRef.current - Date.now());
      timer = window.setTimeout(() => { void tick(); }, wait);
    };

    const tick = async () => {
      if (cancelled) return;
      const gen = generation.current;
      const outcome = await flush();
      if (cancelled || generation.current !== gen) return;
      if (outcome === "skipped") {
        const remaining = nextFlushAtRef.current - Date.now();
        if (remaining <= 0) {
          nextFlushAtRef.current = Date.now() + retryBackoffMs(Math.max(roundsRef.current, 1));
        }
        schedule();
        return;
      }
      const failed = outcome;
      if (queueRef.current.length === 0) {
        roundsRef.current = 0;
        nextFlushAtRef.current = 0;
        return;
      }
      if (failed > 0) {
        roundsRef.current += 1;
        nextFlushAtRef.current = Date.now() + retryBackoffMs(roundsRef.current);
      } else {
        roundsRef.current = 0;
        nextFlushAtRef.current = 0;
      }
      schedule();
    };

    schedule();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [canFlush, flush]);

  return { retryQueue, enqueueRetry };
}
