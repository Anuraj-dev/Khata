# Khata — Milestone Plan

> Source of truth. Read this before every session. Expand milestones into micro-steps here before writing any code.

## Milestones

| # | Milestone | Status |
|---|---|---|
| M1 | Foundation & Infrastructure | 🔨 In Progress |
| M2 | Personal Expense Core | ⏳ Pending |
| M3 | UPI SMS Integration | ⏳ Pending |
| M4 | Group Trip Splitter | ⏳ Pending |
| M5 | Insights & Polish | ⏳ Pending |

---

## M1: Foundation & Infrastructure

**Goal:** Working Expo dev-client app that boots, shows auth screen, connects to Convex.

### Micro-steps

- [x] Create `/home/raja/Anuraj-Dev/Khata/` and initialize git
- [x] Root `package.json` (Bun workspace)
- [x] `.gitignore`
- [x] `CLAUDE.md`
- [x] `plan.md` (this file)
- [x] `.github/workflows/ci-build.yml`
- [x] `.github/workflows/ci-lint.yml`
- [x] `.github/workflows/ci-test.yml`
- [x] `.github/workflows/release-please.yml`
- [x] `release-please-config.json`
- [x] `.release-please-manifest.json`
- [x] `convex/schema.ts`
- [x] `convex/auth.ts` + `auth.config.ts` + `authHelpers.ts`
- [x] `convex/users.ts`
- [x] `convex/expenses.ts`
- [x] `convex/trips.ts`
- [x] `convex/settlements.ts`
- [x] `convex/smsQueue.ts`
- [x] `convex/crons.ts`
- [x] `convex/http.ts`
- [x] `convex/index.ts` + `convex.config.ts` + `tsconfig.json`
- [x] `apps/mobile/package.json`
- [x] `apps/mobile/app.json`
- [x] `apps/mobile/eas.json`
- [x] `apps/mobile/tsconfig.json`
- [x] `apps/mobile/babel.config.js`
- [x] `apps/mobile/metro.config.js`
- [x] `apps/mobile/index.ts`
- [x] `apps/mobile/.env.example`
- [x] `src/theme/tokens.ts`
- [x] `src/lib/logger.ts`
- [x] `src/lib/auth-client.ts`
- [x] `src/lib/convex.tsx`
- [x] `src/lib/dates.ts`
- [x] `src/lib/haptic.ts`
- [x] `src/lib/deviceIdentity.ts`
- [x] `src/lib/userPreferences.ts`
- [x] `src/lib/retry-queue-storage.ts`
- [x] `src/lib/retry-queue-utils.ts`
- [x] `src/lib/expenseStorage.ts`
- [x] `src/lib/tripStorage.ts`
- [x] `src/lib/workspace-snapshot.ts`
- [x] `src/hooks/useGoogleAuth.ts`
- [x] `src/hooks/useWorkspaceState.ts`
- [x] `src/hooks/useWorkspaceSnapshot.ts`
- [x] `src/hooks/useRetryQueue.ts`
- [x] `src/hooks/useUserPreferences.ts`
- [x] `src/hooks/useExpenseQueries.ts`
- [x] `src/hooks/useExpenseMutations.ts`
- [x] `src/hooks/useConfirm.ts`
- [x] `src/components/BootScreen.tsx`
- [x] `src/components/RootErrorBoundary.tsx`
- [x] `src/components/ScreenErrorBoundary.tsx`
- [x] `src/components/MobileAuthScreen.tsx`
- [x] `src/components/BottomTabBar.tsx`
- [x] `src/components/FAB.tsx`
- [x] `src/components/ConfirmDialog.tsx`
- [x] `apps/mobile/App.tsx`

### Verification
1. `bun install` resolves without errors
2. `bun run --cwd apps/mobile typecheck` passes
3. `bun run --cwd apps/mobile start` launches Metro
4. App shows BootScreen → Google Sign-In screen

---

## M2: Personal Expense Core

**Goal:** User can log expenses manually, view daily list, and see running totals.

*(Expand into micro-steps when M1 is complete)*

---

## M3: UPI SMS Integration

**Goal:** Android reads UPI SMS, parses transactions, presents approve/reject queue.

*(Expand into micro-steps when M2 is complete)*

---

## M4: Group Trip Splitter

**Goal:** Create trips, log shared expenses, see who owes whom, mark settled.

*(Expand into micro-steps when M3 is complete)*

---

## M5: Insights & Polish

**Goal:** Charts, monthly view, notifications, animations.

*(Expand into micro-steps when M4 is complete)*
