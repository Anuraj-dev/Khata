import { createAuthClient } from "better-auth/react";
import { convexClient, crossDomainClient } from "@convex-dev/better-auth/client/plugins";

const convexUrl = import.meta.env.VITE_CONVEX_URL ?? "";
const baseURL = convexUrl.replace(".convex.cloud", ".convex.site");

export const authClient = createAuthClient({
  baseURL,
  plugins: [convexClient(), crossDomainClient()],
});

export type AuthSession = Awaited<ReturnType<typeof authClient.getSession>>;
