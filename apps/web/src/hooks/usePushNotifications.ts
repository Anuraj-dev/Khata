import { useEffect } from "react";
import { useMutation } from "convex/react";
import { useNavigate } from "react-router";
import { Capacitor } from "@capacitor/core";
import { api } from "@convex/_generated/api";
import { initPushNotifications } from "../lib/pushNotifications";

export function usePushNotifications() {
  const registerToken = useMutation(api.pushTokens.registerToken);
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    initPushNotifications(registerToken, navigate);
    // Listeners are set once on mount and cleaned up when the component unmounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
