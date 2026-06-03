import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { authClient, hasCachedAuthSessionHint } from "../lib/auth-client";
import { mobileLogger } from "../lib/logger";

export type Tab = "expenses" | "trips" | "insights";
export type Toast = { kind: "error" | "info"; message: string };

export function useWorkspaceState() {
  const [activeTab, setActiveTab] = useState<Tab>("expenses");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingMutations, setPendingMutations] = useState(0);
  const [toast, setToast] = useState<Toast | null>(null);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isDataBootstrapReady, setIsDataBootstrapReady] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sessionResult = authClient.useSession();
  const session = sessionResult.data ?? null;
  const sessionLoading = sessionResult.isPending ?? false;
  const hasCachedSessionHint = hasCachedAuthSessionHint();

  useEffect(() => {
    if (sessionResult.error) {
      mobileLogger.warn("session_error", { error: String(sessionResult.error) });
    }
  }, [sessionResult.error]);

  const storeUserMutation = useMutation(api.users.store);

  useEffect(() => {
    if (!session) return;
    void storeUserMutation()
      .then(() => setIsDataBootstrapReady(true))
      .catch((e) => {
        mobileLogger.error("store_user_failed", { error: String(e) });
        setIsDataBootstrapReady(true);
      });
  }, [session, storeUserMutation]);

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  return {
    session,
    sessionLoading,
    activeTab,
    setActiveTab,
    isRefreshing,
    setIsRefreshing,
    pendingMutations,
    setPendingMutations,
    toast,
    showToast,
    isAddSheetOpen,
    setIsAddSheetOpen,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    isDataBootstrapReady,
    hasCachedSessionHint,
  };
}
