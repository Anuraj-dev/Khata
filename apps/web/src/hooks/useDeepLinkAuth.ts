import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";

// On Android, after Google OAuth completes, Better Auth redirects to
// https://khata.raja-dev.me?<auth-params>. The Android intent filter catches
// that URL and fires appUrlOpen. We forward the query params to window.location
// so the crossDomainClient plugin processes the session token normally.
export function useDeepLinkAuth() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cleanup: (() => void) | undefined;

    CapApp.addListener("appUrlOpen", ({ url }) => {
      try {
        const incoming = new URL(url);
        if (incoming.hostname !== "khata.raja-dev.me") return;

        // Forward every query param to window.location so the auth client sees them
        const params = incoming.searchParams.toString();
        if (params) {
          window.location.href = "/?" + params;
        }
      } catch {
        // malformed URL — ignore
      }
    }).then((handle) => {
      cleanup = () => handle.remove();
    });

    return () => cleanup?.();
  }, []);
}
