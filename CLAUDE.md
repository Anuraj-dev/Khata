# Khata — Claude Code Configuration

## Commit rules

- Never add Claude, Anthropic, or any AI tool attribution in commits, PRs, or commit messages.
- No "Co-Authored-By", "Generated with", "AI-assisted", or similar lines anywhere in any git output.
- Create clean commits with only the actual change.
- Follow Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`

## Source of truth

- `plan.md` is the source of truth for milestone tracking.
- Read `plan.md` at the start of every session.
- When expanding a milestone into micro-steps, update `plan.md` first before writing any code.

## Project layout

- `apps/mobile/` — Expo / React Native app (dev-client build, not Expo Go)
- `convex/` — Convex backend (queries, mutations, actions, schema)

## Mobile specifics

- All Convex types are imported from `../../convex/_generated/` (relative to `apps/mobile/`).
- Env vars are prefixed `EXPO_PUBLIC_`.
- SMS reading only works on Android — iOS users use manual logging. Design UI to gracefully degrade.
- Amounts are stored in **paise** (integer) to avoid floating-point errors. Display as ₹ with decimal.
- `better-auth` session storage uses a synchronous in-memory cache backed by `expo-secure-store`. Auth-dependent code must wait for `authStorageReady` to resolve before making session calls.

## Release and versioning

- Release automation is managed by `release-please` via `.github/workflows/release-please.yml`.
- Version source: `apps/mobile/package.json` (release-please also updates `apps/mobile/app.json > $.expo.version`).
