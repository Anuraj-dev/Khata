import { getAuthConfigProvider } from "@convex-dev/better-auth";
import type { AuthConfig } from "@convex-dev/better-auth/types";

export const authConfig: AuthConfig = getAuthConfigProvider();
