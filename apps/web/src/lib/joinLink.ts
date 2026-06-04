// Helpers for the trip-invite deep link. The token is captured from the URL
// before auth (so it survives the sign-in round-trip) and resumed afterwards.

export const PENDING_JOIN_KEY = "khata_pending_join";

export function captureJoinFromUrl(): void {
  const m = window.location.pathname.match(/^\/join\/([^/?#]+)/);
  if (m) {
    try {
      localStorage.setItem(PENDING_JOIN_KEY, m[1]);
    } catch {
      /* storage unavailable — link still works if already signed in */
    }
  }
}

export function takePendingJoin(): string | null {
  try {
    return localStorage.getItem(PENDING_JOIN_KEY);
  } catch {
    return null;
  }
}

export function clearPendingJoin(): void {
  try {
    localStorage.removeItem(PENDING_JOIN_KEY);
  } catch {
    /* noop */
  }
}

// Absolute URL to embed in the QR / copy as the invite link. Uses the deployed
// origin (VITE_APP_URL) so links work cross-device; falls back to the current
// origin for local/web use.
export function joinUrl(token: string): string {
  const configured = (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/$/, "");
  const base = configured || window.location.origin;
  return `${base}/join/${token}`;
}
