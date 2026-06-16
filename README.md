<div align="center">

# 📒 Khata

### Money clarity for everyday India

Khata auto-logs your UPI spends from SMS, keeps your *udhaar* (lending) straight by
person, splits trips with friends, flags recurring bills before they hit, and shows you
where the money actually goes — all in an installable PWA.

[![Version](https://img.shields.io/badge/version-0.11.0-1f6feb)](apps/web/package.json)
![PWA](https://img.shields.io/badge/PWA-installable-5a3fc0)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![Convex](https://img.shields.io/badge/Convex-backend-f3502c)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-native%20wrapper-119eff?logo=capacitor&logoColor=white)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## 📱 Screenshots


<table>
  <tr>
    <td align="center">
      <!-- docs/screenshots/web-expenses.png -->
      <img src="https://placehold.co/390x844/1f6feb/ffffff?text=Web+%E2%80%94+Expenses" width="240" alt="Web — Expenses" /><br/>
      <sub><b>Web</b> — Expenses</sub>
    </td>
    <td align="center">
      <!-- docs/screenshots/pwa-install.png -->
      <img src="https://placehold.co/390x844/5a3fc0/ffffff?text=PWA+%E2%80%94+Installed" width="240" alt="PWA — Installed" /><br/>
      <sub><b>PWA</b> — Installed</sub>
    </td>
    <td align="center">
      <!-- docs/screenshots/mobile-home.png -->
      <img src="https://placehold.co/390x844/119eff/ffffff?text=Mobile+%E2%80%94+Home" width="240" alt="Mobile — Home" /><br/>
      <sub><b>Mobile</b> — Home</sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <!-- docs/screenshots/web-insights.png -->
      <img src="https://placehold.co/390x844/0d1117/8b949e?text=Insights" width="240" alt="Insights" /><br/>
      <sub>Insights — trends &amp; charts</sub>
    </td>
    <td align="center">
      <!-- docs/screenshots/web-udhaar.png -->
      <img src="https://placehold.co/390x844/0d1117/8b949e?text=Udhaar" width="240" alt="Udhaar ledger" /><br/>
      <sub>Udhaar — person ledger</sub>
    </td>
    <td align="center">
      <!-- docs/screenshots/mobile-sms.png -->
      <img src="https://placehold.co/390x844/0d1117/8b949e?text=UPI+SMS" width="240" alt="Auto-logged UPI SMS" /><br/>
      <sub>Auto-logged UPI SMS</sub>
    </td>
  </tr>
</table>

---

## ✨ Features

- **Auto-log UPI from SMS** — On Android (via Capacitor), Khata reads UPI transaction
  SMS and logs them automatically. It captures the underlying UPI handle so garbled or
  truncated merchant/person names get cleaned up — name a handle once and every future
  transaction from it is labelled correctly.
- **Udhaar ledger that tracks a *person*, not a string** — A contact can have many
  handles (phone numbers, VPAs, name spellings); their balance rolls up across all of
  them. Record cash lending/repayment by hand, and **merge** duplicate people.
- **Trip splitter** — Split group expenses and settle up, with a one-tap
  *"everyone's settled"* close that records remaining transfers as paid and silences
  reminders.
- **Recurring-bill radar** — Detects monthly billers (rent, mess, Spotify, recharge)
  from your spend history and reminds you a few days before they're due.
- **Per-category budgets** — Set spend caps and see safe-to-spend at a glance.
- **Insights** — Month-over-month trends, projected month-end, top-merchant drill-down,
  and real donut/line charts.
- **Installable PWA** — Works offline-friendly, installs to your home screen. Amounts
  are stored in **paise** (integers) to avoid floating-point errors.

---

## 🧱 Tech stack

| Layer | Tech |
|---|---|
| Frontend | Vite 6 + React 19 PWA (`vite-plugin-pwa`) |
| Styling | Tailwind CSS v4 (CSS custom-property theme tokens) |
| Backend | [Convex](https://convex.dev) — queries, mutations, actions, crons |
| Auth | `better-auth` + Convex adapter (Google Sign-In) |
| Native wrapper | Capacitor (UPI SMS reading, push notifications) |
| Tests | Vitest + `convex-test` |

---

## 📂 Project layout

```
Khata/
├── apps/
│   ├── web/        # Vite + React PWA — primary target, active development
│   └── mobile/     # Expo / React Native app — abandoned, left in place
├── convex/         # Convex backend (schema, queries, mutations, actions, crons)
├── docs/           # PRDs and screenshots
└── plan.md         # Milestone source of truth
```

> **Pivot note:** `apps/mobile/` (Expo) is abandoned; all active work targets
> `apps/web/`. UPI SMS uses a thin Capacitor wrapper around the same web app.

---

## 🚀 Getting started

**Prerequisites:** [Bun](https://bun.sh) and a [Convex](https://convex.dev) account.

```bash
# 1. Install dependencies
bun install

# 2. Configure env — copy the example and fill in your values
cp apps/web/.env.example apps/web/.env.local
#   VITE_GOOGLE_CLIENT_ID   — your Google OAuth web client ID
#   VITE_APP_URL            — public origin for trip-invite links (optional in dev)

# 3. Start the Convex backend (in one terminal)
bunx convex dev

# 4. Start the web app (in another terminal)
bun run web:dev
```

Open the printed local URL. The app boots → Google Sign-In → connects to Convex. In
Chrome you can **Install app** to run it as a PWA.

> Browser-exposed env vars are prefixed `VITE_`. SMS reading is gated behind native
> platforms — on the web you log expenses manually.

---

## ☁️ Backend & deploy

Convex functions, schema, and crons live in `convex/`. Schema changes and scheduled
jobs register automatically on deploy.

```bash
bunx convex dev      # local/dev deployment with live reload + codegen
bunx convex deploy   # push schema, functions, and crons to your deployment
```

Releases for the web PWA are automated via `release-please`
(`.github/workflows/release-please.yml`); version source is `apps/web/package.json`.

---

## 🛠️ Scripts

Run from the repo root:

| Script | Description |
|---|---|
| `bun run web:dev` | Start the web PWA dev server |
| `bun run web:build` | Production build of the web PWA |
| `bun run web:preview` | Preview the production build |
| `bun run web:typecheck` | Type-check the web app (`tsc --noEmit`) |
| `bun run test` | Run the test suite once (Vitest) |
| `bun run test:watch` | Run tests in watch mode |

---

## 🧪 Testing

```bash
bun run test        # 33 tests across the Convex backend (Vitest + convex-test)
bun run web:typecheck
```

Convex modules are tested with [`convex-test`](https://docs.convex.dev/testing/convex-test),
which runs queries/mutations against an in-memory deployment.

---

## 📄 License

Released under the [MIT License](LICENSE) © 2026 Anuraj Jit Saikia.
