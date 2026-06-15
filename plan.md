# Khata — Milestone Plan

> Source of truth. Read this before every session. Expand milestones into micro-steps here before writing any code.

## Milestones

| # | Milestone | Status |
|---|---|---|
| M1 | Foundation & Infrastructure (Expo — abandoned) | ✅ Done |
| M1-Web | PWA Foundation | 🔨 In Progress |
| M2 | Personal Expense Core (Expo — abandoned) | ✅ Done |
| M2-Web | Personal Expense Core (PWA) | ✅ Done |
| M3 | UPI SMS via Capacitor wrapper | ✅ Done |
| M4 | Group Trip Splitter | ⏳ Pending |
| M5 | Insights & Polish | ⏳ Pending |
| M11 | Contacts + aliases, SMS/udhaar fixes, trip close, recurring/search/budget/insights | 📋 PRD ready |

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
- [x] End-to-end test on device: new UPI SMS → appears in queue → approve → shows in expense list

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
- [ ] Push notifications (see M5.3 below)
- [ ] Deeper charts (follow-up)

### M5.1: Custom categories + UX fixes

- [x] **Custom categories (Convex-synced).** `categories` table (clientId/label/emoji/color per owner); `convex/categories.ts` — `listCategories`/`addCategory` (idempotent on slug)/`deleteCategory`. Loosened `expenses.category` (+ `addExpense`/`updateExpense`/`smsQueue` args) from closed union to `v.string()`.
- [x] `lib/categories.ts` — 6 built-ins + palette + `autoColor` (name-hash) + `slugify` + `resolveCategory` fallback for unknown ids
- [x] `hooks/useCategories.ts` — merges built-ins + synced custom; `resolve`/`addCategory`/`deleteCategory`
- [x] `components/AddCategoryForm.tsx` — reusable name + emoji creator (auto color)
- [x] `CategoryPicker` — renders all categories + inline `+` chip that opens the add-form and auto-selects the new one
- [x] Settings → Categories section: built-ins (read-only) + custom chips with delete + add
- [x] `ExpenseCard` resolves category id → emoji/color/label via `meta` prop
- [x] **Fix: Trips tab popped the keyboard** — `CreateTripDrawer` name input used a bare `autoFocus` that fired while the sheet sat closed off-screen; now focuses only on open
- [x] **Fix: expense list unscrollable** — added missing `min-h-0` down the flex chain (`main` → screen → list) so the scroll container shrinks to the viewport; momentum scroll + overscroll-contain + sticky day headers. Applied `min-h-0` to Trips/Settings/Insights too.
- [x] Trip sharing (read-only, 1-week QR link) — built and tested as M6/M6.1

### M5.2: Net balance + derived trips summary on home ✅

**Scope (this round, before M6):**

**1. Net balance on the home summary.** The today bar shows Spend + Received; added a **Net** figure (received − spent), green/`+` when positive, red/`−` when negative. Shown only when there's both a spend and a credit today. Derived from the existing `todayDebit`/`todayCredit` — no new data.

**2. Derived trips summary (no ledger mirroring).** Decided **against** writing trip expenses/settlements into the personal `expenses` ledger: SMS auto-capture already logs UPI transactions, so mirroring would **double-count** every UPI payment/repayment (on both the spend and income side), and the app can't reliably tell UPI from cash. Instead:
- New server query `trips.myTripBalances` → per active trip, the net position of the member named `"You"` (positive = owed, negative = owe), computed from `tripExpenses` + `settlements` (math mirrors `lib/tripBalances.ts`, re-implemented in Convex since it runs in a separate bundle).
- `components/TripsSummary.tsx` — read-only home card listing each active trip as "you're owed ₹X" / "you owe ₹Y"; rows under ₹1 (settled) hidden; tap → trip detail. Renders on the Expenses screen above the list (and above the empty state).
- The personal expense list stays SMS + manual only — trips never pollute it. This naturally folds into the M6 "you owe / you're owed" card.

