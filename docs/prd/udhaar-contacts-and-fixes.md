# PRD — Contacts & aliases, SMS parsing fixes, udhaar auto-capture, trip close, and follow-on features

> Status: ready-for-agent · Milestone: M11 · Source conversation: grill + PRD session 2026-06-15

## Problem Statement

From the user's point of view, three things are broken in daily use, plus the app is missing a few things real life demands:

1. **UPI SMS log the wrong name.** When a friend pays via PhonePe/GPay, the transaction shows up as a phone number (`9706312331`), a transaction hash (`0427bfe3db92436bb68271151ef56390`, `Nd3879297`), or a real name with ref garbage tacked on (`Vaibhav 138`, `Anurajjit 1`). Merchant names get truncated mid-word (`Isthara Parks Private Lim`). So the expense list is full of meaningless labels.

2. **Udhaar doesn't recognise the same person twice.** If a friend pays the user ₹500 (a credit that lands under their phone-number handle) and later borrows ₹1500 (a debit under their real name, or repays later from a *different* UPI app), Khata treats those as different people because the ledger keys on the exact tagged string. Balances never roll up, and nothing is auto-captured — every udhaar is a manual tap, re-done for each new identifier. The user also has no clean way to record **offline cash** lending/repayment that never produced an SMS.

3. **Settlement reminders nag about trips the user considers settled.** The daily 9 AM reminder pings about every active trip with a balance ≥ ₹1. Trips settled in *cash* still show a balance because the user can't record those payments, and the "close" button is gated on ticking every transfer paid in-app — so trips never reach `settled` and the cron nags forever. (Confirmed in data: zero trips have ever reached `settled` status.)

4. **Missing real-life capabilities:** no way to spot recurring bills (rent, mess, Spotify, recharge) before they hit; no way to search/find an old expense as history grows; no per-category budgets or cash tracking; and the Insights page is shallow (static bars, no comparisons, no drill-down).

## Solution

From the user's point of view:

1. **Names come in clean, and you only ever name a person once.** SMS still auto-logs, but the underlying UPI handle is captured and remembered. The first time you tell Khata "this handle is Nitin", every future transaction from that handle — across any UPI app — shows as Nitin and rolls into his udhaar automatically. A garbled name no longer matters, because matching keys off the handle, not the name. Where a parsed name *closely* matches someone you already know, Khata suggests it in one tap.

2. **Udhaar tracks a person, not a string.** A contact can have many handles (phone numbers, VPAs, name spellings). The balance for "Nitin" sums every transaction from any of his handles. Tag a new handle once and it's learned. You can also **record cash udhaar by hand** ("I lent Nitin ₹500", "Nitin repaid ₹500") with no SMS involved, and **merge** two people if duplicates ever appear.

3. **"Everyone's settled" closes a trip in one tap.** When you've squared up in cash, one button records the remaining transfers as paid, drops the balance to ₹0, and marks the trip settled — and the daily reminder goes quiet.

4. **The app earns its keep:** it flags recurring bills before they're due, lets you search/filter and export your month to share with family, supports per-category budgets and (optionally) a cash wallet, and the Insights page tells you whether you're on track — month-over-month, projected month-end, top merchants you can tap into, and real charts.

## Glossary (vocabulary used throughout)

- **Handle** — a UPI identifier: a VPA (`nitin.das@oksbi`) or a phone-number VPA (`9706312331@ybl`). The *normalized* handle (lowercased VPA, or bare 10-digit phone) is the stable matching key.
- **Counterparty / party** — the other side of a transaction. `party` remains the best-effort *display name*; it is no longer used for identity.
- **Contact** — a person the user transacts with, owning one or more **aliases** (handles and/or name-keys).
- **Udhaar** — the personal lending/borrowing ledger. Balance(contact) = Σ tagged debits − Σ tagged credits; positive = they owe you.
- **paise** — integer money storage; display divides by 100.
- **direction** — `debit` (money out) / `credit` (money in).
- **clientId** — deterministic dedup key on `expenses`.
- **trip / member / settlement / net** — the splitter. Members are free-text strings; `net` for a member = paid − owed + payments.
- **review queue** — bank SMS that couldn't be confidently parsed, surfaced for manual approval.

## User Stories

