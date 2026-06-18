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

function item(over: Partial<SmsQueueItem> = {}): SmsQueueItem {
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

describe("SmsApprovalCard", () => {
  beforeEach(() => {
    resetConvexMock();
    localStorage.clear();
    expenseStore._syncFromServer([]);
  });

  it("saves a confidently-parsed SMS with the prefilled amount/direction", async () => {
    const user = userEvent.setup();
    render(<SmsApprovalCard item={item()} />);

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

  it("lets the user complete an UNPARSED SMS by hand (the dead-end fix)", async () => {
    const user = userEvent.setup();
    // No amount and no direction parsed — exactly what reaches the queue.
    render(
      <SmsApprovalCard
        item={item({ parsedAmount: undefined, parsedDirection: undefined, parsedUpiRef: undefined })}
      />
    );

    // Save is disabled until an amount is entered — but the field exists.
    const save = screen.getByRole("button", { name: /save expense/i });
    expect(save).toBeDisabled();

    await user.type(screen.getByLabelText(/amount/i), "320");
    // Default direction is debit; switch to received to prove the toggle works.
    await user.click(screen.getByRole("button", { name: /received/i }));

    expect(save).toBeEnabled();
    await user.click(save);

    const approve = mutationOf(api.smsQueue.approve);
    expect(approve).toHaveBeenCalledTimes(1);
    expect(approve.mock.calls[0][0]).toMatchObject({
      queueId: "q1",
      amount: 32000,
      direction: "credit",
    });
  });

  it("keeps Save disabled when the amount is empty", () => {
    render(<SmsApprovalCard item={item({ parsedAmount: undefined })} />);
    expect(screen.getByRole("button", { name: /save expense/i })).toBeDisabled();
  });

  it("rejects via the reject mutation", async () => {
    const user = userEvent.setup();
    render(<SmsApprovalCard item={item()} />);
    await user.click(screen.getByRole("button", { name: /^reject$/i }));
    expect(mutationOf(api.smsQueue.reject)).toHaveBeenCalledTimes(1);
    expect(mutationOf(api.smsQueue.reject).mock.calls[0][0]).toMatchObject({ queueId: "q1" });
  });

  it("shows the raw SMS when expanded", async () => {
    const user = userEvent.setup();
    render(<SmsApprovalCard item={item()} />);
    await user.click(screen.getByRole("button", { name: /show sms/i }));
    expect(screen.getByText(/Rs 250 debited/)).toBeInTheDocument();
  });
});