**Files:** `convex/trips.ts` (`myTripBalances` + `netForMember`), `apps/web/src/components/TripsSummary.tsx`, `apps/web/src/screens/ExpensesScreen.tsx`.

### M6: Read-only trip sharing ✅

**Agreed model:**
- Member slots stay free-text for non-Khata people; a slot can be linked to a Khata user.
- **Invite link/QR expires after 1 week** — after expiry the trip can't be joined via that code (regenerate to re-open).
- Linked viewer gets **read-only forever** (only the owner edits expenses/payments).
- Home-screen owed card (the existing `TripsSummary`) aggregates the viewer's balance across shared trips; **a row disappears once settled**.

**Transport decided:** owner sees an on-screen QR + copyable link (`{VITE_APP_URL}/join/{token}`); recipient opens it with their phone camera (no in-app scanner). Recipient must **sign in** and **pick which member slot is them** → that maps the slot to their account, read-only forever.

**Micro-steps:**

*Backend*
- [x] Schema: `tripShares` (tripId, token, ownerToken, expiresAt) + `tripMemberLinks` (tripId, member, viewerToken, ownerToken) with `by_token`/`by_viewer`/`by_trip_viewer`/`by_trip_member` indexes.
- [x] `tripAccess.ts` — `resolveTripAccess(ctx, tripId, caller)` → `{trip, role: owner|viewer, viewerMember}` or null (owner = "You"; viewer via link).
- [x] `tripShares.ts` — `getOrCreateShare({tripId, regenerate?})` (owner; reuse unexpired, else mint, 7-day expiry); `previewShare({token})` (any auth; trip name + members + already-claimed slots, expiry check); `redeemShare({token, member})` (validate token/expiry, member ∈ trip & ≠ "You", slot not taken, upsert link).
- [x] `trips.ts` — `getTrip`/`listTripExpenses` use `resolveTripAccess` and read the **owner's** rows; `getTrip` returns `role`/`viewerMember`. `listTrips` + `myTripBalances` also include trips shared *to* you (viewer net for their slot).
- [x] `settlements.ts` — `listByTrip` allows viewer read via `resolveTripAccess`.

*Frontend*
- [x] `components/ShareTripSheet.tsx` — owner: QR (`qrcode.react`) + link + copy + expiry + regenerate.
- [x] `screens/JoinTripScreen.tsx` — preview → pick member radio → redeem → go to trip; handles invalid/expired.
- [x] `App.tsx` — `/join/:token` route; capture token to localStorage pre-auth + resume after sign-in.
- [x] `TripDetailScreen` — viewer = read-only (hide add/edit/mark-paid/settle, show "Shared · read-only" banner); owner gets a Share button.
- [x] `TripsScreen` — show shared-to-me trips with a "Shared" badge.
- [x] `.env.example` — add `VITE_APP_URL` (deployed web origin used to build invite links; falls back to `window.location.origin`).

**Files:** `convex/schema.ts`, `convex/tripAccess.ts`, `convex/tripShares.ts`, `convex/trips.ts`, `convex/settlements.ts`, `apps/web/src/components/ShareTripSheet.tsx`, `apps/web/src/screens/JoinTripScreen.tsx`, `apps/web/src/screens/TripDetailScreen.tsx`, `apps/web/src/screens/TripsScreen.tsx`, `apps/web/src/App.tsx`, `apps/web/.env.example`.

### M5.3: Push notifications ✅

