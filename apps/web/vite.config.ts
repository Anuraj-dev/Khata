import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

// Resolve convex/* from apps/web/node_modules so that the generated files
// at convex/_generated/ (outside the web app dir) can find the package.
const convexRoot = path.resolve(__dirname, "node_modules/convex");

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "convex-monorepo-resolver",
      resolveId(source, importer) {
        // Only intercept when convex/server is imported by the generated files
        // that live outside apps/web/. Normal web app imports resolve via node_modules.
        if (
          (source === "convex" || source.startsWith("convex/")) &&
          importer != null &&
          importer.includes("/convex/_generated/")
        ) {
          const sub = source.slice("convex".length); // e.g. "" | "/server" | "/react"
          const entry = sub ? `dist/esm${sub}/index.js` : "dist/esm/index.js";
          return { id: path.resolve(convexRoot, entry), external: false };
        }
      },
    },
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "Khata — Expense Tracker",
        short_name: "Khata",
        description: "Personal expense tracker and group trip splitter",
        theme_color: "#f59e0b",
        background_color: "#0a0a0b",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.convex\.cloud\/.*/i,
            handler: "NetworkFirst",
            options: { cacheName: "convex-api" },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@convex/_generated": path.resolve(__dirname, "../../convex/_generated"),
    },
  },
});
