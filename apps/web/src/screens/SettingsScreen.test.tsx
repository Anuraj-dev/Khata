import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@convex/_generated/api", async () => (await import("../test/convexApiMock")).apiModuleMock);
vi.mock("convex/react", async () => (await import("../test/convexMock")).convexReactMock);

const { signOut, navigate } = vi.hoisted(() => ({
  signOut: vi.fn().mockResolvedValue(undefined),
  navigate: vi.fn(),
}));

vi.mock("../lib/auth-client", () => ({
  authClient: { signOut },
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return { ...actual, useNavigate: () => navigate };
});

import { api } from "@convex/_generated/api";
import { mutationOf, resetConvexMock } from "../test/convexMock";
import { LAST_USER_ID_KEY, expenseStore, type LocalExpense } from "../lib/expenseStorage";
import { SettingsScreen } from "./SettingsScreen";

const kept: LocalExpense = {
  id: "row",
  amount: 100,
  note: "tea",
  category: "food",
  source: "manual",
  direction: "debit",
  date: "2026-09-01",
  createdAt: 1,
};

function seedDeviceState() {
  localStorage.setItem("khata_expenses_v1:user-a", "scoped-ledger");
  localStorage.setItem("khata_web_retry_queue_v1", JSON.stringify([{ id: "q" }]));
  localStorage.setItem("khata_web_retry_queue_v1:user-b", "scoped-queue");
  localStorage.setItem("khata_ledger_owner_v1", "user-a");
  localStorage.setItem("khata:wasAuthed", "1");
  localStorage.setItem(LAST_USER_ID_KEY, "user-a");
  expenseStore._syncFromServer([kept]);
}

function expectDeviceLedgerGone() {
  expect(localStorage.getItem("khata_expenses_v1")).toBeNull();
  expect(localStorage.getItem("khata_expenses_v1:user-a")).toBeNull();
  expect(localStorage.getItem("khata_web_retry_queue_v1")).toBeNull();
  expect(localStorage.getItem("khata_web_retry_queue_v1:user-b")).toBeNull();
  expect(localStorage.getItem("khata_ledger_owner_v1")).toBeNull();
  expect(localStorage.getItem("khata:wasAuthed")).toBe("1");
  expect(localStorage.getItem(LAST_USER_ID_KEY)).toBe("user-a");
  expect(expenseStore.get()).toEqual([]);
}

describe("SettingsScreen local state", () => {
  beforeEach(() => {
    localStorage.clear();
    expenseStore.reset();
    resetConvexMock();
    signOut.mockReset();
    signOut.mockResolvedValue(undefined);
    navigate.mockReset();
    mutationOf(api.expenses.clearAll).mockResolvedValue({ deleted: 2 });
  });

  it("wipes the ledger and retry queue when every expense is cleared", async () => {
    const user = userEvent.setup();
    seedDeviceState();
    render(<SettingsScreen showToast={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /clear all expenses/i }));
    await user.type(screen.getByPlaceholderText("DELETE"), "DELETE");
    await user.click(screen.getByRole("button", { name: "Erase all" }));

    expect(mutationOf(api.expenses.clearAll)).toHaveBeenCalledTimes(1);
    expectDeviceLedgerGone();
  });

  it("wipes the ledger and retry queue on sign-out", async () => {
    const user = userEvent.setup();
    seedDeviceState();
    render(<SettingsScreen showToast={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /sign out/i }));

    expect(signOut).toHaveBeenCalledTimes(1);
    expectDeviceLedgerGone();
  });
});
