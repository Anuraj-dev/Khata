import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { act } from "react";

vi.mock("@convex/_generated/api", async () => (await import("../test/convexApiMock")).apiModuleMock);
vi.mock("convex/react", async () => (await import("../test/convexMock")).convexReactMock);

import { api } from "@convex/_generated/api";
import { mutationOf, resetConvexMock } from "../test/convexMock";
import { useExpenseMutations } from "./useExpenseMutations";

const draft = {
  amount: 2500,
  note: "tea",
  category: "food",
  direction: "debit" as const,
  date: "2026-09-01",
  party: "Cafe",
  upiRef: "upi-1",
};

describe("useExpenseMutations", () => {
  beforeEach(() => {
    resetConvexMock();
  });

  it("queues the same clientId the add mutation sent", async () => {
    const addExpense = mutationOf(api.expenses.addExpense);
    addExpense.mockRejectedValue(new Error("Failed to fetch"));
    const enqueueRetry = vi.fn();
    const showToast = vi.fn();
    const { result } = renderHook(() => useExpenseMutations({ showToast, enqueueRetry }));

    await act(async () => {
      await result.current.addExpense(draft);
    });

    expect(addExpense).toHaveBeenCalledTimes(1);
    const sent = addExpense.mock.calls[0][0];
    expect(enqueueRetry).toHaveBeenCalledTimes(1);
    expect(enqueueRetry.mock.calls[0][0].payload).toEqual({
      type: "addExpense",
      clientId: sent.clientId,
      amount: sent.amount,
      note: sent.note,
      category: sent.category,
      direction: sent.direction,
      date: sent.date,
      party: sent.party,
      upiRef: sent.upiRef,
    });
    expect(showToast).toHaveBeenCalledWith({
      kind: "error",
      message: "Offline. Expense queued for sync.",
    });
  });

  it("does not queue an add that failed for a non-network reason", async () => {
    const addExpense = mutationOf(api.expenses.addExpense);
    addExpense.mockRejectedValue(new Error("validation failed"));
    const enqueueRetry = vi.fn();
    const { result } = renderHook(() =>
      useExpenseMutations({ showToast: vi.fn(), enqueueRetry }),
    );

    await act(async () => {
      await result.current.addExpense(draft);
    });

    expect(enqueueRetry).not.toHaveBeenCalled();
  });
});
