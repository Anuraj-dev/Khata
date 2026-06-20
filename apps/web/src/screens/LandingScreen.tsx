import { useState, type ReactNode } from "react";
import { signInWithGoogleWeb } from "../lib/auth-client";
import { logger } from "../lib/logger";
import { Button } from "../components/Button";
import { BrandMark } from "../components/BrandMark";

// Public marketing landing page shown to logged-out WEB visitors. Native
// (installed app) skips this and lands on AuthScreen directly — see AuthGate
// in App.tsx. Honest product page: no fake ratings/testimonials.
export function LandingScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogleWeb();
    } catch (err) {
      logger.error("landing_signin_failed", { error: String(err) });
      setError("Sign-in failed. Please try again.");
      setLoading(false);
    }
  }

  function scrollToHow() {
    document
      .getElementById("how-it-works")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="landing-scroll" style={{ background: "var(--color-bg)" }}>
      {/* Hero owns the amber spotlight + dot-grid backdrop */}
      <div className="hero-spotlight pt-safe">
        <div className="relative z-10">
          <Nav loading={loading} onSignIn={handleSignIn} />
          <Hero
            loading={loading}
            error={error}
            onSignIn={handleSignIn}
            onHowItWorks={scrollToHow}
          />
        </div>
      </div>

      <Features />
      <HowItWorks />
      <CtaBand loading={loading} onSignIn={handleSignIn} />
      <Footer />
    </div>
  );
}

/* ─────────────────────────── Nav ─────────────────────────── */

function Nav({ loading, onSignIn }: { loading: boolean; onSignIn: () => void }) {
  return (
    <nav className="mx-auto flex w-full max-w-screen-lg items-center justify-between px-5 pt-5">
      <span className="flex items-center gap-2">
        <BrandMark size={28} />
        <span
          className="text-base font-semibold tracking-tight"
          style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}
        >
          Khata
        </span>
      </span>
      <Button variant="secondary" size="sm" loading={loading} onClick={onSignIn}>
        Sign in
      </Button>
    </nav>
  );
}

/* ─────────────────────────── Hero ─────────────────────────── */

