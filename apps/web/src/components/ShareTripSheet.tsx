import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Sheet } from "./Sheet";
import { joinUrl } from "../lib/joinLink";

type Props = {
  open: boolean;
  onClose: () => void;
  tripId: Id<"trips">;
  tripName: string;
};

function expiryLabel(expiresAt: number): string {
  const days = Math.max(0, Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000)));
  const on = new Date(expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  if (days <= 0) return "expired";
  return `expires in ${days} day${days === 1 ? "" : "s"} · ${on}`;
}

export function ShareTripSheet({ open, onClose, tripId, tripName }: Props) {
  const getOrCreateShare = useMutation(api.tripShares.getOrCreateShare);
  const [share, setShare] = useState<{ token: string; expiresAt: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Mint (or fetch the live) invite token when the sheet opens.
  useEffect(() => {
    if (!open) {
      setShare(null);
      setCopied(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getOrCreateShare({ tripId })
      .then((s) => { if (!cancelled) setShare(s); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, tripId, getOrCreateShare]);

  const url = share ? joinUrl(share.token) : "";

  async function regenerate() {
    setLoading(true);
    setCopied(false);
    try {
      setShare(await getOrCreateShare({ tripId, regenerate: true }));
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the link is still visible to copy manually */
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Share trip">
      <div className="flex flex-col items-center gap-4 px-4">
        <p className="text-sm text-center" style={{ color: "var(--color-text-secondary)" }}>
          Anyone who scans this can view <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{tripName}</span> read-only.
        </p>

        {loading || !share ? (
          <div className="flex items-center justify-center" style={{ width: 220, height: 220, color: "var(--color-text-muted)" }}>
            <span className="text-sm">Generating…</span>
          </div>
        ) : (
          <>
            <div className="rounded-2xl p-4" style={{ background: "#ffffff" }}>
              <QRCodeSVG value={url} size={192} level="M" />
            </div>
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {expiryLabel(share.expiresAt)}
            </span>

            {/* Copyable link */}
            <button
              onClick={() => void copy()}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left active:opacity-70 transition-opacity"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-subtle)" }}
            >
              <span className="flex-1 min-w-0 truncate text-xs" style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>
                {url}
              </span>
              <span className="shrink-0 text-xs font-semibold" style={{ color: "var(--color-accent)" }}>
                {copied ? "Copied!" : "Copy"}
              </span>
            </button>

            <button
              onClick={() => void regenerate()}
              className="text-xs font-semibold"
              style={{ background: "none", border: "none", color: "var(--color-text-muted)" }}
            >
              Regenerate link (invalidates the old one)
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
}
