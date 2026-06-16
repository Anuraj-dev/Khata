import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import { useConvexAuth } from "convex/react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useFonts as useGeistFonts,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from "@expo-google-fonts/geist";
import { GeistMono_500Medium } from "@expo-google-fonts/geist-mono";

import { ConvexClientProvider } from "./src/lib/convex";
import { authStorageReady } from "./src/lib/auth-client";
import { colors, fonts, spacing, typography } from "./src/theme/tokens";
import { BootScreen } from "./src/components/BootScreen";
import { RootErrorBoundary } from "./src/components/RootErrorBoundary";
import { ScreenErrorBoundary } from "./src/components/ScreenErrorBoundary";
import { MobileAuthScreen } from "./src/components/MobileAuthScreen";
import { BottomTabBar } from "./src/components/BottomTabBar";
import { FAB } from "./src/components/FAB";
import { ConfirmDialog } from "./src/components/ConfirmDialog";
import { ExpensesScreen } from "./src/screens/ExpensesScreen";
import { AddExpenseSheet } from "./src/components/AddExpenseSheet";
import { useExpenseMutations } from "./src/hooks/useExpenseMutations";
import { TripsScreen } from "./src/screens/TripsScreen";
import { InsightsScreen } from "./src/screens/InsightsScreen";
import { useWorkspaceState } from "./src/hooks/useWorkspaceState";
import { useGoogleAuth } from "./src/hooks/useGoogleAuth";
import { useRetryQueue, type RetryPayload } from "./src/hooks/useRetryQueue";
import { useConfirm } from "./src/hooks/useConfirm";

function MobileApp() {
  const insets = useSafeAreaInsets();
  const [isGuestMode, setIsGuestMode] = useState(false);
  const { isAuthenticated } = useConvexAuth();

  const {
    session,
    sessionLoading,
    activeTab,
    setActiveTab,
    isRefreshing,
    setIsRefreshing,
    pendingMutations,
    toast,
    showToast,
    isAddSheetOpen,
    setIsAddSheetOpen,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    hasCachedSessionHint,
  } = useWorkspaceState();

  const runRetryPayload = useCallback(async (_payload: RetryPayload) => {
    // retry logic wired after mutations are set up
  }, []);

  const { addExpense } = useExpenseMutations({ showToast, enqueueRetry: () => {} });

  const { retryQueue, enqueueRetry, retryQueuedMutations } = useRetryQueue({
    runRetryPayload,
    onRetryComplete: (msg) => showToast({ kind: "info", message: msg }),
  });

  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined;

  const { isSigningIn, canGoogleSignIn, handleGoogleSignIn, handleSignOut } = useGoogleAuth({
    googleWebClientId,
    googleIosClientId,
    showToast,
  });

  const tabBarBottomPadding = Math.max(insets.bottom, spacing.md);
  const tabBarHeight = 60 + tabBarBottomPadding;
  const fabBottom = tabBarHeight + spacing.xl;

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isSettingsModalOpen) { setIsSettingsModalOpen(false); return true; }
      if (isAddSheetOpen) { setIsAddSheetOpen(false); return true; }
      return false;
    });
    return () => sub.remove();
  }, [isAddSheetOpen, isSettingsModalOpen, setIsAddSheetOpen, setIsSettingsModalOpen]);

  if (sessionLoading && !hasCachedSessionHint && !isGuestMode) {
    return <BootScreen detail="Starting Khata..." />;
  }

  if (!session && !isGuestMode) {
    return (
      <MobileAuthScreen
        canGoogleSignIn={canGoogleSignIn}
        isSigningIn={isSigningIn}
        onGoogleSignIn={() => void handleGoogleSignIn()}
        onSkip={() => setIsGuestMode(true)}
      />
    );
  }

  const headerTitle =
    activeTab === "expenses" ? "Expenses" :
    activeTab === "trips" ? "Trips" : "Insights";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <View style={styles.headerRow}>
          <Text style={styles.wordmark}>Khata</Text>
          <Text style={styles.headerTitle}>{headerTitle}</Text>
        </View>
        {pendingMutations > 0 ? (
          <Text style={styles.syncText}>Syncing</Text>
        ) : null}
      </View>

      {/* Guest mode banner */}
      {isGuestMode && !session ? (
        <Pressable
          style={styles.guestBanner}
          onPress={() => void handleGoogleSignIn()}
        >
          <Text style={styles.guestBannerText}>
            Guest mode — tap to sign in and sync data
          </Text>
        </Pressable>
      ) : null}

      {/* Toast */}
      {toast ? (
        <View style={[styles.toast, toast.kind === "error" ? styles.toastError : styles.toastInfo]}>
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      ) : null}

      {/* Retry banner */}
      {retryQueue.length > 0 ? (
        <View style={styles.retryBanner}>
          <Text style={styles.retryText}>
            {retryQueue.length} change{retryQueue.length === 1 ? "" : "s"} pending sync
          </Text>
          <Text
            onPress={() => void retryQueuedMutations()}
            style={styles.retryAction}
          >
            Retry
          </Text>
        </View>
      ) : null}

      {/* Screens */}
      {activeTab === "expenses" ? (
        <ScreenErrorBoundary screenName="Expenses">
          <ExpensesScreen
            isAuthenticated={isAuthenticated}
            onAddPress={() => setIsAddSheetOpen(true)}
          />
        </ScreenErrorBoundary>
      ) : null}
      {activeTab === "trips" ? (
        <ScreenErrorBoundary screenName="Trips">
          <TripsScreen />
        </ScreenErrorBoundary>
      ) : null}
      {activeTab === "insights" ? (
        <ScreenErrorBoundary screenName="Insights">
          <InsightsScreen />
        </ScreenErrorBoundary>
      ) : null}

      {/* Add Expense Sheet */}
      {activeTab === "expenses" ? (
        <AddExpenseSheet
          visible={isAddSheetOpen}
          onClose={() => setIsAddSheetOpen(false)}
          onSave={addExpense}
        />
      ) : null}

      {/* FAB */}
      {(session || isGuestMode) && !isAddSheetOpen && activeTab !== "insights" ? (
        <FAB
          bottom={fabBottom}
          onPress={() => setIsAddSheetOpen(true)}
          label={activeTab === "trips" ? "Trip" : "Expense"}
        />
      ) : null}

      {/* Tab bar */}
      <BottomTabBar
        active={activeTab}
        onChange={setActiveTab}
        bottomInset={tabBarBottomPadding}
      />
    </SafeAreaView>
  );
}

