import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// Registers the Better Auth /api/auth/* routes on the .convex.site domain.
// `cors: true` resolves the allow-list from createAuth's trustedOrigins, so the
// web client's preflight from http://localhost:5173 succeeds.
authComponent.registerRoutes(http, createAuth, { cors: true });

export default http;
