import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";

// Registers the Better Auth `convex` plugin's JWT issuer as a custom-JWT
// provider so `ctx.auth.getUserIdentity()` validates tokens minted by the
// auth component. Issuer/JWKS are derived from CONVEX_SITE_URL at runtime.
export default {
  providers: [getAuthConfigProvider()],
};
