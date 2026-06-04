# Khata — Milestone Plan

> Source of truth. Read this before every session. Expand milestones into micro-steps here before writing any code.

## Milestones

| # | Milestone | Status |
|---|---|---|
| M1 | Foundation & Infrastructure (Expo — abandoned) | ✅ Done |
| M1-Web | PWA Foundation | 🔨 In Progress |
| M2 | Personal Expense Core (Expo — abandoned) | ✅ Done |
| M2-Web | Personal Expense Core (PWA) | ✅ Done |
| M3 | UPI SMS via Capacitor wrapper | 🔨 In Progress |
| M4 | Group Trip Splitter | ⏳ Pending |
| M5 | Insights & Polish | ⏳ Pending |

> **Pivot note:** `apps/mobile/` is abandoned due to Expo dev-client USB debugging errors and Android Studio unavailability. All new work targets `apps/web/` (Vite + React PWA). The Convex backend is unchanged. UPI SMS (M3) will use a thin Capacitor wrapper around the same web app.

---

## M1-Web: PWA Foundation

**Goal:** Installable PWA that boots, shows Google Sign-In, connects to Convex.

### Micro-steps

- [x] Update `plan.md` to reflect PWA pivot
- [x] Update `CLAUDE.md` to reflect PWA pivot
- [x] Scaffold `apps/web/` — `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`
- [x] Add Tailwind CSS v4 + CSS custom properties theme
- [x] Add `vite-plugin-pwa` — manifest (name, icons, theme_color, display: standalone)
- [x] Add React Router v7 — layout route with bottom nav + outlet
- [x] `src/lib/convex.tsx` — ConvexClientProvider (no RN imports)
- [x] `src/lib/auth-client.ts` — better-auth web adapter (no SecureStore)
- [x] `src/lib/logger.ts` — port (remove `__DEV__`, use `import.meta.env.DEV`)
- [x] `src/lib/dates.ts` — copy as-is
- [x] `src/lib/expenseStorage.ts` — localStorage version (same API as mobile)
- [x] `src/lib/retry-queue-storage.ts` — localStorage wrapper
- [x] `src/lib/retry-queue-utils.ts` — copy as-is
- [x] `src/components/BootScreen.tsx` — loading spinner (Tailwind)
- [x] `src/components/AuthScreen.tsx` — Google Sign-In button (web OAuth)
- [x] `src/components/BottomNavBar.tsx` — fixed bottom nav, 3 tabs
- [x] `src/components/RootErrorBoundary.tsx` — error boundary
- [x] `src/screens/ExpensesScreen.tsx` — stub (empty state)
- [x] `src/screens/TripsScreen.tsx` — stub
- [x] `src/screens/InsightsScreen.tsx` — stub
- [x] `src/main.tsx` + `src/App.tsx` — root with providers + router
- [x] `apps/web/.env.example` + `apps/web/.env.local`
- [x] Update root `package.json` scripts to include web commands
- [x] `bun install` — verified, 428 packages, no errors
- [ ] Google OAuth client ID configured → Google Sign-In works end-to-end
- [ ] Verified installable in browser (Add to Home Screen)

### Verification
1. `bun install` resolves without errors
2. `bun run --cwd apps/web dev` opens in browser
3. App shows loading → Google Sign-In screen
4. Convex connects (check network tab)
5. App is installable (Chrome → Install app prompt or Add to Home Screen)

---

## M2-Web: Personal Expense Core

**Goal:** User can log expenses manually, view daily list, running totals.

### Micro-steps

- [x] `src/components/ExpenseCard.tsx` — row: category icon, note, time, amount (red/green)
- [x] `src/components/DaySectionHeader.tsx` — date label + day totals
- [x] `src/components/EmptyExpenses.tsx` — empty state with CTA
- [x] `src/components/CategoryPicker.tsx` — horizontal scroll chips
- [x] `src/components/AmountInput.tsx` — numeric keypad, paise storage, ₹ display
- [x] `src/components/FAB.tsx` — fixed bottom-right add button
- [x] `src/components/AddExpenseDrawer.tsx` — slide-up bottom sheet (CSS transition)
- [x] `src/screens/ExpensesScreen.tsx` — real implementation: sections, summary bar, server sync
- [x] Update `src/App.tsx` — wire drawer state + mutations
- [x] Fix Vite monorepo resolver for convex/server (custom plugin in vite.config.ts)
- [x] Amount display: drop `.00` for whole-rupee amounts; show paise only when non-zero (UPI-safe)

### Verification
1. FAB opens drawer from bottom
2. Enter amount → select category → save → expense appears in list grouped by Today
3. Daily total updates correctly
4. Refresh page — expenses persist (localStorage)
5. Convex server sync: after sign-in, existing expenses from server load into list
6. Amounts display without `.00` for whole numbers; UPI amounts with paise still show decimal

**Status: ✅ Done**

---

## M3: UPI SMS via Capacitor Wrapper

**Goal:** Android reads UPI SMS, parses transactions, presents approve/reject queue. Web users log manually.

### Micro-steps

- [ ] `capacitor.config.ts` — add Capacitor to `apps/web/`, configure `appId`, `appName`
- [ ] `capacitor-sms` plugin — install `capacitor-sms` or `@capacitor-community/sms-retriever`; confirm Android SMS_RECEIVE permission
- [ ] `src/lib/smsPoller.ts` — poll for new SMS on native platform; no-op on web (`Capacitor.isNativePlatform()` gate)
- [ ] `src/lib/smsParser.ts` — regex parser: extract amount (paise), merchant, UPI ref from common bank SMS templates
- [ ] `convex/smsQueue.ts` — mutation `enqueueSms` + query `pendingSmsQueue`; table `smsQueue` (status: pending/approved/rejected)
- [ ] Update `convex/schema.ts` — add `smsQueue` table
- [ ] `src/components/SmsApprovalCard.tsx` — card showing parsed UPI tx: amount, merchant, "Add as expense" / "Reject" buttons
- [ ] `src/screens/SmsQueueScreen.tsx` — list of pending SMS approvals; empty state when none
- [ ] `src/components/BottomNavBar.tsx` — add badge count for pending SMS queue
- [ ] Wire approve action → calls `addExpense` mutation + marks SMS approved
- [ ] Wire reject action → marks SMS rejected (hides from queue)
- [ ] `apps/web/android/` — `npx cap add android`; set SMS permission in `AndroidManifest.xml`
- [ ] End-to-end test: send test SMS → appears in queue → approve → shows in expense list

---

## M4: Group Trip Splitter

**Goal:** Create trips, log shared expenses, see who owes whom, mark settled.

*(Expand into micro-steps when M3 is complete)*

---

## M5: Insights & Polish

**Goal:** Charts, monthly view, push notifications, animations.

*(Expand into micro-steps when M4 is complete)*

---

## M1: Foundation & Infrastructure (Expo — reference only)

**Status:** Done, abandoned. `apps/mobile/` left in place but no further development.

Original goal was a working Expo dev-client app. Pivoted to PWA due to build toolchain constraints.
