import { defineApp } from "convex/server";
import { components } from "@convex-dev/better-auth";

const app = defineApp();
app.use(components.betterAuth);

export default app;
