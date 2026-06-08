import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// Registers the Better Auth /api/auth/* routes on the .convex.site domain.
// `cors: true` resolves the allow-list from createAuth's trustedOrigins, so the
// web client's preflight from http://localhost:5173 succeeds.
authComponent.registerRoutes(http, createAuth, { cors: true });

// Background SMS ingest. The native BroadcastReceiver posts incoming UPI SMS here
// even while the app is closed; auth is via the per-device secret (no session
// token in a background receiver), resolved to the owner inside the mutation.
http.route({
  path: "/sms/ingest",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let payload: {
      deviceSecret?: string;
      sender?: string;
      body?: string;
      timestamp?: number;
    };
    try {
      payload = await request.json();
    } catch {
      return new Response("Bad request", { status: 400 });
    }
    const { deviceSecret, sender, body, timestamp } = payload;
    if (!deviceSecret || typeof body !== "string") {
      return new Response("Bad request", { status: 400 });
    }

    const result = await ctx.runMutation(internal.smsIngest.ingestFromDevice, {
      deviceSecret,
      sender: sender ?? "",
      body,
      timestamp: typeof timestamp === "number" ? timestamp : Date.now(),
    });

    if (!result.ok) return new Response("Unauthorized", { status: 401 });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
