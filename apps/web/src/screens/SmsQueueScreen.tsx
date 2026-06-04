import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { SmsApprovalCard } from "../components/SmsApprovalCard";

export function SmsQueueScreen() {
  const pending = useQuery(api.smsQueue.listPending);

  return (
    <div className="flex flex-col flex-1 overflow-y-auto">
      {/* Title bar */}
      <div className="px-4 pt-4 pb-2">
        <h2
          className="text-base font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          UPI Inbox
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          Review SMS-detected transactions
        </p>
      </div>

      {pending === undefined && (
        <div className="flex flex-col flex-1 items-center justify-center gap-2 pb-20">
          <span className="text-2xl">⏳</span>
          <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Loading…
          </span>
        </div>
      )}

      {pending !== undefined && pending.length === 0 && (
        <div className="flex flex-col flex-1 items-center justify-center gap-3 pb-20">
          <span className="text-4xl">📭</span>
          <span
            className="text-sm font-medium"
            style={{ color: "var(--color-text-secondary)" }}
          >
            No pending UPI SMS
          </span>
          <span
            className="text-xs text-center px-8"
            style={{ color: "var(--color-text-muted)" }}
          >
            UPI transactions detected from SMS will appear here for review.
          </span>
        </div>
      )}

      {pending && pending.length > 0 && (
        <div className="pb-6">
          {pending.map((item) => (
            <SmsApprovalCard key={item._id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
