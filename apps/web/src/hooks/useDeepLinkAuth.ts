import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";

// After Google OAuth, Better Auth redirects the Custom Tab to
// khata://auth?ott=<one-time-token>. The custom-scheme intent filter routes that
// back into the app and fires appUrlOpen. We close the Custom Tab and forward the
// one-time token into the webview as /?ott=..., which is exactly what
// ConvexBetterAuthProvider reads on mount to exchange the token for a session.
export function useDeepLinkAuth() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cleanup: (() => void) | undefined;

    CapApp.addListener("appUrlOpen", async ({ url }) => {
      if (!url.startsWith("khata://")) return;

      // Dismiss the Custom Tab now that auth is done.
      try {
        await Browser.close();
      } catch {
        // Browser already closed — ignore.
      }

      try {
        const incoming = new URL(url);
        const ott = incoming.searchParams.get("ott");
        if (ott) {
          // Reload the webview at its own origin with the token. The provider's
          // mount effect picks up ?ott=, verifies it, and stores the session.
          window.location.href = "/?ott=" + encodeURIComponent(ott);
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
