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
- Env vars are prefixed `VITE_` (e.g. `VITE_CONVEX_URL`).
- SMS reading is gated behind `Capacitor.isNativePlatform()` — web users log manually. Never show SMS UI on web.
- Amounts are stored in **paise** (integer) to avoid floating-point errors. Display as ₹ with decimal.
- `better-auth` session storage uses the browser's default cookie/localStorage — no SecureStore or in-memory hydration needed on web.
- Tailwind CSS v4 — use `@import "tailwindcss"` in CSS, no `tailwind.config.js`. Theme tokens live in `src/index.css` as CSS custom properties.

## Release and versioning

- Release automation is managed by `release-please` via `.github/workflows/release-please.yml`.
- Version source: `apps/web/package.json` (the web PWA is the primary release target). Tags are `vX.Y.Z`. The abandoned `apps/mobile` is no longer tracked.
- The workflow needs the repo setting **Settings → Actions → General → Workflow permissions → "Allow GitHub Actions to create and approve pull requests"** enabled, or release-please can't open its release PR.
