import { describe, it, expect } from "vitest";
import type { OptimisticLocalStore } from "convex/browser";
import type { Doc, Id } from "@convex/_generated/dataModel";
import {
  applyAddExpenseOptimistic,
  applyDeleteExpenseOptimistic,
  makeOptimisticExpense,
  type AddExpenseArgs,
} from "./optimisticExpenses";

// A minimal stand-in for Convex's OptimisticLocalStore backed by a Map keyed on
// the query args. It ignores the query ref (only listRecent is exercised), which
// is enough to assert the pure insert/remove transforms — the real fix for
// "added expense doesn't show until the server refetches".
function fakeStore(pages: { args: unknown; value: Doc<"expenses">[] | undefined }[]) {
  const map = new Map<string, { args: unknown; value: Doc<"expenses">[] | undefined }>();
  for (const p of pages) map.set(JSON.stringify(p.args), { ...p });
  const store = {
    getQuery: (_q: unknown, args: unknown) => map.get(JSON.stringify(args))?.value,
    getAllQueries: () => [...map.values()],
    setQuery: (_q: unknown, args: unknown, value: Doc<"expenses">[] | undefined) =>
      map.set(JSON.stringify(args), { args, value }),
  };
  return { store: store as unknown as OptimisticLocalStore, map };
}

const addArgs: AddExpenseArgs = {
  clientId: "c-123",
  amount: 25000,
  note: "chai",
  category: "food",
  source: "manual",
  direction: "debit",
  date: "2026-06-18",
};

function serverRow(over: Partial<Doc<"expenses">>): Doc<"expenses"> {
  return {
    _id: ("srv-" + Math.random()) as Id<"expenses">,
    _creationTime: 1,
    ownerTokenIdentifier: "u1",
    clientId: "existing",
    amount: 100,
    note: "",
    category: "other",
    source: "manual",
    direction: "debit",
    date: "2026-06-17",
    createdAt: 1,
    updatedAt: 1,
    ...over,
  } as Doc<"expenses">;
}

describe("applyAddExpenseOptimistic", () => {
  it("inserts the new expense at the top, carrying the server clientId", () => {
    const existing = [serverRow({ clientId: "old" })];
    const { store, map } = fakeStore([{ args: { limit: 100 }, value: existing }]);

    applyAddExpenseOptimistic(store, addArgs);

    const next = map.get(JSON.stringify({ limit: 100 }))!.value!;
    expect(next).toHaveLength(2);
    expect(next[0].clientId).toBe("c-123");
    expect(next[0].amount).toBe(25000);
    // Same clientId the mutation sends → server row replaces it cleanly later.
    expect(next[0].clientId).toBe(addArgs.clientId);
  });

  it("patches every loaded page (multiple history limits)", () => {
    const { store, map } = fakeStore([
      { args: { limit: 100 }, value: [] },
      { args: { limit: 200 }, value: [serverRow({})] },
    ]);
    applyAddExpenseOptimistic(store, addArgs);
    expect(map.get(JSON.stringify({ limit: 100 }))!.value![0].clientId).toBe("c-123");
    expect(map.get(JSON.stringify({ limit: 200 }))!.value![0].clientId).toBe("c-123");
  });

  it("skips pages that haven't loaded (undefined) without throwing", () => {
    const { store, map } = fakeStore([{ args: { limit: 100 }, value: undefined }]);
    expect(() => applyAddExpenseOptimistic(store, addArgs)).not.toThrow();
    expect(map.get(JSON.stringify({ limit: 100 }))!.value).toBeUndefined();
  });

  it("does not double-insert if the real row already landed with this clientId", () => {
    const existing = [serverRow({ clientId: "c-123" })];
    const { store, map } = fakeStore([{ args: { limit: 100 }, value: existing }]);
    applyAddExpenseOptimistic(store, addArgs);
    expect(map.get(JSON.stringify({ limit: 100 }))!.value).toHaveLength(1);
  });

  it("does not mutate the existing array in place", () => {
    const existing = [serverRow({ clientId: "old" })];
    const { store } = fakeStore([{ args: { limit: 100 }, value: existing }]);
    applyAddExpenseOptimistic(store, addArgs);
    expect(existing).toHaveLength(1); // original untouched → clean rollback
  });
});

describe("applyDeleteExpenseOptimistic", () => {
  it("removes the row by _id across every page", () => {
    const target = serverRow({ _id: "kill" as Id<"expenses"> });
    const keep = serverRow({ _id: "keep" as Id<"expenses"> });
    const { store, map } = fakeStore([
      { args: { limit: 100 }, value: [target, keep] },
      { args: { limit: 200 }, value: [keep, target] },
    ]);

    applyDeleteExpenseOptimistic(store, { expenseId: "kill" as Id<"expenses"> });

    expect(map.get(JSON.stringify({ limit: 100 }))!.value!.map((e) => e._id)).toEqual(["keep"]);
    expect(map.get(JSON.stringify({ limit: 200 }))!.value!.map((e) => e._id)).toEqual(["keep"]);
  });
});

describe("makeOptimisticExpense", () => {
  it("produces a row shaped like a server doc with a deterministic temp id", () => {
    const doc = makeOptimisticExpense(addArgs);
    expect(doc._id).toBe("optimistic-c-123");
    expect(doc.clientId).toBe("c-123");
    expect(doc.direction).toBe("debit");
  });
});