1. As a UPI user, I want a friend's payment to show their name (or a recognisable handle) instead of a transaction hash, so that my expense list is readable.
2. As a UPI user, I want a phone-number handle shown as a friendly placeholder ("tap to name") rather than raw digits, so that I know it's a person I can label.
3. As a UPI user, I want merchant names to stop truncating mid-word, so that `Isthara Parks Private Limited` reads fully.
4. As a UPI user, I want reference numbers and hashes to never be used as a name, so that no `Nd3879297` entries appear.
5. As a user who lends money, I want to tag a transaction to a person once, so that Khata remembers that handle as theirs.
6. As a user who lends money, I want every future transaction from a known handle to be auto-tagged to that person silently with an undo, so that I don't re-tag repeatedly.
7. As a user who lends money, I want a transaction whose parsed name exactly matches an existing contact to auto-link even on a new handle, so that obvious matches need no taps.
8. As a user who lends money, I want a one-tap "is this Nitin?" suggestion on a transaction whose name *fuzzily* matches a contact, so that near-matches are cheap to confirm.
9. As a user who lends money, I want a credit from a phone-number handle prioritised as "likely a friend", so that the people I should tag surface first and merchants don't.
10. As a user who lends money, I want a person's balance to sum across all their handles, so that ₹500 they paid from one app and ₹1500 they borrowed under another name net correctly.
11. As a user who lends money, I want to record a cash loan or repayment by hand (person + amount + lent/borrowed/repaid + optional date), so that offline money is tracked too.
12. As a user who lends money, I want manual udhaar entries to not affect my spending budget, so that settling debts doesn't look like new spending.
13. As a user who lends money, I want to merge two people into one, so that duplicates created before I named a handle can be combined.
14. As a user who lends money, I want to rename a contact, so that I can fix or improve the displayed name.
15. As a user, I want existing udhaar people (tagged before contacts existed) preserved with their balances, so that the upgrade doesn't lose data.
16. As a trip organiser, I want a single "everyone's settled" button that records remaining transfers and closes the trip, so that I can finish a cash-settled trip in one tap.
17. As a trip organiser, I want a closed trip to stop sending me daily reminders, so that finished trips go quiet.
18. As a trip organiser, I want the close action to leave the trip's balances at ₹0, so that the closed trip reconciles cleanly.
19. As a budgeter, I want Khata to detect recurring debits (same counterparty, roughly monthly), so that I'm aware of my subscriptions and bills.
20. As a budgeter, I want to confirm a detected recurring bill once before it's tracked, so that one-off repeat purchases aren't mislabelled as subscriptions.
21. As a budgeter, I want a reminder before a recurring bill's usual date, so that I don't get caught out by a recharge or rent.
22. As a budgeter, I want an "upcoming this week" view of recurring bills, so that I can plan.
23. As a user with history, I want to search expenses by person, merchant, amount, category, and date range, so that I can find an old transaction.
24. As a user with history, I want search/filter to work beyond the most recent 100 entries, so that long history stays usable.
25. As a student, I want to export a month as CSV, so that I can keep or analyse records.
26. As a student, I want a clean shareable summary image of my month, so that I can send it to my parents.
27. As a budgeter, I want to set a spend cap per category, so that I can control specific areas (e.g. food).
28. As a budgeter, I want a warm alert when a category cap is approached/crossed, so that I'm nudged without shame.
29. As a cash user, I want to track cash-in-hand (seed a balance or log an ATM withdrawal, then log cash spends against it), so that my real money is reflected. *(Defer candidate.)*
30. As a user, I want Insights to compare this month to last ("food up 20%"), so that I see direction, not just totals.
31. As a user, I want a daily-average and a projected month-end figure, so that I know if I'm on track.
32. As a user, I want a ranked list of top merchants/people this month, so that I see where money actually goes.
33. As a user, I want to tap a category or merchant in Insights to see its transactions, so that the numbers aren't dead-ends.
34. As a user, I want a category donut and a spend line chart plus a cash-vs-UPI split, so that Insights is scannable.
35. As a user, I want all of the above to keep working with the app closed (server-side), so that background SMS ingest and reminders still apply the new logic.

## Implementation Decisions

### Identity model

- **New `contacts` table** (per owner): display name, `isUdhaarTracked` flag, timestamps. Separate from trip members — trip member slots stay free-text strings (the trip-sharing / viewer-link system keys on member names and is load-bearing; it will **not** be refactored). Contacts and trip members **cross-suggest** in autocomplete only.
- **New `contactAliases` table** keyed for O(1) incoming-handle resolution. Shape (encodes the decision precisely):

  ```
  contacts:        { ownerTokenIdentifier, name, isUdhaarTracked, createdAt, updatedAt }
                   index by_owner
  contactAliases:  { ownerTokenIdentifier, contactId, value, kind: "vpa"|"phone"|"name", createdAt }
                   index by_owner_value   // resolve an incoming handle -> contact
                   index by_contact       // list/merge a contact's aliases
  ```

- The **alias `value` is normalized**: VPAs lowercased; phone reduced to bare 10 digits (strip `+91`, spaces, `@bank`); name-keys lowercased/trimmed. Normalization is a **pure function** so it can be shared by the parser, the matcher, and tests.

