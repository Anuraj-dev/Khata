import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import authConfig from "./auth.config";

// Origin of the web app. Drives Better Auth's trustedOrigins (and therefore the
// CORS allow-list applied by registerRoutes) plus the cross-domain one-time-token
// flow used by the convexClient/crossDomainClient on the web.
const siteUrl = process.env.SITE_URL ?? "http://localhost:5173";
const prodUrl = "https://khata.raja-dev.me";

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    // Convex auto-provides CONVEX_SITE_URL (the .convex.site origin) at runtime.
    baseURL: process.env.CONVEX_SITE_URL,
    database: authComponent.adapter(ctx),
    // "khata://" is the Android custom URL scheme used for the in-app OAuth
    // callback. Better Auth matches non-http schemes by prefix (url.startsWith),
    // so listing the scheme is enough to trust "khata://auth?ott=...".
    trustedOrigins: [siteUrl, prodUrl, "http://localhost:5173", "https://localhost", "khata://"],
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      },
    },
    plugins: [
      convex({
        authConfig,
        // Carry profile claims into the Convex JWT so ctx.auth.getUserIdentity()
        // exposes them (email -> identity.email, picture -> identity.pictureUrl).
        jwt: {
          definePayload: ({ user }) => ({
            email: user.email,
            name: user.name,
            picture: user.image,
          }),
        },
      }),
      crossDomain({ siteUrl }),
    ],
  });

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
  },
});