function Hero({
  loading,
  error,
  onSignIn,
  onHowItWorks,
}: {
  loading: boolean;
  error: string | null;
  onSignIn: () => void;
  onHowItWorks: () => void;
}) {
  return (
    <header className="mx-auto w-full max-w-screen-lg px-5 pt-10 pb-12 lg:pt-14 lg:pb-20">
      <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">
        {/* Copy */}
        <div
          className="flex w-full flex-col items-center text-center lg:items-start lg:text-left"
          style={{ animation: "khata-rise var(--dur-slow) var(--ease-out) both" }}
        >
          {/* Pill badge */}
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: "var(--color-accent-subtle)",
              border: "1px solid var(--color-accent-border)",
              color: "var(--color-accent)",
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--color-accent)" }}
            />
            UPI-aware · Private · On your device
          </span>

          <h1
            className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl"
            style={{ color: "var(--color-text-primary)" }}
          >
            Split trips.
            <br />
            Track every rupee.
            <br />
            <span
              style={{
                background: "var(--gradient-accent)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Settle up clean.
            </span>
          </h1>

          <p
            className="mt-5 max-w-md text-base leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Khata turns your UPI &amp; bank SMS into expenses automatically,
            splits group trips fairly, and shows you where the money went — kept
            private, on your device.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:items-start">
            <Button loading={loading} leftIcon={<GoogleMark />} onClick={onSignIn}>
              Get started — it's free
            </Button>
            <Button variant="ghost" onClick={onHowItWorks}>
              How it works
            </Button>
          </div>

          {error && (
            <p className="mt-3 text-xs" style={{ color: "var(--color-error)" }}>
              {error}
            </p>
          )}
        </div>

        {/* Phone mockup */}
        <div
          className="w-full shrink-0 lg:w-auto"
          style={{ animation: "khata-rise var(--dur-slow) var(--ease-out) 80ms both" }}
        >
          <PhoneMock />
        </div>
      </div>
    </header>
  );
}

// Pure-CSS device frame rendering a faux app preview built from real-looking
// primitives. No screenshot asset needed; exposed to AT as a single labelled
// image.
function PhoneMock() {
  return (
    <div className="mx-auto" style={{ maxWidth: 280 }}>
      <div
        role="img"
        aria-label="Preview of the Khata app: an expense list with auto-captured UPI transactions and today's balance."
        className="relative mx-auto overflow-hidden"
        style={{
          aspectRatio: "9 / 19.5",
          borderRadius: "var(--radius-xl)",
          border: "8px solid #18181b",
          background: "var(--color-bg)",
          boxShadow: "var(--shadow-elevated)",
        }}
      >
        {/* mini header */}
        <div
          className="flex items-center px-3.5"
          style={{
            height: 44,
            background: "var(--color-surface)",
            borderBottom: "1px solid var(--color-border-subtle)",
          }}
        >
          <span
            className="text-xs font-semibold"
            style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}
          >
            <span style={{ color: "var(--color-accent)" }}>₹</span> Khata
          </span>
        </div>

        {/* today balance pill */}
        <div className="px-3.5 pt-3">
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span
                className="text-[9px] font-medium uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Today's spend
              </span>
              <span
                className="text-lg font-medium tabular-nums"
                style={{ color: "var(--color-debit)", fontFamily: "var(--font-mono)" }}
              >
                ₹620
              </span>
            </div>
            <span
              className="rounded-md px-2 py-0.5 text-[9px] font-semibold tabular-nums"
              style={{ background: "var(--color-accent-bg)", color: "var(--color-accent)" }}
            >
              +₹500 net
            </span>
          </div>
        </div>

        {/* faux rows */}
        <div className="mt-2.5">
          <MockRow emoji="🍔" color="#fb923c" note="Lunch · Cafe" amount="−₹220" upi />
          <MockRow emoji="🚕" color="#60a5fa" note="Cab home" amount="−₹180" />
          <MockRow emoji="🛒" color="#a78bfa" note="Groceries" amount="−₹220" upi />
          <MockRow emoji="💸" color="#34d399" note="Riya paid you" amount="+₹500" />
        </div>

        {/* faux FAB */}
        <div
          className="absolute flex items-center justify-center"
          style={{
            right: 12,
            bottom: 14,
            width: 40,
            height: 40,
            borderRadius: "var(--radius-pill)",
            background: "var(--gradient-accent)",
            boxShadow: "var(--shadow-accent)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" stroke="var(--color-bg)" strokeWidth="2.4" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function MockRow({
  emoji,
  color,
  note,
  amount,
  upi,
}: {
  emoji: string;
  color: string;
  note: string;
  amount: string;
  upi?: boolean;
}) {
  const credit = amount.startsWith("+");
  return (
    <div
      className="flex items-center gap-2.5 px-3.5 py-2"
      style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
    >
      <span
        className="flex h-7 w-7 items-center justify-center rounded-full text-xs"
        style={{ background: color + "22", boxShadow: `inset 0 0 0 1px ${color}33` }}
      >
        {emoji}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="truncate text-[11px]" style={{ color: "var(--color-text-primary)" }}>
          {note}
        </span>
        {upi && (
          <span
            className="shrink-0 rounded px-1 py-px text-[7px] font-bold uppercase"
            style={{ background: "var(--color-accent-subtle)", color: "var(--color-accent)" }}
          >
            UPI
          </span>
        )}
      </div>
      <span
        className="shrink-0 text-[11px] tabular-nums"
        style={{
          color: credit ? "var(--color-credit)" : "var(--color-debit)",
          fontFamily: "var(--font-mono)",
        }}
      >
        {amount}
      </span>
    </div>
  );
}

/* ─────────────────────── Feature highlights ─────────────────────── */

const FEATURES: { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <IconReceipt />,
    title: "UPI auto-capture",
    body: "Bank & UPI alerts become expenses automatically. No typing, no forgetting.",
  },
  {
    icon: <IconSplit />,
    title: "Trips & settle-up",
    body: "Add a trip, split costs any way, and see exactly who owes whom — simplified.",
  },
  {
    icon: <IconChart />,
    title: "Clear insights",
    body: "Monthly spend by category and trend, so nothing sneaks up on you.",
  },
  {
    icon: <IconShield />,
    title: "Private & local-first",
    body: "Your ledger lives on your device. You choose whatever leaves it.",
  },
];

function Features() {
  return (
    <section className="mx-auto w-full max-w-screen-lg px-5 py-14 lg:py-20">
      <h2
        className="text-center text-2xl font-bold tracking-tight sm:text-3xl"
        style={{ color: "var(--color-text-primary)" }}
      >
        Everything your money needs, in one quiet app
      </h2>
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="feat-card flex flex-col gap-3 p-6">
            {/* Ringed icon badge */}
            <span
              className="flex h-11 w-11 items-center justify-center"
              style={{
                borderRadius: "var(--radius-md)",
                background: "var(--color-accent-bg)",
                border: "1px solid var(--color-accent-border)",
                color: "var(--color-accent)",
              }}
            >
              {f.icon}
            </span>
            <h3 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {f.title}
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              {f.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────── How it works ─────────────────────── */

const STEPS: { title: string; body: string }[] = [
  { title: "Sign in with Google", body: "One tap. No passwords, no setup forms." },
  {
    title: "Let UPI alerts fill it in",
    body: "Your spends log themselves — or start a trip and add shared costs.",
  },
  { title: "Split, settle & see insights", body: "Settle up cleanly and watch where it all goes." },
];

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="mx-auto w-full max-w-screen-lg px-5 py-14 lg:py-20"
    >
      <h2
        className="text-center text-2xl font-bold tracking-tight sm:text-3xl"
        style={{ color: "var(--color-text-primary)" }}
      >
        Up and running in under a minute
      </h2>
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.title} className="flex gap-4 lg:flex-col lg:gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center text-base font-bold"
              style={{
                borderRadius: "var(--radius-pill)",
                background: "var(--gradient-accent)",
                color: "var(--color-bg)",
              }}
            >
              {i + 1}
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {s.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                {s.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────── CTA band ─────────────────────── */

function CtaBand({ loading, onSignIn }: { loading: boolean; onSignIn: () => void }) {
  return (
    <section className="mx-auto w-full max-w-screen-lg px-5 pb-16">
      <div
        className="flex flex-col items-center gap-6 px-6 py-14 text-center"
        style={{
          background: "var(--gradient-hero), var(--color-surface)",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--color-border-subtle)",
        }}
      >
        <h2
          className="text-2xl font-bold tracking-tight sm:text-3xl"
          style={{ color: "var(--color-text-primary)" }}
        >
          Ready to get your khata in order?
        </h2>
        <p className="max-w-sm text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Sign in and add Khata to your home screen — it installs like a native
          app, no store needed.
        </p>
        <Button loading={loading} leftIcon={<GoogleMark />} onClick={onSignIn}>
          Continue with Google
        </Button>
      </div>
    </section>
  );
}

/* ─────────────────────── Footer ─────────────────────── */

function Footer() {
  return (
    <footer
      className="px-5 py-8 pb-safe"
      style={{ borderTop: "1px solid var(--color-border-subtle)" }}
    >
      <div className="mx-auto flex w-full max-w-screen-lg flex-col items-center gap-1.5 text-center">
        <span className="flex items-center gap-1.5">
          <BrandMark size={22} />
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}
          >
            Khata
          </span>
        </span>
        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Personal expense tracker &amp; trip splitter.
        </span>
        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Built for India · UPI-aware · © {new Date().getFullYear()}
        </span>
      </div>
    </footer>
  );
}

/* ─────────────────────── Icons (inline SVG, no emoji) ─────────────────────── */

function svgProps(extra?: string) {
  return {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: extra,
  };
}

function IconReceipt() {
  return (
    <svg {...svgProps()}>
      <path d="M4 2v20l2-1.5L8 22l2-1.5L12 22l2-1.5L16 22l2-1.5L20 22V2l-2 1.5L16 2l-2 1.5L12 2l-2 1.5L8 2 6 3.5 4 2z" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

function IconSplit() {
  return (
    <svg {...svgProps()}>
      <circle cx="9" cy="7" r="3" />
      <circle cx="17" cy="17" r="3" />
      <path d="M9 10v4a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg {...svgProps()}>
      <path d="M3 3v18h18" />
      <rect x="7" y="11" width="3" height="6" rx="0.5" />
      <rect x="13" y="7" width="3" height="10" rx="0.5" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg {...svgProps()}>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
      <path d="M9.5 12l1.8 1.8L15 10" />
    </svg>
  );
}

// Google "G" — official multi-color mark for the sign-in CTAs.
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