### SMS parser (`convex/smsParser.ts`, the single source of truth)

- `parseSms` returns the **raw handle separately from the display name**: add `handle` (the full VPA / phone, *not* stripped) to `ParsedSms`. `party` stays the best-effort display name.
- Reject ref-like tokens as display names: pure-hex tokens ≥ ~16 chars, and tokens that are all digits with no letters when they came from a name position. Strip trailing standalone digit groups (`Vaibhav 138` → `Vaibhav`).
- Detect phone-number VPAs (10-digit local part) → expose as `kind: "phone"`; the display falls back to a formatted phone or a "tap to name" placeholder rather than raw digits.
- Raise/repair the 40-char party truncation so merchant names aren't cut mid-word.
- `smsClientId` unchanged (still dedupes on `upiRef`/amount/date/body hash).

### Contact matching (new pure module, e.g. `convex/contactMatch.ts`)

- `normalizeHandle(raw) -> { value, kind }`.
- `resolve(incoming, aliases) -> { contactId } | null` — exact handle match.
- `suggest(parsedName, contacts) -> contactId | null` — exact name → confident; fuzzy name → suggestion only.
- Pure, no Convex APIs → bundled into the web app and unit-tested directly.

### Auto-capture flow (server-side, all insert paths)

- `expenses` gains `counterpartyHandle` (normalized handle captured at insert) and `contactId` (resolved contact). Udhaar rolls up by `contactId`; `udhaarPerson` is retained as a denormalized display fallback for un-migrated rows.
- On every confident insert path (`smsIngest.ingestFromDevice`, `smsQueue.autoLog`, `smsQueue.approve`): normalize the handle → look up `contactAliases.by_owner_value` → if it resolves to an `isUdhaarTracked` contact, set `contactId` (counts in udhaar). If no handle match but parsed name *exactly* equals a contact, auto-link **and learn the new handle as an alias**. Fuzzy name match produces no DB change — it drives a client-side one-tap suggestion chip.
- The client shows a toast with **undo** when a transaction is auto-tagged.

### Udhaar (`convex/udhaar.ts`)

- `balances` / `personHistory` group by `contactId` (fallback `udhaarPerson`). `balances` returns the contact's display name + net + last activity.
- **Tagging learns aliases:** when the user tags an expense to a contact (existing or new), record that expense's `counterpartyHandle` as an alias and set `isUdhaarTracked = true`.
- New mutations: `contacts.create`, `contacts.rename`, `contacts.merge(a, b)` (re-points aliases + tagged expenses to the survivor), `contacts.linkAlias`.
- **Generalise `addRepayment` into `recordManual`**: args `{ contactId | name, intent, amount, note, date }` where `intent` ∈ {lent, borrowed, theyRepaid, iRepaid} maps to debit/credit. `source: "manual"`, **no budget alert** (settlement-like, mirrors current `addRepayment`).

### Trips (`convex/trips.ts`)

- New owner-only mutation `settleAll(tripId)`: compute remaining transfers from current net (greedy simplify, same math as `lib/tripBalances.ts`), insert a `settlements` row per transfer, then patch `status: "settled"`. Result: net → ₹0 and trip closed.
- UI replaces the gated "Mark settled & close" with an always-available **"Everyone's settled — close trip"** when transfers remain; it calls `settleAll`. The daily cron already skips `settled` trips, so no cron change.

### Recurring & bills radar

- New `recurringRules` table: `{ owner, contactId | counterpartyHandle, label, typicalAmount, cadence: "monthly", dayOfMonth, lastSeen, status: "active"|"dismissed" }`.
- `recurring.detect()` query: groups debits by contact/handle, finds ≥3 occurrences at ~monthly cadence with similar amounts → returns **candidates** (not yet rules). User confirms once → creates a rule.
- A daily cron checks active rules whose usual date is within N days and which have no matching transaction yet → schedules a reminder push (reuse `pushNotifications.sendToUser`).
- "Upcoming this week" card surfaced on the Expenses screen.

### Find & report

- New `expenses.search({ q?, category?, contactId?, direction?, from?, to?, cursor? })` — paginated (Convex pagination), addressing the current `listRecent` 100-cap. Filters use existing indexes (`by_owner_date`) plus in-query predicates.
- Export: `expenses.exportRange(from, to)` returns rows; the client builds a **CSV download** and a **shareable summary image** (canvas), shared via the Web Share API / Capacitor Share. Monthly granularity.

### Money controls

