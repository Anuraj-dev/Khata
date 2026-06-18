// Which Convex backend this build talks to.
//
// IMPORTANT: a *production* build must set VITE_CONVEX_URL to the production
// deployment. If it doesn't, we fall back to the DEV deployment below — which is
// how the live website silently ended up talking to the dev backend (and hit
// FunctionPathNotFound when dev was behind on deploys). So in a prod build with
// no explicit URL we now scream in the console instead of failing silently.
//
// Local dev (`bun run dev`) reads VITE_CONVEX_URL from apps/web/.env.local, or
// falls back to dev here — which is correct for local work.
const DEV_URL = "https://tangible-finch-68.convex.cloud";
const DEV_SITE_URL = "https://tangible-finch-68.convex.site";

const explicitUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;

if (import.meta.env.PROD && !explicitUrl) {
  // eslint-disable-next-line no-console
  console.error(
    "[khata] VITE_CONVEX_URL is not set in this PRODUCTION build — falling back " +
      "to the DEV Convex deployment. Set VITE_CONVEX_URL to the prod deployment " +
      "(formal-dove-357) in the hosting environment so the live app uses prod."
  );
}

export const CONVEX_URL = explicitUrl ?? DEV_URL;

export const CONVEX_SITE_URL =
  (import.meta.env.VITE_CONVEX_SITE_URL as string | undefined) ??
  CONVEX_URL.replace(".convex.cloud", ".convex.site") ??
  DEV_SITE_URL;
