import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { authClient } from "../lib/auth-client";

// The crossDomain client plugin's endpoints aren't reflected in the inferred
// authClient type (its $InferServerPlugin is empty), so narrow to what we call.
type CrossDomainAuthClient = {
  crossDomain: {
    oneTimeToken: {
      verify: (args: { token: string }) => Promise<{
        data?: { session?: { token: string } } | null;
      }>;
    };
  };
  updateSession: () => void;
};

// After Google OAuth, Better Auth redirects the Custom Tab to
// khata://auth?ott=<one-time-token>. The custom-scheme intent filter routes that
// back into the app and fires appUrlOpen. We close the Custom Tab and exchange
// the one-time token for a session in place — the same verify/getSession/
// updateSession dance ConvexBetterAuthProvider runs on mount, but without a full
// webview reload (which would cold-start the bundle a second time on first login).
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
        if (!ott) return;

        const xdomain = authClient as unknown as CrossDomainAuthClient;
        const result = await xdomain.crossDomain.oneTimeToken.verify({ token: ott });
        const session = result.data?.session;
        if (session) {
          await authClient.getSession({
            fetchOptions: { headers: { Authorization: `Bearer ${session.token}` } },
          });
          // Notify useSession so the provider re-renders as authenticated.
          xdomain.updateSession();
        }
      } catch {
        // Exchange failed (expired/replayed token, transient network). Fall back
        // to a reload so the provider's own mount-time handler can retry.
        try {
          const ott = new URL(url).searchParams.get("ott");
          if (ott) window.location.href = "/?ott=" + encodeURIComponent(ott);
        } catch {
          // malformed URL — ignore
        }
      }
    }).then((handle) => {
      cleanup = () => handle.remove();
    });

    return () => cleanup?.();
  }, []);
}
