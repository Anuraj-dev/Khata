import { Capacitor } from "@capacitor/core";
import { SmsReader } from "./smsPoller";

const DEVICE_SECRET_KEY = "khata_sms_device_secret";

// Stable per-install secret that maps this device to the signed-in user on the
// server. Generated once and persisted; the native background SMS receiver reads
// it (via the plugin) to authenticate its posts to the ingest endpoint.
export function getDeviceSecret(): string {
  let secret = localStorage.getItem(DEVICE_SECRET_KEY);
  if (!secret) {
    secret = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    localStorage.setItem(DEVICE_SECRET_KEY, secret);
  }
  return secret;
}

// Reads the existing secret without minting a new one — used on sign-out to know
// which device row to unbind server-side. Returns null if never registered.
export function peekDeviceSecret(): string | null {
  return localStorage.getItem(DEVICE_SECRET_KEY);
}

// Sign-out: stop the native receiver from posting (clear its config) and drop the
// local secret so the next signed-in user mints a fresh one rather than inheriting
// this device's binding. Pair with smsIngest.unregisterDevice to remove the
// server-side secret→owner mapping.
export async function clearSmsBackground(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await SmsReader.clearIngest();
    } catch {
      // Plugin not available (older build) — nothing to clear natively.
    }
  }
  localStorage.removeItem(DEVICE_SECRET_KEY);
}

// HTTP actions live on the .convex.site origin (queries/mutations are on
// .convex.cloud). Derive the ingest URL from the configured Convex URL.
function ingestUrl(): string {
  const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
  if (!convexUrl) return "";
  const site = convexUrl.replace(/\.convex\.cloud\/?$/, ".convex.site");
  return `${site.replace(/\/$/, "")}/sms/ingest`;
}

// Native-only: hand the device secret + ingest URL to the native layer so the
// background receiver can post incoming SMS. Returns the device secret (for the
// authenticated registerDevice call) or null on web.
export async function configureSmsBackground(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  const url = ingestUrl();
  if (!url) return null;
  const deviceSecret = getDeviceSecret();
  try {
    await SmsReader.configureIngest({ deviceSecret, ingestUrl: url });
  } catch {
    // Plugin not available (older build) — background ingest just won't run.
    return null;
  }
  return deviceSecret;
}
