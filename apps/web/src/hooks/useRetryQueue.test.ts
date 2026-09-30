import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { LAST_USER_ID_KEY, expenseStore, noteSignedInUser, wipeLocalState, type LocalExpense } from "../lib/expenseStorage";
import { RETRY_QUEUE_STORAGE_KEY, retryBackoffMs } from "../lib/retry-queue-utils";
import { classifyError } from "../lib/logger";
import { useRetryQueue, type RetryPayload } from "./useRetryQueue";

const payload: RetryPayload = {
  type: "addExpense",
  clientId: "c-pending",
  amount: 100,
  note: "tea",
  category: "food",
  direction: "debit",
  date: "2026-09-01",
};

const queued = {
  id: "q1",
  label: "Add ₹1.00 expense",
  attempts: 0,
  payload,
};

type Gate = {
  online: boolean;
  authenticated: boolean;
  signedInUserId?: string | null;
  deviceUserId?: string | null;
};

function renderQueue(
  props: Gate,
  runRetryPayload = vi.fn().mockRejectedValue(new Error("offline")),
  onRetryGiveUp = vi.fn(),
) {
  const hook = renderHook(
    (current: Gate) =>
      useRetryQueue({
        online: current.online,
        authenticated: current.authenticated,
        signedInUserId: current.signedInUserId === undefined ? "user-a" : current.signedInUserId,
        deviceUserId:
          current.deviceUserId === undefined
            ? current.signedInUserId === undefined
              ? "user-a"
              : current.signedInUserId
            : current.deviceUserId,
        runRetryPayload,
        onRetryComplete: () => {},
        onRetryGiveUp,
      }),
    { initialProps: props },
  );
  return { ...hook, runRetryPayload, onRetryGiveUp };
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

/** Hydration schedules the first flush on a later timer tick. */
async function flushNow() {
  await advance(0);
  await advance(0);
}

describe("retryBackoffMs", () => {
  it("waits longer after each failed round and then stays capped", () => {
    expect(retryBackoffMs(0)).toBe(0);
    expect(retryBackoffMs(1)).toBe(1_000);
    expect(retryBackoffMs(2)).toBe(2_000);
    expect(retryBackoffMs(3)).toBe(4_000);
    expect(retryBackoffMs(4)).toBe(8_000);
    expect(retryBackoffMs(5)).toBe(16_000);
    expect(retryBackoffMs(6)).toBe(32_000);
    expect(retryBackoffMs(7)).toBe(60_000);
    expect(retryBackoffMs(9)).toBe(60_000);
  });
});

describe("useRetryQueue", () => {
  beforeEach(() => {
    localStorage.clear();
    expenseStore.reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("flushes only when the queue has work, the device is online, and Convex is authenticated", async () => {
    localStorage.setItem(RETRY_QUEUE_STORAGE_KEY, JSON.stringify([queued]));
    const offline = renderQueue({ online: false, authenticated: true });
    await advance(5_000);
    expect(offline.runRetryPayload).not.toHaveBeenCalled();
    offline.unmount();

    const signedOut = renderQueue({ online: true, authenticated: false });
    await advance(5_000);
    expect(signedOut.runRetryPayload).not.toHaveBeenCalled();

    signedOut.rerender({ online: true, authenticated: true });
    await flushNow();
    expect(signedOut.runRetryPayload).toHaveBeenCalledTimes(1);
    expect(signedOut.runRetryPayload).toHaveBeenCalledWith(payload);
  });

  it("does not reset the queue backoff when a new item is enqueued", async () => {
    localStorage.setItem(RETRY_QUEUE_STORAGE_KEY, JSON.stringify([queued]));
    const { result, runRetryPayload } = renderQueue({ online: true, authenticated: true });

    await flushNow();
    expect(runRetryPayload).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.enqueueRetry({
        label: "second",
        payload: { ...payload, clientId: "c-second" },
      });
    });
    await advance(999);
    expect(runRetryPayload).toHaveBeenCalledTimes(1);

    await advance(1);
    expect(runRetryPayload).toHaveBeenCalledTimes(3);
    expect(runRetryPayload.mock.calls.map((call) => call[0].clientId)).toEqual([
      "c-pending",
      "c-pending",
      "c-second",
    ]);
  });

  it("retries a network failure without giving up and caps the wait at 60s", async () => {
    const offline = new Error("Failed to fetch");
    expect(classifyError(offline)).toBe("network");
    localStorage.setItem(RETRY_QUEUE_STORAGE_KEY, JSON.stringify([queued]));
    const { result, runRetryPayload, onRetryGiveUp } = renderQueue(
      { online: true, authenticated: true },
      vi.fn().mockRejectedValue(offline),
    );

    await flushNow();
    expect(runRetryPayload).toHaveBeenCalledTimes(1);
    const waits = [1_000, 2_000, 4_000, 8_000, 16_000, 32_000];
    for (let i = 0; i < waits.length; i += 1) {
      await advance(waits[i]);
      expect(runRetryPayload).toHaveBeenCalledTimes(i + 2);
    }

    await advance(59_999);
    expect(runRetryPayload).toHaveBeenCalledTimes(waits.length + 1);
    await advance(1);
    expect(runRetryPayload).toHaveBeenCalledTimes(waits.length + 2);
    expect(onRetryGiveUp).not.toHaveBeenCalled();
    expect(result.current.retryQueue).toEqual([queued]);
  });

  it("toasts and drops an add after 5 server rejections without touching the ledger", async () => {
    const rejected = Object.assign(new Error("Unauthorized"), { name: "ConvexError" });
    expect(classifyError(rejected)).toBe("auth");
    const kept: LocalExpense = {
      id: "kept",
      amount: 100,
      note: "saved",
      category: "food",
      source: "manual",
      direction: "debit",
      date: "2026-09-01",
      createdAt: 1,
    };
    expenseStore._syncFromServer([kept]);
    localStorage.setItem(RETRY_QUEUE_STORAGE_KEY, JSON.stringify([queued]));
    const { result, runRetryPayload, onRetryGiveUp } = renderQueue(
      { online: true, authenticated: true },
      vi.fn().mockRejectedValue(rejected),
    );

    await flushNow();
    expect(runRetryPayload).toHaveBeenCalledTimes(1);
    const waits = [1_000, 2_000, 4_000, 8_000];
    for (let i = 0; i < waits.length; i += 1) {
      await advance(waits[i]);
      expect(runRetryPayload).toHaveBeenCalledTimes(i + 2);
    }

    expect(onRetryGiveUp).toHaveBeenCalledTimes(1);
    expect(onRetryGiveUp).toHaveBeenCalledWith('Couldn\'t sync "Add ₹1.00 expense".');
    expect(result.current.retryQueue).toEqual([]);
    expect(expenseStore.get()).toEqual([kept]);
  });

  it("does not restore an in-flight add after local state is wiped", async () => {
    let rejectFlush: (error: Error) => void = () => {};
    const runRetryPayload = vi.fn().mockImplementation(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectFlush = reject;
        }),
    );
    localStorage.setItem(RETRY_QUEUE_STORAGE_KEY, JSON.stringify([queued]));
    const { result } = renderQueue({ online: true, authenticated: true }, runRetryPayload);

    await flushNow();
    expect(runRetryPayload).toHaveBeenCalledTimes(1);

    act(() => {
      wipeLocalState();
    });
    expect(result.current.retryQueue).toEqual([]);

    await act(async () => {
      rejectFlush(new Error("offline"));
    });
    await advance(5_000);

    expect(result.current.retryQueue).toEqual([]);
    expect(runRetryPayload).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(RETRY_QUEUE_STORAGE_KEY)).toBeNull();
  });

  it("does not flush until the signed-in id matches the stamp, then drops the previous account's queue", async () => {
    localStorage.setItem(LAST_USER_ID_KEY, "user-a");
    localStorage.setItem(RETRY_QUEUE_STORAGE_KEY, JSON.stringify([queued]));
    const switched = renderQueue({
      online: true,
      authenticated: true,
      signedInUserId: "user-b",
      deviceUserId: "user-a",
    });

    await advance(5_000);
    expect(switched.runRetryPayload).not.toHaveBeenCalled();

    act(() => {
      noteSignedInUser("user-b");
    });
    switched.rerender({
      online: true,
      authenticated: true,
      signedInUserId: "user-b",
      deviceUserId: "user-b",
    });
    await flushNow();
    expect(switched.runRetryPayload).not.toHaveBeenCalled();
    expect(localStorage.getItem(RETRY_QUEUE_STORAGE_KEY)).toBeNull();
    switched.unmount();

    localStorage.removeItem(LAST_USER_ID_KEY);
    localStorage.setItem(RETRY_QUEUE_STORAGE_KEY, JSON.stringify([queued]));
    const upgrading = renderQueue({
      online: true,
      authenticated: true,
      signedInUserId: "user-a",
      deviceUserId: null,
    });
    await advance(5_000);
    expect(upgrading.runRetryPayload).not.toHaveBeenCalled();
    expect(localStorage.getItem(RETRY_QUEUE_STORAGE_KEY)).not.toBeNull();

    act(() => {
      noteSignedInUser("user-a");
    });
    upgrading.rerender({
      online: true,
      authenticated: true,
      signedInUserId: "user-a",
      deviceUserId: "user-a",
    });
    await flushNow();
    expect(upgrading.runRetryPayload).toHaveBeenCalledTimes(1);
    expect(upgrading.runRetryPayload).toHaveBeenCalledWith(payload);
  });

  it("keeps the queue backoff when a flush is skipped because another is in flight", async () => {
    let rejectSecond: (error: Error) => void = () => {};
    let calls = 0;
    const runRetryPayload = vi.fn().mockImplementation(
      () => {
        calls += 1;
        if (calls === 1) return Promise.reject(new Error("offline"));
        return new Promise<void>((_resolve, reject) => {
          rejectSecond = reject;
        });
      },
    );
    localStorage.setItem(RETRY_QUEUE_STORAGE_KEY, JSON.stringify([queued]));
    const { rerender } = renderQueue({ online: true, authenticated: true }, runRetryPayload);

    await flushNow();
    expect(calls).toBe(1);

    await advance(1_000);
    expect(calls).toBe(2);

    rerender({ online: false, authenticated: true });
    rerender({ online: true, authenticated: true });
    await advance(0);
    await advance(999);
    expect(calls).toBe(2);

    await act(async () => {
      rejectSecond(new Error("offline"));
    });
    await advance(0);
    expect(calls).toBe(2);

    await advance(1_000);
    expect(calls).toBe(3);
  });
});