function LaunchGate({ children }: { children: ReactNode }) {
  const [storageReady, setStorageReady] = useState(false);
  const [fontsLoaded] = useGeistFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    GeistMono_500Medium,
  });

  useEffect(() => {
    let mounted = true;
    authStorageReady.finally(() => { if (mounted) setStorageReady(true); });
    return () => { mounted = false; };
  }, []);

  if (!fontsLoaded || !storageReady) {
    return <BootScreen detail={!fontsLoaded ? "Loading fonts..." : "Restoring session..."} />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LaunchGate>
          <ConvexClientProvider>
            <RootErrorBoundary>
              <MobileApp />
            </RootErrorBoundary>
          </ConvexClientProvider>
        </LaunchGate>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  wordmark: {
    fontFamily: fonts.sansBold,
    fontSize: 20,
    letterSpacing: -0.5,
    color: colors.accent,
  },
  headerTitle: {
    ...typography.display,
    color: colors.textPrimary,
  },
  syncText: {
    ...typography.micro,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  toast: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingLeft: spacing.md,
    paddingVertical: spacing.xs,
    borderLeftWidth: 2,
  },
  toastError: { borderLeftColor: colors.error },
  toastInfo: { borderLeftColor: colors.accent },
  toastText: { ...typography.bodyMd, color: colors.textPrimary },
  retryBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingLeft: spacing.md,
    paddingVertical: spacing.xs,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  retryText: { ...typography.bodyMd, color: colors.textPrimary, flex: 1 },
  retryAction: { ...typography.micro, color: colors.accent },
  guestBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: 6,
    alignItems: "center",
  },
  guestBannerText: { ...typography.micro, color: colors.textMuted },
});
