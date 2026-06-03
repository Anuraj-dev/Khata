# Khata — Milestone Plan

> Source of truth. Read this before every session. Expand milestones into micro-steps here before writing any code.

## Milestones

| # | Milestone | Status |
|---|---|---|
| M1 | Foundation & Infrastructure | ✅ Done |
| M2 | Personal Expense Core | 🔨 In Progress |
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

### Micro-steps

**Components**
- [x] `src/components/ExpenseCard.tsx` — single row: amount (red/green), note, category icon, party, time
- [x] `src/components/CategoryPicker.tsx` — horizontal scroll of category chips (food/travel/shopping/bills/health/other)
- [x] `src/components/AmountInput.tsx` — numeric keypad input that stores paise, displays ₹
- [x] `src/components/AddExpenseSheet.tsx` — bottom sheet: amount, note, category, debit/credit toggle, date
- [x] `src/components/DaySectionHeader.tsx` — date label + day total (e.g. "Today · ₹1,240 spent")
- [x] `src/components/EmptyExpenses.tsx` — empty state illustration + "Add your first expense" CTA

**Screens**
- [x] `src/screens/ExpensesScreen.tsx` — SectionList grouped by date, pull-to-refresh, today summary bar

**Hooks**
- [x] `src/hooks/useExpenseList.ts` — groups expenses by date, computes daily totals, merges local + server data

**Wire-up in App.tsx**
- [x] Open `AddExpenseSheet` when FAB pressed on expenses tab
- [x] Guest mode bypasses session gate for UI testing

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
