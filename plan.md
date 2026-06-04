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

- [x] `capacitor.config.ts` — add Capacitor to `apps/web/`, configure `appId`, `appName`
- [x] Install `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`
- [x] `src/lib/smsPoller.ts` — custom `SmsReader` plugin interface; web stub no-op; `pollForUpiSms()` returns parsed messages
- [x] `src/hooks/useSmsPoller.ts` — React hook: polls every 30 s on native, enqueues to Convex; skips on web
- [x] `src/lib/smsParser.ts` — regex parser covering 12+ bank formats (already existed)
- [x] `convex/smsQueue.ts` — `listPending`, `enqueue`, `approve`, `reject` (already existed)
- [x] `convex/schema.ts` — `smsReviewQueue` table (already existed)
- [x] `src/components/SmsApprovalCard.tsx` — card: amount/direction, party, UPI ref, raw SMS toggle, approve form (category + note), reject
- [x] `src/screens/SmsQueueScreen.tsx` — pending list + empty state
- [x] `src/components/BottomNavBar.tsx` — UPI tab added; badge shows pending count
- [x] Wire approve → `smsQueue.approve` mutation (creates expense + marks approved)
- [x] Wire reject → `smsQueue.reject` mutation
- [x] `apps/web/android/` — `bunx cap add android` scaffolded Android project
- [x] `android/app/src/main/AndroidManifest.xml` — `READ_SMS` permission added
- [x] `SmsPlugin.java` — ContentResolver queries `content://sms/inbox`, returns sender/body/timestamp; permission handled via `@CapacitorPlugin` annotation
- [x] `MainActivity.java` — registers `SmsPlugin` in `onCreate`
- [x] `.github/workflows/build-apk.yml` — CI builds debug APK on every push to main, uploads as artifact (no Android Studio needed)
- [ ] End-to-end test on device: new UPI SMS → appears in queue → approve → shows in expense list

### M3.1: In-app OAuth + SMS auto-logging

**Goal:** Sign-in completes inside the app (no Chrome website loop). UPI SMS auto-log to expenses; unparseable bank SMS fall back to the review queue.

- [x] In-app OAuth via custom URL scheme (`khata://auth`) opened in a Custom Tab (`@capacitor/browser`) — no App Links verification needed, redirect always returns to the app
- [x] `convex/auth.ts` — add `khata://` to `trustedOrigins` so Better Auth accepts the custom-scheme callbackURL
- [x] `AuthScreen` — native branch: `signIn.social({ callbackURL: "khata://auth", disableRedirect: true })` → open returned URL in Custom Tab
- [x] `useDeepLinkAuth` — handle `khata://` deep link: close browser, forward `?ott=` into the webview so `ConvexBetterAuthProvider` completes the session
- [x] `AndroidManifest.xml` — replace unverified `https` App Link with `khata` custom-scheme intent filter
- [x] `smsParser.ts` — extract transaction `date` (D-M-Y, D-Mon-Y formats); add keyword categorizer + deterministic client id for dedup
- [x] `convex/smsQueue.ts` — `autoLog` mutation: dedupe by `clientId`, insert expense directly (no approval)
- [x] `useSmsPoller` — confident parses (amount + direction) auto-log; ambiguous/unparseable bank SMS enqueue for manual review
- [x] `smsPoller.ts` — fall back to SMS receive timestamp when no date in body

### M3.2: SMS UX polish + data controls

- [x] SMS expenses show the counterparty **name** (cleaned from VPA) as the title, with a subtle "auto" tag (no generic "UPI payment", no UPI brand logo)
- [x] Better party extraction in `smsParser.ts` (`to/from <Name>`, VPA handles) + `cleanPartyName`
- [x] Remove the dedicated UPI tab; surface unparseable bank SMS as a contextual "needs review" banner on the Expenses screen
- [x] Clear-all-expenses with device confirmation: custom `Biometric` plugin (fingerprint / device PIN via `androidx.biometric`), typed-confirm fallback on web
- [x] `convex/expenses.ts` — `clearAll` mutation (wipes the user's expenses + review queue)
- [x] Settings screen + header gear entry

## M5: Insights & Polish

**Goal:** Charts, monthly view, long-term timeline.

### Micro-steps

- [x] Month dividers in the expense list so multi-month history stays scannable
- [x] `convex/expenses.ts` — `listRange(start, end)` query for month aggregation
- [x] `InsightsScreen` — month switcher, per-month spend/received totals, category breakdown bars, 6-month trend
- [ ] Push notifications, deeper charts (follow-up)

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
