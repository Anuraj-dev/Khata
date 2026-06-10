import { createAuthClient } from "better-auth/react";
import { convexClient, crossDomainClient } from "@convex-dev/better-auth/client/plugins";
import type { BetterAuthClientPlugin } from "better-auth/client";

const convexUrl = import.meta.env.VITE_CONVEX_URL ?? "";
const baseURL = convexUrl.replace(".convex.cloud", ".convex.site");

export const authClient = createAuthClient({
  baseURL,
  plugins: [convexClient(), crossDomainClient() as BetterAuthClientPlugin],
});

export type AuthSession = Awaited<ReturnType<typeof authClient.getSession>>;

// Web-only Google sign-in: redirects in-page and returns to "/" once the
// session lands. Shared by AuthScreen (web branch) and the marketing Landing
// page so there's a single web auth path. Native uses a Custom-Tab flow that
// lives in AuthScreen and is intentionally not routed through here.
export function signInWithGoogleWeb() {
  // Use the absolute origin so the crossDomain plugin redirects back to
  // wherever the app is actually running (localhost in dev, prod URL in prod)
  // instead of always using the server-configured SITE_URL.
  return authClient.signIn.social({
    provider: "google",
    callbackURL: window.location.origin + "/",
  });
}
