import type { RetryQueueItem } from "../hooks/useRetryQueue";

export const RETRY_QUEUE_STORAGE_KEY = "khata_web_retry_queue_v1";

export function hydrateRetryQueue(raw: string): RetryQueueItem[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (item): item is RetryQueueItem =>
      item !== null &&
      typeof item === "object" &&
      typeof (item as RetryQueueItem).id === "string" &&
      typeof (item as RetryQueueItem).label === "string" &&
      typeof (item as RetryQueueItem).attempts === "number" &&
      (item as RetryQueueItem).payload !== undefined
  );
}

export function prepareRetryQueueForPersist(queue: RetryQueueItem[]): RetryQueueItem[] {
  return queue.slice(0, 50);
}

const MAX_BACKOFF_MS = 60_000;

/** Wait before the next flush of the whole queue. Round 0 runs immediately. Caps at 60s. */
export function retryBackoffMs(failedRounds: number): number {
  if (failedRounds <= 0) return 0;
  const exponential = 1_000 * 2 ** (failedRounds - 1);
  return Math.min(exponential, MAX_BACKOFF_MS);
}
