import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import QrScanner from "qr-scanner";
import { parseJoinToken } from "../lib/joinLink";

type Props = {
  open: boolean;
  onClose: () => void;
};

// Full-screen camera scanner for trip invites. Scanning a Khata QR navigates
// straight to /join/<token> inside the app — no browser hop, no App Links. Any
// other QR is ignored with a hint. Camera access is handled by getUserMedia;
// on the native build Capacitor brokers the OS permission prompt.
export function ScanInviteSheet({ open, onClose }: Props) {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !videoRef.current) return;
    let cancelled = false;

    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        const token = parseJoinToken(result.data);
        if (!token) {
          setHint("That's not a Khata invite QR.");
          return;
        }
        // Got a valid invite — stop the camera and hand off to the join flow.
        scanner.stop();
        onClose();
        navigate(`/join/${token}`);
      },
      { highlightScanRegion: true, highlightCodeOutline: true, returnDetailedScanResult: true }
    );
    scannerRef.current = scanner;

    scanner.start().catch((e: unknown) => {
      if (cancelled) return;
      const name = e instanceof Error ? e.name : "";
      setError(
        name === "NotAllowedError"
          ? "Camera access was denied. Enable the camera permission to scan."
          : "Couldn't start the camera. You can still open the invite link in a browser."
      );
    });

    return () => {
      cancelled = true;
      scanner.stop();
      scanner.destroy();
      scannerRef.current = null;
    };
  }, [open, navigate, onClose]);

  // Clear transient messages each time the sheet opens.
  useEffect(() => {
    if (open) {
      setError(null);
      setHint(null);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: "#000" }}>
      <div className="flex items-center justify-between px-4 pt-safe" style={{ minHeight: 56 }}>
        <span className="text-base font-semibold" style={{ color: "#fff" }}>
          Scan invite
        </span>
        <button
          onClick={onClose}
          aria-label="Close scanner"
          className="p-1.5 -mr-1.5 active:opacity-60"
          style={{ background: "none", border: "none", color: "#fff", fontSize: 22, lineHeight: 1 }}
        >
          ✕
        </button>
      </div>

      <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden">
        {/* qr-scanner attaches its tracking overlay to this video element */}
        <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />

        {error && (
          <div className="absolute inset-x-6 bottom-24 rounded-xl px-4 py-3 text-center text-sm" style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}>
            {error}
          </div>
        )}
      </div>

      <div className="px-6 pb-10 pt-4 text-center">
        <p className="text-sm" style={{ color: hint ? "var(--color-debit)" : "rgba(255,255,255,0.7)" }}>
          {hint ?? "Point the camera at a trip's invite QR."}
        </p>
      </div>
    </div>
  );
}