**Three notification types:**
1. **Trip expense added** — viewer is notified when the owner logs a new expense on a shared trip. Deep-links to `/trips/:tripId`.
2. **SMS review queue** — user is notified when a bank SMS lands that needs manual review. Deep-links to `/` (Expenses screen with the review banner).
3. **Settlement reminder** — daily cron at 9 AM IST notifies each user of outstanding trip balances (you're owed / you owe). Deep-links to `/trips`.

**Stack:** `@capacitor/push-notifications` (Android FCM), `jose` (RS256 JWT for FCM HTTP v1 OAuth), Convex `ctx.scheduler.runAfter` for event-driven notifications, `crons.daily` for settlement reminders.

**Setup required (one-time):**
1. Create a Firebase project → enable Cloud Messaging → download `google-services.json` → place at `apps/web/android/app/google-services.json`
2. Generate a Firebase service account JSON → paste as `FIREBASE_SERVICE_ACCOUNT` in the Convex dashboard env vars

- [x] `convex/schema.ts` — `pushTokens` table (ownerTokenIdentifier, fcmToken, platform)
- [x] `convex/pushTokens.ts` — `registerToken` mutation (upsert by FCM token, clean up token reuse across accounts)
- [x] `convex/pushNotifications.ts` — FCM HTTP v1 action (jose RS256 JWT auth), `sendToUser`, `notifyTripViewers`, `sendSettlementReminders` internal actions + supporting internalQueries
- [x] `convex/trips.ts` — `addTripExpense` schedules `notifyTripViewers`; `getTripBalancesForOwner` internalQuery for cron
- [x] `convex/smsQueue.ts` — `enqueue` schedules `sendToUser` for review notification
- [x] `convex/crons.ts` — daily 3:30 AM UTC settlement reminder cron
- [x] `apps/web/src/lib/pushNotifications.ts` — request permission, register FCM token, handle notification tap → navigate
- [x] `apps/web/src/hooks/usePushNotifications.ts` — React hook, init on mount (native only)
- [x] `apps/web/src/App.tsx` — `usePushNotifications()` called in AppShell

### M6.1: Post-launch fixes + member management ✅

Real-device testing of M6 surfaced two issues plus a missing capability:

**1. Blank/black screen fix.** The router's catch-all `*` route rendered an empty `<Outlet/>` → any unmatched path (e.g. a stale PWA shell that predates the `/join` route) showed a black screen. Now `*` redirects to `/`. The join screen also auto-opens the trip for the **owner** (same account as the share) instead of parking on an "Open trip" button that read as a dead-end.

**2. Open invites in-app (in-app QR scanner).** Android App Links were considered but **rejected**: they need a pinned signing key (assetlinks SHA-256 must match the APK cert) and the CI debug key is ephemeral — fragile for sharing debug APKs to testers. Instead, an **in-app web-camera scanner** (`qr-scanner` via getUserMedia, works in PWA + WebView, no native plugin) on the Trips screen decodes the QR and navigates internally to `/join/{token}` — stays in-app, no browser, no keys. Scanning with the system camera still opens the deployed URL in Chrome (existing fallback). Needs `android.permission.CAMERA` (Capacitor brokers the runtime prompt). Custom `khata://` filter stays for OAuth.

> Aside (not done): the CI generating a fresh debug key per build means testers can't update an APK over a previous install (signature mismatch → must uninstall first). Pinning a committed debug keystore would fix that; deferred.

**3. Add / remove participants after trip creation.** `addTripMember` / `removeTripMember` mutations (owner-only). Removal is blocked when the member appears on any expense (`paidBy`/`splitAmong`/`shares`) or settlement, so balances can't silently corrupt; removing also drops any viewer's `tripMemberLink` for that slot. UI: a "Manage members" sheet opened from the trip detail (owner-only, hidden when settled/viewer), mirroring the create-trip member chips.

**Files:** `convex/trips.ts`, `apps/web/src/components/ManageMembersSheet.tsx`, `apps/web/src/components/ScanInviteSheet.tsx`, `apps/web/src/lib/joinLink.ts` (`parseJoinToken`), `apps/web/src/screens/TripsScreen.tsx`, `apps/web/src/screens/TripDetailScreen.tsx`, `apps/web/src/screens/JoinTripScreen.tsx`, `apps/web/src/App.tsx`, `apps/web/android/app/src/main/AndroidManifest.xml`.

### M6.2: Real-device bug-fix round ✅

Five bugs from device testing, all in one branch:

1. **Cleared trips lingered for the shared user.** `trips.clearAll` already revoked the *owner's* member-links, but a *viewer* clearing their own account kept their links (they own no trips, so the cleanup loop never ran). Now `clearAll` also deletes the caller's own `tripMemberLinks` (`by_viewer`). Requires a Convex redeploy to take effect.
2. **Owner showed as "You" on the recipient's phone.** Member slots are stored owner-first (the owner's slot is literally `"You"`). `getTrip` now returns the owner's Google `ownerName` (from `users`); `TripDetailScreen` adds a display-only `display(member)` remap for viewers (`"You"→ownerName`, own slot `→ "You"`) applied at every render site. Balance math still keys off raw names. The viewer banner now reads "Shared by {ownerName}".
3. **UPI auto-log only ran while the app was open.** Added **full background ingest**: a native `SmsReceiver` (`RECEIVE_SMS`) posts incoming SMS to a new Convex HTTP route `POST /sms/ingest`, authenticated by a per-device secret (`smsDevices` table; `smsIngest.registerDevice`). The server (`smsIngest.ingestFromDevice`) parses via `convex/smsParser.ts` and auto-logs (deduped by `clientId`) or queues for review — mirroring the foreground poller, which stays as the catch-up path. `SmsPlugin.configureIngest` persists the secret + URL for the receiver; `lib/smsBackground.ts` + `useSmsPoller` register on mount. Requires redeploy. **Hardening:** `convex/smsParser.ts` is now the single source of truth — the web poller imports it directly (the duplicate `apps/web/src/lib/smsParser.ts` is gone, so parsing can't drift). Sign-out unbinds the device (`smsIngest.unregisterDevice` + `SmsPlugin.clearIngest` + cleared local secret) so post-logout SMS can't auto-log to the signed-out account; and the receiver forgets its config on a `401` so a stale/cleared device stops posting on every SMS.
4. **Stats: show yesterday / day-before net.** `DaySectionHeader` now shows a net figure (received − spent) on past-day rows; Today's row stays clean (top summary bar already carries it).
5. **Invite QR showed `localhost` from the app.** The APK build never set `VITE_APP_URL`, so `joinUrl` fell back to the WebView's `https://localhost`. `build-apk.yml` now bakes `VITE_APP_URL=https://khata.raja-dev.me`.

**Files:** `convex/trips.ts`, `convex/schema.ts`, `convex/smsParser.ts` (new, single source), `convex/smsIngest.ts` (new), `convex/http.ts`, `apps/web/src/screens/TripDetailScreen.tsx`, `apps/web/src/components/DaySectionHeader.tsx`, `apps/web/src/screens/ExpensesScreen.tsx`, `apps/web/src/screens/SettingsScreen.tsx` (sign-out unbind), `apps/web/src/lib/smsBackground.ts` (new), `apps/web/src/lib/smsPoller.ts` (imports `convex/smsParser`; old `apps/web/src/lib/smsParser.ts` deleted), `apps/web/src/hooks/useSmsPoller.ts`, `apps/web/android/.../SmsReceiver.java` (new), `apps/web/android/.../SmsPlugin.java`, `apps/web/android/app/src/main/AndroidManifest.xml`, `.github/workflows/build-apk.yml`.

> **Deploy note:** bugs 1 & 3 need `bunx convex deploy` (prod). Bug 3's background path needs a fresh APK (new permission + receiver + plugin method).

### M7: Push notification fix 🔨

**Root cause found (2026-06-12):** `FIREBASE_SERVICE_ACCOUNT` is set only on the **dev** Convex deployment; the phone talks to **prod**, where `getAuth()` returns `null` and every send silently no-ops. No notification has ever been delivered.

- [ ] **Manual (Raja):** paste the Firebase service-account JSON as `FIREBASE_SERVICE_ACCOUNT` in the **prod** deployment env vars (dashboard.convex.dev → prod → Settings → Environment Variables), then `bunx convex deploy`
- [x] `convex/pushNotifications.ts` — log a loud error when `FIREBASE_SERVICE_ACCOUNT` is missing instead of silently returning
- [x] `convex/pushTokens.ts` — `sendTest` mutation: returns registered-device count and schedules a test push to self
- [x] Settings → Notifications section: "Send test notification" row; toast tells you if no device token is registered (client-side failure) vs sent (check tray; if nothing arrives, server env is wrong)

### M8: Monthly budget + safe-to-spend + warm alerts 🔨

**Agreed design (grill session 2026-06-12):**
- User sets a monthly spend limit (paise). Daily plan = (limit − spent before today) ÷ days remaining incl. today, recomputed live.
- Spend = **debits only** for now (udhaar repayment offset arrives with M9 tagging).
- Set-limit prompt appears once the user has ≥10 expenses or ≥3 distinct active days (not time-based), pre-suggesting from real spend; dismissable (localStorage), editable in Settings.
- Alerts: (1) daily — the debit that pushes today past the daily plan triggers one push (max 1/day, skipped when the month's budget is already blown); (2) monthly — once at 80% and once at 100% per month. Fired server-side from every expense insert path (manual, autoLog, approve, background ingest), so it works with the app closed.
- Tone: warm, concrete consequences, never shame. Copy personalized dynamically: overage translated into "~N of your usual {top category} spends" using the user's own month data. Light Hinglish OK.

**Micro-steps:**
- [x] `convex/schema.ts` — `budgets` table (ownerTokenIdentifier, monthlyLimit, lastDailyAlertDate, lastMonthlyAlert80/100) `by_owner`
- [x] `convex/budget.ts` — `getStatus({today})` query (limit, monthSpent, todaySpent, dailyPlan, safeToday, daysRemaining); `setBudget` / `clearBudget`; `checkAfterExpense` internalMutation (threshold math + dedup guards + personalized copy + schedules push)
- [x] Wire `checkAfterExpense` into `expenses.addExpense`, `smsQueue.autoLog`, `smsQueue.approve`, `smsIngest.ingestFromDevice` (debits only)
- [x] `hooks/useBudget.ts` — status query + set/clear mutations
- [x] `components/SetBudgetSheet.tsx` — amount keypad in a Sheet, spend-so-far suggestion, save / remove
- [x] `components/BudgetPromptCard.tsx` — "set a target?" card on Expenses screen (eligibility + dismiss)
- [x] `ExpensesScreen` — "Left today" column in the summary bar (always shown once a budget exists), red when over with a warm one-liner
- [x] Settings → Budget section (current limit, tap to edit)

### M9: Udhaar ledger ✅

**Model (locked in grill session):** tag-an-expense — an udhaar is an existing expense (manual or SMS) tagged with a person's name. No separate book, no double-count. Balance(person) = Σ tagged debits − Σ tagged credits; positive = they owe you, negative = you owe them. The direction alone carries the meaning (lend/repay-borrow are debits; get-repaid/borrow are credits), so one field suffices.

**Micro-steps:**
- [x] `convex/schema.ts` — `expenses.udhaarPerson: v.optional(v.string())` + `by_owner_udhaar` index
- [x] `convex/udhaar.ts` — `balances` query (per-person net + last activity), `personHistory({person})`, `setTag({expenseId, person|null})`
- [x] `convex/budget.ts` — budget spend now subtracts udhaar-tagged **credits** (repayment restores safe-to-spend; the lent debit already counted)
- [x] `lib/expenseStorage.ts` — `udhaarPerson` on `LocalExpense` (+ sanitize + server sync mapping)
- [x] `components/TagUdhaarSheet.tsx` — tap an expense row → tag/untag with free-text name + autocomplete chips (existing people + SMS party)
- [x] `ExpenseCard` — tappable; shows a small `🤝 name` badge when tagged
- [x] `screens/UdhaarScreen.tsx` — per-person balance list (owes you / you owe), settled people hidden, empty state explaining the tag gesture
- [x] `screens/UdhaarPersonScreen.tsx` — `/udhaar/:person` history + net header
- [x] `BottomNavBar` — 4th tab: Expenses · Udhaar · Trips · Insights; `App.tsx` routes

### M10: Cash extras ✅

- [x] **Android app shortcut** — static shortcut ("Add expense") → `khata://add`; `shortcuts.xml` + manifest meta-data + strings; `AppShell` listens for the deep link (warm + cold start) and opens the add drawer
- [x] **End-of-day cash nudge** — daily cron 9 PM IST (15:30 UTC): users with push tokens and **no manual entry today** get "spent any cash today?" (warm copy); `expenses.hasManualOnDate` internalQuery + `pushNotifications.sendCashNudges`
- [x] **Load older history** — the home list caps at 100; add a "Load older" row that raises the `listRecent` limit in +100 steps (10-year durability)

---

## M11: Contacts + aliases, SMS/udhaar fixes, trip close, follow-on features 📋

**PRD:** [`docs/prd/udhaar-contacts-and-fixes.md`](docs/prd/udhaar-contacts-and-fixes.md) — full problem statement, user stories, implementation + testing decisions. Synthesised from the grill/PRD session on 2026-06-15.

**Scope (agreed):**
- **SMS parsing fix** — capture + store the full UPI handle (VPA/phone) separately from a best-effort display name; reject ref-hashes / trailing-digit garbage; fix 40-char merchant truncation; friendly placeholder for phone-only handles.
- **Contacts + learned aliases** — new `contacts` + `contactAliases` tables (separate from trip members, cross-suggesting). Aliases keyed on the normalized handle; matching never depends on good name parsing.
- **Udhaar auto-capture + roll-up** — known handle → silent auto-tag (undo); exact name → auto-link + learn handle; fuzzy name → one-tap chip; phone-VPA credits prioritised. Balance rolls up by contact across all handles. **Manual cash udhaar entry/repay** (generalise `addRepayment` → `recordManual`). Contact merge/rename. One-off backfill migration.
- **Trip close** — `settleAll` mutation + "Everyone's settled — close trip" one-tap (bulk-records remaining transfers → net ₹0 → `settled` → cron quiet). Daily cron/threshold unchanged.
- **Recurring & bills radar (B)** — detect monthly billers, confirm once, remind before due, "upcoming this week" card.
- **Find & report (C)** — paginated `expenses.search`; monthly CSV + shareable summary image.
- **Money controls (D)** — per-category budgets (reuse alert plumbing); cash-in-hand wallet *(defer candidate)*.
- **Insights overhaul** — MoM comparison, daily-avg, projected month-end; top merchants + drill-down; hand-rolled SVG donut/line + cash/UPI split.

**Testing:** introduce **vitest** (two seams) — pure functions (`smsParser`, `contactMatch`, `tripBalances`) + `convex-test` for DB behaviours (udhaar roll-up, auto-tag, `settleAll`, recurring detect, per-category budget, search).

**Progress:**
- [x] **Foundation slice** (branch `feat/m11-contacts-foundation`): schema `contacts` + `contactAliases` + `expenses.counterpartyHandle`/`contactId` (+ `by_owner_contact` index); `smsParser` now returns a stable `handle` and cleans display names (rejects hex/ref blobs, strips digit tails, no 40-char truncation, phone-VPA → handle without a fake name); pure `convex/contactMatch.ts` (`normalizeHandle`/`normalizeName`/`resolveByHandle`/`suggestByName`); vitest wired (`bun run test`) with 22 passing pure tests (Seam 1).
- [x] **Auto-capture wiring** (branch `feat/m11-contacts-foundation`): `counterpartyHandle` captured on every insert path (`ingestFromDevice`, `autoLog`, `approve` + poller threads `parsedHandle`); known handle → `contactId`; exact-name auto-link + learn the new handle. `contactsHelpers.resolveForIngest`/`tagExpenseToPerson`. (+ 5 convex-test cases, Seam 2)
- [x] **Udhaar roll-up + contacts CRUD**: roll-up via canonical `udhaarPerson` (existing name-keyed screens work unchanged) + `contactId` surfaced; `setTag`/`addRepayment` build the contact graph; `contacts.ts` (`listContacts`/`createContact`/`renameContact`/`mergeContacts`/`backfillContacts`).
- [ ] Udhaar frontend polish: fuzzy-name suggestion chip on the expense card; "+ add manual udhaar" entry from scratch; merge UI; phone-only handle display ("tap to name").
- [x] **Trip close**: `trips.settleAll` records the remaining simplified transfers as paid then sets `status: "settled"` (owner-only); `TripDetailScreen` close button is ungated — "Everyone's settled — close trip" — so cash-settled trips can finally close and the daily reminder goes quiet. (+ 2 convex-test cases)
- [ ] Recurring radar · search/export · per-category budgets · insights overhaul.

**Parked (appendix A):** collect & repay loop (split-from-SMS, UPI deep-link repay, borrower nudge); reminder cadence/mute; broad perf/pagination audit.

---

## M4: Group Trip Splitter

**Goal:** Create trips, log shared expenses, see who owes whom, mark settled.

### Micro-steps

- [x] `lib/tripBalances.ts` — equal-split net balances (remainder-paise spread) + greedy min-cash-flow `simplifyDebts`
- [x] `components/Sheet.tsx` — reusable bottom sheet (extracted from AddExpenseDrawer pattern)
- [x] `components/CreateTripDrawer.tsx` — name + member chips (seeded with "You")
- [x] `components/AddTripExpenseDrawer.tsx` — amount, note, paid-by, split-among multi-select, date
- [x] `screens/TripsScreen.tsx` — trip list + create + empty state (replaces stub)
- [x] `screens/TripDetailScreen.tsx` — balances, settle-up suggestions, expense list, mark-settled
- [x] `App.tsx` — `/trips/:tripId` nested route
- [x] Uses existing `convex/trips.ts` + `convex/settlements.ts` (createTrip, addTripExpense, saveSettlements, settleTrip)

### Notes
- SMS capture limitation accepted (MVP): banks drop SMS for small UPI txns (SBI especially; HDFC < ₹100). Chose **Path A** — keep SMS auto-log + fast manual quick-add with an optional **date** field for missed/past entries. Email/Gmail capture (Path B) deferred.

### M4.1: Trips round — settle-up + edit/delete + unequal splits + emoji 🔨

**Scope agreed:** all four below in one round. (Verified: multiple shared expenses per trip already work — each has its own `paidBy`/`splitAmong` and balances recompute live.)

**1. Incremental per-person settle-up (record-payment model):**
- Each suggested transfer ("Amit pays You ₹500") gets a tick → records a real payment (from→to→amount, timestamped), not just a flag.
- Paid lines struck-through + green ✓ in a "Paid" group with undo; remaining recompute live.
- Math: `net[from] += amt; net[to] -= amt`, then `simplifyDebts`. New expenses after a payment must NOT distort it.
- `recordPayment(tripId,from,to,amount)` + `deletePayment(id)`; drop old snapshot flow (`saveSettlements`/`markSettled`). Close = `settleTrip` only.

**2. Edit / delete a shared expense:** `updateTripExpense` + `deleteTripExpense`; tap a row → drawer in edit mode with Delete.

**3. Equal / unequal splits:** drawer toggle Equal (chips, even) vs Unequally (per-member ₹ inputs, live remainder, "split evenly" helper; save gated on shares summing to total). Schema: `tripExpenses.splitMode` + `shares` (`{member, amount}` paise).

**4. Emoji on a trip expense:** `tripExpenses.emoji` (optional); emoji row in drawer, shown on each row.

**Files:** `convex/schema.ts`, `convex/trips.ts`, `convex/settlements.ts`, `lib/tripBalances.ts`, `components/AddTripExpenseDrawer.tsx`, `screens/TripDetailScreen.tsx`.

---

## M5: Insights & Polish

**Goal:** Charts, monthly view, push notifications, animations.

*(Expand into micro-steps when M4 is complete)*

---

## M1: Foundation & Infrastructure (Expo — reference only)

**Status:** Done, abandoned. `apps/mobile/` left in place but no further development.

Original goal was a working Expo dev-client app. Pivoted to PWA due to build toolchain constraints.
