import { beforeEach, describe, expect, it } from "vitest";
import {
  LAST_USER_ID_KEY,
  dedupeByClientId,
  expenseStore,
  noteSignedInUser,
  wipeLocalState,
  type LocalExpense,
} from "./expenseStorage";

function row(partial: Partial<LocalExpense> & Pick<LocalExpense, "id">): LocalExpense {
  return {
    amount: 100,
    note: "tea",
    category: "food",
    source: "manual",
    direction: "debit",
    date: "2026-09-01",
    createdAt: 1,
    ...partial,
  };
}

describe("dedupeByClientId", () => {
  it("keeps the first server row when a clientId was inserted twice", () => {
    const rows = dedupeByClientId([
      { clientId: "dup", _id: "a", note: "first" },
      { clientId: "dup", _id: "b", note: "retry" },
      { clientId: "other", _id: "c", note: "kept" },
    ]);
    expect(rows.map((entry) => entry.note)).toEqual(["first", "kept"]);
  });
});

describe("ledger load", () => {
  beforeEach(() => {
    localStorage.clear();
    expenseStore.reset();
  });

  it("drops a pending row left in storage and keeps a synced one", async () => {
    localStorage.setItem(
      "khata_expenses_v1",
      JSON.stringify([
        { ...row({ id: "queued" }), pending: true },
        row({ id: "saved" }),
      ]),
    );
    await expenseStore.hydrate();
    expect(expenseStore.get().map((entry) => entry.id)).toEqual(["saved"]);
  });
});

describe("wipeLocalState", () => {
  beforeEach(() => {
    localStorage.clear();
    expenseStore.reset();
  });

  it("removes the ledger, every retry queue, and the old owner key", () => {
    localStorage.setItem("khata_expenses_v1", "ledger");
    localStorage.setItem("khata_expenses_v1:user-a", "scoped-ledger");
    localStorage.setItem("khata_web_retry_queue_v1", "queue");
    localStorage.setItem("khata_web_retry_queue_v1:user-b", "scoped-queue");
    localStorage.setItem("khata_ledger_owner_v1", "user-a");
    localStorage.setItem("khata:wasAuthed", "1");
    localStorage.setItem(LAST_USER_ID_KEY, "user-a");
    expenseStore._syncFromServer([row({ id: "visible" })]);

    wipeLocalState();

    expect(localStorage.getItem("khata_expenses_v1")).toBeNull();
    expect(localStorage.getItem("khata_expenses_v1:user-a")).toBeNull();
    expect(localStorage.getItem("khata_web_retry_queue_v1")).toBeNull();
    expect(localStorage.getItem("khata_web_retry_queue_v1:user-b")).toBeNull();
    expect(localStorage.getItem("khata_ledger_owner_v1")).toBeNull();
    expect(localStorage.getItem("khata:wasAuthed")).toBe("1");
    expect(localStorage.getItem(LAST_USER_ID_KEY)).toBe("user-a");
    expect(expenseStore.get()).toEqual([]);
  });
});

describe("noteSignedInUser", () => {
  beforeEach(() => {
    localStorage.clear();
    expenseStore.reset();
  });

  it("stamps a missing id without wiping, and wipes only when the id changes", () => {
    localStorage.setItem("khata_expenses_v1", "ledger");
    localStorage.setItem("khata_web_retry_queue_v1", "queue");
    localStorage.setItem("khata_web_retry_queue_v1:user-a", "scoped-queue");

    noteSignedInUser(null);
    expect(localStorage.getItem("khata_expenses_v1")).toBe("ledger");
    expect(localStorage.getItem(LAST_USER_ID_KEY)).toBeNull();

    noteSignedInUser("user-a");
    expect(localStorage.getItem("khata_expenses_v1")).toBe("ledger");
    expect(localStorage.getItem("khata_web_retry_queue_v1")).toBe("queue");
    expect(localStorage.getItem("khata_web_retry_queue_v1:user-a")).toBe("scoped-queue");
    expect(localStorage.getItem(LAST_USER_ID_KEY)).toBe("user-a");

    noteSignedInUser("user-a");
    expect(localStorage.getItem("khata_expenses_v1")).toBe("ledger");

    noteSignedInUser("user-b");
    expect(localStorage.getItem("khata_expenses_v1")).toBeNull();
    expect(localStorage.getItem("khata_web_retry_queue_v1")).toBeNull();
    expect(localStorage.getItem("khata_web_retry_queue_v1:user-a")).toBeNull();
    expect(localStorage.getItem(LAST_USER_ID_KEY)).toBe("user-b");
  });
});
