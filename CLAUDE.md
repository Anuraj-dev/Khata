# Khata — Claude Code Configuration

## Commit rules

- Never add Claude, Anthropic, or any AI tool attribution in commits, PRs, or commit messages.
- No "Co-Authored-By", "Generated with", "AI-assisted", or similar lines anywhere in any git output.
- Create clean commits with only the actual change.
- DOn't commit without permission of the user - Raja
- Follow Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`

## Source of truth

- `plan.md` is the source of truth for milestone tracking.
- Read `plan.md` at the start of every session.
- When expanding a milestone into micro-steps, update `plan.md` first before writing any code.

## Project layout

- `apps/web/` — Vite + React PWA (primary target, active development)
- `apps/mobile/` — Expo / React Native app (abandoned, left in place)
- `convex/` — Convex backend (queries, mutations, actions, schema)

## Web PWA specifics

- Convex types are imported from `../../convex/_generated/` (relative to `apps/web/`).
- Browser-exposed env vars are prefixed `VITE_`. The Convex development
  deployment is pinned in `apps/web/src/lib/deployment.ts`.
- SMS reading is gated behind `Capacitor.isNativePlatform()` — web users log manually. Never show SMS UI on web.
- Amounts are stored in **paise** (integer) to avoid floating-point errors. Display as ₹ with decimal.
- `better-auth` session storage uses the browser's default cookie/localStorage — no SecureStore or in-memory hydration needed on web.
- Tailwind CSS v4 — use `@import "tailwindcss"` in CSS, no `tailwind.config.js`. Theme tokens live in `src/index.css` as CSS custom properties.

## Convex deployments (dev vs prod) — read this before touching the backend

There are **two** Convex backends:

- **dev** — `tangible-finch-68` (`.env.local` → `CONVEX_DEPLOYMENT=dev:tangible-finch-68`). Used by local `bun run dev`. Deploy to it with `bunx convex dev --once`.
- **prod** — `formal-dove-357`. Used by the released app. The APK build pins it (`build-apk.yml` sets `VITE_CONVEX_URL`). The web app should also point here in production via `VITE_CONVEX_URL`.

**Code in `convex/` does not run until it is deployed to a deployment.** The frontend's `_generated/api` reflects local code; if the client calls a function the *deployment* hasn't received, the WebSocket drops with `FunctionPathNotFound` and every live query stalls through reconnect backoff. This has bitten the project repeatedly (M6.2, M7, the June 2026 outage where M11 functions were merged but never deployed, so the website — silently on dev — broke).

**Rules:**
- A merge to `main` auto-deploys the backend to **prod** via `.github/workflows/convex-deploy.yml` (needs repo secret `CONVEX_DEPLOY_KEY`). Don't rely on remembering to deploy by hand.
- The production web build **must** set `VITE_CONVEX_URL` to the prod URL. `deployment.ts` falls back to dev only as a last resort and logs a loud error in prod builds if it has to.
- After changing `convex/` and testing on dev, the durable path is to merge → auto-deploy. For a hotfix you can `bunx convex deploy` (prod) manually, but that's the exception.

## Release and versioning

- Release automation is managed by `release-please` via `.github/workflows/release-please.yml`.
- Version source: `apps/web/package.json` (the web PWA is the primary release target). Tags are `vX.Y.Z`. The abandoned `apps/mobile` is no longer tracked.
- The workflow needs the repo setting **Settings → Actions → General → Workflow permissions → "Allow GitHub Actions to create and approve pull requests"** enabled, or release-please can't open its release PR.
