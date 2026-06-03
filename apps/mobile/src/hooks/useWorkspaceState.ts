import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { authClient, hasCachedAuthSessionHint } from "../lib/auth-client";
import { mobileLogger } from "../lib/logger";

export type Tab = "expenses" | "trips" | "insights";
export type Toast = { kind: "error" | "info"; message: string };

export function useWorkspaceState() {
  const [session, setSession] = useState<object | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("expenses");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingMutations, setPendingMutations] = useState(0);
  const [toast, setToast] = useState<Toast | null>(null);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isDataBootstrapReady, setIsDataBootstrapReady] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasCachedSessionHint = hasCachedAuthSessionHint();

  const storeUserMutation = useMutation(api.users.store);

  useEffect(() => {
    const { data, error } = authClient.useSession();
    setSession(data?.session ?? null);
    setSessionLoading(false);
    if (error) mobileLogger.warn("session_error", { error: String(error) });
  }, []);

  useEffect(() => {
    if (!session) return;
    void storeUserMutation().then(() => setIsDataBootstrapReady(true)).catch((e) => {
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
