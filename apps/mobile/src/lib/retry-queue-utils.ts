import type { RetryQueueItem } from "../hooks/useRetryQueue";

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
