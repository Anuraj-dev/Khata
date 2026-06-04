import { Capacitor, registerPlugin } from "@capacitor/core";

// Native plugin implemented in android/app/.../BiometricPlugin.java.
interface BiometricPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  authenticate(opts: { title?: string; subtitle?: string }): Promise<{ verified: boolean }>;
}

const Biometric = registerPlugin<BiometricPlugin>("Biometric", {
  web: {
    isAvailable: async () => ({ available: false }),
    authenticate: async () => ({ verified: false }),
  },
});

export type AuthResult = "ok" | "failed" | "unavailable";

// Asks for fingerprint / device PIN before a destructive action.
//  - "ok"          → user authenticated, proceed
//  - "failed"      → prompt shown but cancelled/failed, abort
//  - "unavailable" → no biometric/credential (or web) → caller should fall back
//                     to a typed confirmation
export async function requireDeviceAuth(opts: {
  title?: string;
  subtitle?: string;
}): Promise<AuthResult> {
  if (!Capacitor.isNativePlatform()) return "unavailable";
  try {
    const { available } = await Biometric.isAvailable();
    if (!available) return "unavailable";
    const { verified } = await Biometric.authenticate(opts);
    return verified ? "ok" : "failed";
  } catch {
    return "failed";
  }
}
