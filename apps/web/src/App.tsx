import { useCallback, useState } from "react";
import { Routes, Route, Outlet } from "react-router";
import { useConvexAuth } from "convex/react";
import { Capacitor } from "@capacitor/core";
import { ConvexClientProvider } from "./lib/convex";
import { RootErrorBoundary } from "./components/RootErrorBoundary";
import { BootScreen } from "./components/BootScreen";
import { AuthScreen } from "./components/AuthScreen";
import { BottomNavBar } from "./components/BottomNavBar";
import { FAB } from "./components/FAB";
import { AddExpenseDrawer } from "./components/AddExpenseDrawer";
import { ExpensesScreen } from "./screens/ExpensesScreen";
import { TripsScreen } from "./screens/TripsScreen";
import { InsightsScreen } from "./screens/InsightsScreen";
import { SmsQueueScreen } from "./screens/SmsQueueScreen";
import { useExpenseMutations } from "./hooks/useExpenseMutations";
import { useRetryQueue } from "./hooks/useRetryQueue";
import { useSmsPoller } from "./hooks/useSmsPoller";
import type { RetryPayload } from "./hooks/useRetryQueue";
import { useLocation } from "react-router";

type Toast = { kind: "error" | "info"; message: string };

function AppShell({ isAuthenticated }: { isAuthenticated: boolean }) {
  const location = useLocation();
  const onExpensesTab = location.pathname === "/";

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  function showToast(t: Toast) {
    setToast(t);
    setTimeout(() => setToast(null), 3000);
  }

  // Retry queue — noop runner until we wire trip mutations in M4
  const runRetryPayload = useCallback(async (_payload: RetryPayload) => {}, []);
  const { enqueueRetry } = useRetryQueue({
    runRetryPayload,
    onRetryComplete: (msg) => showToast({ kind: "info", message: msg }),
  });

  const { addExpense } = useExpenseMutations({ showToast, enqueueRetry });
  useSmsPoller();

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--color-bg)" }}>
      {/* Header */}
      <header
        className="flex items-center px-4 pt-safe shrink-0"
        style={{
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border-subtle)",
          minHeight: 52,
        }}
      >
        <span
          className="text-lg font-semibold tracking-tight"
          style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}
        >
          ₹ Khata
        </span>
      </header>

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-14 left-1/2 z-50 px-4 py-2 rounded-xl text-sm font-medium shadow-lg"
          style={{
            transform: "translateX(-50%)",
            background: toast.kind === "error" ? "var(--color-error-dim)" : "var(--color-surface-elevated)",
            color: "var(--color-text-primary)",
            border: `1px solid ${toast.kind === "error" ? "var(--color-error)" : "var(--color-border-default)"}`,
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Screen content */}
      <main className="flex flex-col flex-1 overflow-hidden">
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
          {/* SMS-derived UPI inbox is native-only; never expose SMS UI on web. */}
          {Capacitor.isNativePlatform() && (
            <Route path="upi" element={<SmsQueueScreen />} />
          )}
          <Route path="trips" element={<TripsScreen />} />
          <Route path="insights" element={<InsightsScreen />} />
          <Route path="*" element={<Outlet />} />
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
  if (!isAuthenticated) return <AuthScreen />;
  return <>{children(true)}</>;
}

export function App() {
  return (
    <RootErrorBoundary>
      <ConvexClientProvider>
        <AuthGate>
          {(isAuthenticated) => <AppShell isAuthenticated={isAuthenticated} />}
        </AuthGate>
      </ConvexClientProvider>
    </RootErrorBoundary>
  );
}
