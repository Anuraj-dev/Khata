import { defineConfig } from "vitest/config";

// Pure-logic unit tests (Seam 1). DB-behaviour tests (Seam 2, convex-test) will
// be added alongside the auto-capture / udhaar-rollup work and run in the same
// suite. Kept at the repo root so `bun run test` covers convex/ helpers and any
// future app-level tests.
export default defineConfig({
  test: {
    include: ["convex/**/*.test.ts", "apps/web/src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
