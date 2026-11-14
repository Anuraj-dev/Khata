<p align="center">
  <img src="apps/web/public/favicon.svg" alt="Khata logo" width="88" height="88" />
</p>

<h1 align="center">Khata</h1>

<p align="center">
  A personal expense tracker for India, built around UPI.<br />
  It logs spends from bank SMS, tracks udhaar by person, and splits trips with friends.
</p>

<p align="center">
  <a href="https://khata.raja-dev.me">Open the web app</a>
  ·
  <a href="https://github.com/Anuraj-dev/Khata/releases/download/v0.14.1-debug/Khata-debug-84b5aae.apk">Download the Android APK</a>
  ·
  <a href="#android">Install on Android</a>
  ·
  <a href="#documentation">Docs</a>
</p>

Khata reads the bank and UPI texts on your phone and logs each payment as an expense, so you don't type them in. Anything it can't read with confidence waits in a review queue. Udhaar, the money you lend and borrow, is tracked per person across all of that person's phone numbers and UPI IDs. Trips get their own splits and a single settle-up.

The web app is a Vite and React PWA on a Convex backend. You sign in with Google. The Android app wraps the same web build in Capacitor and adds native code for SMS, fingerprint confirmation and push notifications.

## What you get

- **Expenses from bank SMS on Android.** A background receiver posts each incoming text to the `/sms/ingest` route. Texts with a clear amount and direction are logged right away. The UPI reference becomes the expense's client ID, so a text that arrives twice is logged once.
- **A review queue for the rest.** Bank texts without a clear amount or direction wait in a review queue, and a push notification tells you to look. Pending and failed payments never get logged.
- **Udhaar by person.** A contact can own several handles, such as phone numbers and UPI IDs. Balances add up across all of them. Once you tag a payment to a contact, later payments from that contact's handles count automatically. Merge duplicate contacts when the same person shows up twice.
- **Trip splits with one settle-up.** Split each trip expense equally or by custom amounts. Settle all records the remaining transfers as paid and closes the trip. Invite a member with a link or QR code, and that member can read the trip, read-only, for seven days.
- **Recurring-bill radar.** A payee seen in three different months with consistent amounts gets suggested as a recurring bill. Confirm it to track it, or dismiss it so it never comes back. A push at 8:00 IST warns you about bills due within three days.
- **Budgets that alert once.** Set a monthly limit and optional per-category caps. You get a push at 80% and again at 100% of the limit, once each per month. Each category cap alerts once a month.
- **Your rows stay with your account.** Google sign-in is the only login. Every expense, contact and budget is stored under your account ID, and the backend filters queries by it. Trip invites are the one exception. Clearing all expenses or trips requires a typed confirmation, and on Android also a fingerprint or device PIN.
- **Offline writes that sync later.** The app shell is precached by a service worker, so it opens without a connection. An expense added offline waits in a retry queue in local storage, retries with backoff, and gives up after five attempts.

## Installation

