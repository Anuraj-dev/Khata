import { defineConfig } from "vitest/config";
import path from "node:path";

// Two test projects share one `bun run test` run:
//   • convex — pure helpers (Seam 1) + convex-test DB behaviours (Seam 2), Node env.
//   • web    — React component/hook tests (Seam 3), jsdom env + RTL.
// Splitting by environment lets the money-logic tests stay fast in Node while the
// UI glue (where the add/loading/SMS bugs lived) gets a real DOM to assert against.
// JSX is transformed by vitest's esbuild (automatic runtime) — no vite react
// plugin, which avoids a vite-version peer clash with the bundled vitest vite.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "convex",
          include: ["convex/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        esbuild: { jsx: "automatic" },
        resolve: {
          alias: {
            "@convex/_generated": path.resolve(__dirname, "convex/_generated"),
          },
        },
        test: {
          name: "web",
          include: ["apps/web/src/**/*.test.{ts,tsx}"],
          environment: "jsdom",
          setupFiles: ["./apps/web/vitest.setup.ts"],
        },
      },
    ],
  },
});
