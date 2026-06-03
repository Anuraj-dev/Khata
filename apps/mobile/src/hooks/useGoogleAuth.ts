import { useCallback, useEffect, useState } from "react";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { authClient } from "../lib/auth-client";
import { classifyError, createActionId, mobileLogger } from "../lib/logger";

export function useGoogleAuth({
  googleWebClientId,
  googleIosClientId,
  showToast,
}: {
  googleWebClientId?: string;
  googleIosClientId?: string;
  showToast: (t: { kind: "error" | "info"; message: string }) => void;
}) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [canGoogleSignIn, setCanGoogleSignIn] = useState(false);

  useEffect(() => {
    if (!googleWebClientId) return;
    GoogleSignin.configure({
      webClientId: googleWebClientId,
      iosClientId: googleIosClientId,
      offlineAccess: true,
    });
    setCanGoogleSignIn(true);
  }, [googleWebClientId, googleIosClientId]);

  const handleGoogleSignIn = useCallback(async () => {
    if (!canGoogleSignIn || isSigningIn) return;
    const actionId = createActionId("google_signin");
    setIsSigningIn(true);
    try {
      await GoogleSignin.hasPlayServices();
      const { data } = await GoogleSignin.signIn();
      if (!data?.idToken) throw new Error("No idToken returned");
      await authClient.signIn.social({ provider: "google", idToken: { token: data.idToken } });
      mobileLogger.info("google_signin_success", { actionId });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === statusCodes.SIGN_IN_CANCELLED) {
        mobileLogger.info("google_signin_cancelled", { actionId });
        return;
      }
      mobileLogger.error("google_signin_failed", { actionId, errorType: classifyError(error) });
      showToast({ kind: "error", message: "Sign in failed. Please try again." });
    } finally {
      setIsSigningIn(false);
    }
  }, [canGoogleSignIn, isSigningIn, showToast]);

  const handleSignOut = useCallback(() => {
    void authClient.signOut();
    void GoogleSignin.signOut().catch(() => {});
  }, []);

  return { isSigningIn, canGoogleSignIn, handleGoogleSignIn, handleSignOut };
}
