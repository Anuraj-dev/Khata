import { useCallback, useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router";
import { useConvexAuth } from "convex/react";
import { Capacitor } from "@capacitor/core";
import { ConvexClientProvider } from "./lib/convex";
import { RootErrorBoundary } from "./components/RootErrorBoundary";
import { BootScreen } from "./components/BootScreen";
import { AuthScreen } from "./components/AuthScreen";
import { BottomNavBar } from "./components/BottomNavBar";
import { FAB } from "./components/FAB";
import { AddExpenseDrawer } from "./components/AddExpenseDrawer";
import { BrandMark } from "./components/BrandMark";
import { LandingScreen } from "./screens/LandingScreen";
import { ExpensesScreen } from "./screens/ExpensesScreen";
import { TripsScreen } from "./screens/TripsScreen";
import { TripDetailScreen } from "./screens/TripDetailScreen";
import { InsightsScreen } from "./screens/InsightsScreen";
import { JoinTripScreen } from "./screens/JoinTripScreen";
import { SmsQueueScreen } from "./screens/SmsQueueScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { captureJoinFromUrl, takePendingJoin } from "./lib/joinLink";
import { useExpenseMutations } from "./hooks/useExpenseMutations";
import { useRetryQueue } from "./hooks/useRetryQueue";
import { useSmsPoller } from "./hooks/useSmsPoller";
import { useDeepLinkAuth } from "./hooks/useDeepLinkAuth";
import { usePushNotifications } from "./hooks/usePushNotifications";
import type { RetryPayload } from "./hooks/useRetryQueue";
import { useLocation, useNavigate } from "react-router";

type Toast = { kind: "error" | "info"; message: string };

function AppShell({ isAuthenticated }: { isAuthenticated: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const onExpensesTab = location.pathname === "/";

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  function showToast(t: Toast) {
    setToast(t);
    setTimeout(() => setToast(null), 3000);
  }

  // Retry queue — noop runner until we wire trip mutations in M4
  const runRetryPayload = useCallback(async (_payload: RetryPayload) => { }, []);
  const { enqueueRetry } = useRetryQueue({
    runRetryPayload,
    onRetryComplete: (msg) => showToast({ kind: "info", message: msg }),
  });

  const { addExpense } = useExpenseMutations({ showToast, enqueueRetry });
  useSmsPoller();
  usePushNotifications();

  // Resume a trip invite that was opened before sign-in (the token was stashed
  // pre-auth so it survives the OAuth round-trip).
  useEffect(() => {
    const token = takePendingJoin();
    if (token && location.pathname !== `/join/${token}`) {
      navigate(`/join/${token}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--color-bg)" }}>
      {/* Header */}
      <header
        className="flex items-center px-4 pt-safe shrink-0"
        style={{
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border-subtle)",
          boxShadow: "0 1px 0 rgba(0,0,0,0.4)",
          minHeight: 52,
        }}
      >
        <span className="flex items-center gap-2">
          <BrandMark size={26} />
          <span
            className="text-lg font-semibold tracking-tight"
            style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}
          >
            Khata
          </span>
        </span>
        <button
          onClick={() => navigate("/settings")}
          aria-label="Settings"
          className="ml-auto flex h-11 w-11 -mr-2 items-center justify-center transition-colors"
          style={{
            color: "var(--color-text-secondary)",
            background: "none",
            border: "none",
            borderRadius: "var(--radius-md)",
            transitionDuration: "var(--dur-fast)",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-secondary)")}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </header>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-14 left-1/2 z-50 px-4 py-2 text-sm font-medium"
          style={{
            transform: "translateX(-50%)",
            background: toast.kind === "error" ? "var(--color-error-dim)" : "var(--color-surface-elevated)",
            color: "var(--color-text-primary)",
            border: `1px solid ${toast.kind === "error" ? "var(--color-error)" : "var(--color-border-default)"}`,
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-elevated)",
            animation: "khata-rise var(--dur-mid) var(--ease-out)",
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Screen content */}
      <main className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <Routes>
          <Route
            index
            element={
              <ExpensesScreen
                isAuthenticated={isAuthenticated}
                onAddPress={() => setDrawerOpen(true)}
              />
            }
          />
          {/* SMS review queue is native-only; never expose SMS UI on web. */}
          {Capacitor.isNativePlatform() && (
            <Route path="review" element={<SmsQueueScreen />} />
          )}
          <Route path="trips" element={<TripsScreen />} />
          <Route path="trips/:tripId" element={<TripDetailScreen />} />
          <Route path="join/:token" element={<JoinTripScreen />} />
          <Route path="insights" element={<InsightsScreen />} />
          <Route path="settings" element={<SettingsScreen showToast={showToast} />} />
          {/* Unknown path (e.g. a stale PWA shell that predates a route) →
              home, never a blank screen. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <BottomNavBar />

      {/* FAB — only on expenses tab */}
      {onExpensesTab && <FAB onClick={() => setDrawerOpen(true)} />}

      {/* Add expense drawer */}
      <AddExpenseDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSave={addExpense}
      />
    </div>
  );
}

function AuthGate({ children }: { children: (isAuthenticated: boolean) => React.ReactNode }) {
  // Reactive auth state from Convex. Unlike a one-shot getSession(), this flips
  // to authenticated automatically once the token lands after the OAuth redirect,
  // so the user lands logged in without a manual refresh.
  const { isLoading, isAuthenticated } = useConvexAuth();

  if (isLoading) return <BootScreen />;
  // Logged-out: web gets the marketing landing; native (installed app) goes
  // straight to sign-in — a marketing page makes no sense inside the app.
  if (!isAuthenticated) {
    return Capacitor.isNativePlatform() ? <AuthScreen /> : <LandingScreen />;
  }
  return <>{children(true)}</>;
}

function DeepLinkHandler() {
  useDeepLinkAuth();
  return null;
}

export function App() {
  // Stash an invite token from the initial URL before auth runs, so a not-yet-
  // signed-in recipient still lands on the trip after the OAuth round-trip.
  useEffect(() => { captureJoinFromUrl(); }, []);

  return (
    <RootErrorBoundary>
      <ConvexClientProvider>
        <DeepLinkHandler />
        <AuthGate>
          {(isAuthenticated) => <AppShell isAuthenticated={isAuthenticated} />}
        </AuthGate>
      </ConvexClientProvider>
    </RootErrorBoundary>
  );
}