- **Per-category budgets:** new `categoryBudgets` table `{ owner, category, monthlyLimit, alert-dedup state }` (`by_owner`, `by_owner_category`). `budget.checkAfterExpense` extended to also compare in-category month spend against the category cap, reusing the once-per-day / once-per-threshold dedup pattern and the warm personalized copy.
- **Cash-in-hand wallet (defer candidate):** `cashWallet` (running balance) + `cashLedger` entries; "withdrew cash" (bank debit → wallet credit) and "spent cash" actions; a balance card. Flagged as the cut if scope runs heavy.

### Insights overhaul

- **Actionable trends:** month-over-month per-category delta; daily average; projected month-end (`monthSpent / daysElapsed × daysInMonth`). Built on the existing `listRange`.
- **Top merchants + drill-down:** aggregate by contact/party; each row taps through to a filtered list (reuses `expenses.search`).
- **Real charts:** category donut + spend line (daily within month, plus the 6-month trend) and a cash-vs-UPI split. **Decision:** prefer hand-rolled SVG (consistent with the current bar approach) over a heavy chart dependency, to keep the PWA bundle small.

### Migration

- One-off `internalMutation` backfill: for each distinct existing `udhaarPerson`, create a `contact` (alias `kind: "name"`), set `contactId` on its tagged expenses, mark `isUdhaarTracked`. Preserves all current balances.

## Testing Decisions

Introduce **vitest** (none exists today). A good test asserts **external behaviour** — given inputs, assert outputs or resulting DB state — never internal call shapes or private helpers. Two seams:

**Seam 1 — pure functions (vitest, no Convex):**
- `smsParser`: feed representative real SMS bodies, including the known failures (phone-VPA credit → `handle` captured + phone kind; hash/ref → rejected as name; `Vaibhav 138` → `Vaibhav`; long merchant → not truncated mid-word). Assert `{ amount, direction, handle, party, date }`.
- `contactMatch`: `normalizeHandle` (VPA lowercase, phone → 10 digits); `resolve` (exact handle → contact); `suggest` (exact name confident, fuzzy name suggestion).
- `tripBalances`: after recording the simplified transfers, every member's net is 0; remainder-paise spread is exact.

**Seam 2 — Convex behaviour (`convex-test`, in-memory DB):**
- `udhaar.balances` rolls a contact's net across two different aliases (the ₹500-then-₹1500 scenario).
- `ingestFromDevice` / `autoLog` with a body whose handle is a known alias → resulting expense has `contactId` set and counts in udhaar; with an unknown handle → not tagged.
- `recordManual` creates a correctly-directed, budget-exempt tagged expense.
- `trips.settleAll` → a `settlements` row per transfer, net 0, `status: "settled"`.
- `recurring.detect` surfaces a 3×-monthly biller and ignores a one-off.
- Per-category budget alert fires once per threshold.
- `expenses.search` returns filtered/paginated results beyond 100 rows.

**Prior art:** none in-repo — this PRD establishes the test setup. Model `convex-test` usage on the standard Convex testing pattern; keep pure-function tests framework-light.

## Out of Scope

- **Bucket A — collect & repay loop** (split-from-SMS, UPI deep-link repay, pre-written borrower nudge). Parked in the appendix; revisit next.
- **Reminder cadence/mute changes** — the daily cron and ₹1 threshold stay; closing trips is the off-switch (explicit decision).
- **Refactoring trip members into contacts**, cross-account contact sharing, or linking contacts to `tripMemberLinks` identities.
- **Bank-statement / Gmail import** of transactions.
- **Broad performance/pagination overhaul** beyond the new `expenses.search` (a full `collect()` audit of udhaar/trip queries is deferred).
- **Multi-currency, multi-language UI.**
- **Cash-in-hand wallet** may be cut to a later round if M11 scope runs heavy (it's the largest single piece).

## Further Notes

- **Why handle-keyed aliasing, not name-keyed:** the handle is deterministic and reliable to extract; the display name is the unreliable part. Matching on the handle means a garbled name never breaks identity, and the imperfect name still earns value as a *suggestion*. This directly answers the user's concern ("how will it learn the alias if parsing is bad?").
- **Friction budget:** the only irreducible tap is the first time a brand-new person with no name appears — autocomplete (seeded from contacts + trip members) keeps it to one tap. Everything else (known handle, exact-name) is silent or one-tap-suggested.
- **Data evidence (dev deployment, 2026-06-15):** 56 SMS expenses; credits dominated by phone-number / hash "names"; udhaar tags split across `9927509924`, `SURESH`, `Nitin Das`; zero trips ever reached `settled` despite several being effectively done (Paradox#2 and Istara already net ₹0; Delhi/Eliot/Metro/Paradox#1 carry real residuals from unrecorded cash settle-ups).
- **Deploy note:** schema + server-logic changes need `bunx convex deploy`; the background-ingest path also needs the app rebuilt only if the native layer changes (it does not for this work).
