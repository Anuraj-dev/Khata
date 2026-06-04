import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { authClient } from "../lib/auth-client";
import { logger } from "../lib/logger";

// Custom URL scheme registered in AndroidManifest.xml. Better Auth redirects here
// after Google OAuth; the deep-link handler (useDeepLinkAuth) catches it.
const NATIVE_CALLBACK_URL = "khata://auth";

export function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);
    try {
      if (Capacitor.isNativePlatform()) {
        // Native: Google blocks OAuth inside embedded webviews, so we ask Better
        // Auth for the provider URL (disableRedirect keeps the webview put) and
        // open it in a Custom Tab. The flow returns via the khata:// deep link,
        // which useDeepLinkAuth finishes — so we do NOT clear loading on success.
        const { data, error: signInError } = await authClient.signIn.social({
          provider: "google",
          callbackURL: NATIVE_CALLBACK_URL,
          disableRedirect: true,
        });
        if (signInError || !data?.url) {
          throw new Error(signInError?.message ?? "No OAuth URL returned");
        }
        // Reset the button if the user dismisses the Custom Tab without signing in.
        const finished = await Browser.addListener("browserFinished", () => {
          setLoading(false);
          finished.remove();
        });
        await Browser.open({ url: data.url });
      } else {
        await authClient.signIn.social({ provider: "google", callbackURL: "/" });
      }
    } catch (err) {
      logger.error("google_signin_failed", { error: String(err) });
      setError("Sign-in failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div
      className="flex flex-col items-center justify-center h-full px-8 gap-8"
      style={{ background: "var(--color-bg)" }}
    >
      <div className="flex flex-col items-center gap-2">
        <span
          className="text-5xl font-bold"
          style={{ color: "var(--color-accent)", fontFamily: "var(--font-mono)" }}
        >
          ₹
        </span>
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ color: "var(--color-text-primary)" }}
        >
          Khata
        </h1>
        <p
          className="text-sm text-center"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Track expenses. Split trips. Stay sorted.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl font-medium transition-opacity disabled:opacity-60"
          style={{
            background: "var(--color-surface-elevated)",
            color: "var(--color-text-primary)",
            border: "1px solid var(--color-border-default)",
          }}
        >
          {loading ? (
            <div
              className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "var(--color-text-secondary)", borderTopColor: "transparent" }}
            />
          ) : (
            <GoogleIcon />
          )}
          <span>{loading ? "Signing in…" : "Continue with Google"}</span>
        </button>

        {error && (
          <p className="text-xs text-center" style={{ color: "var(--color-error)" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
