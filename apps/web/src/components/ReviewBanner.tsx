import { useNavigate } from "react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { Capacitor } from "@capacitor/core";
import { api } from "@convex/_generated/api";
import { MailIcon, ChevronRight } from "./icons";

// Most UPI SMS auto-log straight to the list. The rare bank message we can't parse
// confidently lands in the review queue — surface it here as a contextual nudge
// instead of a permanent nav tab. Native-only; web users never have SMS.
export function ReviewBanner() {
  const navigate = useNavigate();
  const { isAuthenticated } = useConvexAuth();
  const isNative = Capacitor.isNativePlatform();
  const pending = useQuery(api.smsQueue.listPending, isNative && isAuthenticated ? {} : "skip");
  const count = pending?.length ?? 0;

  if (!isNative || count === 0) return null;

  return (
    <button
      onClick={() => navigate("/review")}
      className="flex items-center gap-3 mx-4 mt-3 px-3 py-2.5 text-left transition-colors active:[background:var(--color-accent-bg)]"
      style={{
        background: "var(--color-accent-subtle)",
        border: "1px solid var(--color-accent-dim)",
        borderRadius: "var(--radius-lg)",
        transitionDuration: "var(--dur-fast)",
        cursor: "pointer",
      }}
    >
      <span className="shrink-0" style={{ color: "var(--color-accent)" }}>
        <MailIcon size={20} strokeWidth={2} />
      </span>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
          {count} message{count > 1 ? "s" : ""} need{count > 1 ? "" : "s"} review
        </span>
        <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          We couldn't auto-read {count > 1 ? "these" : "this one"} — tap to confirm
        </span>
      </div>
      <span className="shrink-0" style={{ color: "var(--color-accent)" }}>
        <ChevronRight size={18} strokeWidth={2} />
      </span>
    </button>
  );
}
