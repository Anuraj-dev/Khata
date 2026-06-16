const DEV_URL = "https://tangible-finch-68.convex.cloud";
const DEV_SITE_URL = "https://tangible-finch-68.convex.site";

export const CONVEX_URL =
  (import.meta.env.VITE_CONVEX_URL as string | undefined) ?? DEV_URL;

export const CONVEX_SITE_URL =
  (import.meta.env.VITE_CONVEX_SITE_URL as string | undefined) ??
  CONVEX_URL.replace(".convex.cloud", ".convex.site") ??
  DEV_SITE_URL;