| Platform | How to get it |
| --- | --- |
| **Web** | Open [khata.raja-dev.me](https://khata.raja-dev.me) and sign in. |
| **Android** | Sideload the [debug APK from v0.14.1-debug](https://github.com/Anuraj-dev/Khata/releases/download/v0.14.1-debug/Khata-debug-84b5aae.apk). |

### Web

Open the site and sign in with Google. To keep Khata on your home screen, use your browser's install option. The installed app opens in its own window. SMS reading only runs in the Android app, so on the web you add expenses by hand.

### Android

The Android build is a debug APK. It is signed for sideloading, not for the Play Store. Download it from the release, allow installs from your browser or file manager when Android asks, and open it.

Khata asks for permission to read and receive SMS. Without that permission, Android doesn't deliver texts to Khata, and SMS logging stops. With it, the background receiver posts every incoming text to your Khata backend. The backend keeps only bank and UPI messages and drops the rest.

## Run your own copy

You need Bun, a Convex account and a Google OAuth web client.

```sh
bun install
cp apps/web/.env.example apps/web/.env.local
bunx convex dev
```

`bunx convex dev` asks you to log in and pick a project the first time. Leave it running, then start the web app in a second terminal:

```sh
bun run web:dev
```

Open the local URL Vite prints. Set `VITE_CONVEX_URL` in `apps/web/.env.local` to your deployment URL. Without it, the app connects to the author's development deployment.

### Configuration

Web app, in `apps/web/.env.local`:

| Variable | Purpose |
| --- | --- |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth web client ID used for sign-in. |
| `VITE_CONVEX_URL` | Convex deployment the build talks to. Production builds log an error when it is missing. |
| `VITE_CONVEX_SITE_URL` | Optional. The `.convex.site` origin. Derived from `VITE_CONVEX_URL` when unset. |
| `VITE_APP_URL` | Public origin for trip invite links and QR codes. Defaults to the current origin. |

Convex deployment environment variables. Set them with `bunx convex env set NAME value`, or in the Convex dashboard under Settings, then Environment Variables.

| Variable | Purpose |
| --- | --- |
| `GOOGLE_OAUTH_CLIENT_ID` | Google OAuth client ID for sign-in. Required. |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google OAuth client secret. Required. |
| `SITE_URL` | Origin where the web app runs. Added to Better Auth's trusted origins. Defaults to `http://localhost:5173`. |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON. Push notifications stay off without it. |

```sh
bunx convex env set GOOGLE_OAUTH_CLIENT_ID your-client-id.apps.googleusercontent.com
bunx convex env set GOOGLE_OAUTH_CLIENT_SECRET your-client-secret
```

In the Google OAuth client, add `https://<your-deployment>.convex.site/api/auth/callback/google` as an authorized redirect URI.

### Scripts

| Script | What it does |
| --- | --- |
| `bun run web:dev` | Starts the Vite dev server. |
| `bun run web:build` | Typechecks, then builds the production PWA. |
| `bun run web:preview` | Serves the production build locally. |
| `bun run web:typecheck` | Runs `tsc --noEmit` on the web app. |
| `bun run test` | Runs the Vitest suites once, for the Convex backend and the web app. |
| `bun run test:watch` | Runs Vitest in watch mode. |

### Android build

Java 21 and the Android SDK are required. Set `VITE_GOOGLE_CLIENT_ID`, `VITE_CONVEX_URL` and `VITE_APP_URL` in `apps/web/.env.local` first. Then run:

```sh
bun run web:build
cd apps/web
bunx cap sync android
cd android
./gradlew assembleDebug
```

The APK lands at `apps/web/android/app/build/outputs/apk/debug/app-debug.apk`. Push notifications need your own `google-services.json` from Firebase at `apps/web/android/app/google-services.json`. The file is gitignored. Without it, the build still succeeds, and push notifications don't work.

### Backend deploys

The backend lives in `convex/`. Code there runs only after it is deployed, so a frontend that calls newer functions than the deployment has will fail. Merges to `main` that touch `convex/` deploy to production through `.github/workflows/convex-deploy.yml`, which needs a `CONVEX_DEPLOY_KEY` repository secret.

The web build is a static site. `apps/web/vercel.json` sets the build command, the output directory and a single-page rewrite for Vercel.

## How it works

The SMS parser is one file, `convex/smsParser.ts`, and two code paths use it. The Convex route parses texts from the Android receiver. The web app imports the same file for its foreground poller, so both paths agree on what counts as a transaction. Money stays in integer paise from parse to storage, so sums never drift from floating-point rounding, and the backend rejects any amount above ₹1 crore.

Recurring-bill detection is a Convex query over the last 125 days of debits. Reminders and nudges run as daily cron jobs in `convex/crons.ts`, timed to IST.

## Repository layout

| Path | What it is |
| --- | --- |
| `apps/web/` | Vite and React PWA. The primary target, and the source of the Android app. |
| `convex/` | Convex backend: schema, queries, mutations, crons and the SMS ingest route. |
| `apps/mobile/` | Expo app. Abandoned and kept for reference. |
| `docs/` | Product notes and the PRD. |

## Documentation

- [Udhaar contacts and fixes PRD](docs/prd/udhaar-contacts-and-fixes.md)
- [Milestone plan](plan.md)
- [Web app changelog](apps/web/CHANGELOG.md)

## Contributing

Run the checks CI runs before you open a pull request: `bun run web:typecheck`, `bun run web:build` and `bun run test`. Use Conventional Commits. release-please reads them to cut releases and write the changelog.

## License

Khata is released under the [MIT License](LICENSE).
