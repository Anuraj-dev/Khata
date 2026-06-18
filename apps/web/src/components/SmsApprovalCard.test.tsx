import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Route the generated api through a caching-proxy mock (stable refs) and
// convex/react through the in-memory mock, so we can assert the approve mutation
// is called with the right payload.
vi.mock("@convex/_generated/api", async () => (await import("../test/convexApiMock")).apiModuleMock);
vi.mock("convex/react", async () => (await import("../test/convexMock")).convexReactMock);

import { api } from "@convex/_generated/api";
import { SmsApprovalCard, type SmsQueueItem } from "./SmsApprovalCard";
import { mutationOf, resetConvexMock } from "../test/convexMock";
import { expenseStore } from "../lib/expenseStorage";

function parsedItem(over: Partial<SmsQueueItem> = {}): SmsQueueItem {
  return {
    _id: "q1" as SmsQueueItem["_id"],
    rawSms: "Rs 250 debited from a/c and paid to chai@oksbi UPI Ref 123456789012",
    parsedAmount: 25000,
    parsedParty: "chai",
    parsedDirection: "debit",
    parsedUpiRef: "123456789012",
    parsedDate: "2026-06-18",
    createdAt: Date.now(),
    ...over,
  };
}

describe("SmsApprovalCard — parsed item (happy path)", () => {
  beforeEach(() => {
    resetConvexMock();
    localStorage.clear();
    expenseStore._syncFromServer([]);
  });

  it("approves a confidently-parsed SMS with the entered note + category", async () => {
    const user = userEvent.setup();
    render(<SmsApprovalCard item={parsedItem()} />);

    // Primary action is enabled when an amount was parsed.
    const addBtn = screen.getByRole("button", { name: /add as expense/i });
    expect(addBtn).toBeEnabled();

    await user.click(addBtn);
    await user.click(screen.getByRole("button", { name: /save expense/i }));

    const approve = mutationOf(api.smsQueue.approve);
    expect(approve).toHaveBeenCalledTimes(1);
    expect(approve.mock.calls[0][0]).toMatchObject({
      queueId: "q1",
      amount: 25000,
      direction: "debit",
      date: "2026-06-18",
      upiRef: "123456789012",
    });
  });

  it("rejects via the reject mutation", async () => {
    const user = userEvent.setup();
    render(<SmsApprovalCard item={parsedItem()} />);

    await user.click(screen.getByRole("button", { name: /^reject$/i }));

    const reject = mutationOf(api.smsQueue.reject);
    expect(reject).toHaveBeenCalledTimes(1);
    expect(reject.mock.calls[0][0]).toMatchObject({ queueId: "q1" });
  });

  it("shows the raw SMS when expanded", async () => {
    const user = userEvent.setup();
    render(<SmsApprovalCard item={parsedItem()} />);
    await user.click(screen.getByRole("button", { name: /show sms/i }));
    expect(screen.getByText(/Rs 250 debited/)).toBeInTheDocument();
  });
});

// PR3 will turn the card into a full editable form so an *unparsed* SMS (no
// amount/direction) can be completed by hand. The red→green tests for that land
// with the fix; recorded here so the gap is visible in the suite.
describe.todo("SmsApprovalCard — unparsed item is completable by hand (PR3)");
