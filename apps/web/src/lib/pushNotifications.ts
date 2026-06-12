import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

type RegisterFn = (args: { fcmToken: string; platform: string }) => Promise<unknown>;
type NavigateFn = (path: string) => void;

export async function initPushNotifications(
  register: RegisterFn,
  navigate: NavigateFn
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Register listeners before calling register() so the registration token
    // event (which fires immediately on some devices) is never missed.
    await PushNotifications.addListener("registration", (token) => {
      register({ fcmToken: token.value, platform: Capacitor.getPlatform() }).catch(
        (e) => console.error("Push token registration failed:", e)
      );
    });

    await PushNotifications.addListener("registrationError", (err) => {
      console.error("Push registration error:", err.error);
    });

    // Foreground: FCM delivers the notification to this listener instead of
    // showing it automatically. We re-navigate so the user isn't left on a
    // stale screen, but we don't pop a native alert (app is already open).
    await PushNotifications.addListener("pushNotificationReceived", (notification) => {
      const data: Record<string, string> = notification.data ?? {};
      if (data.type === "trip_expense" && data.tripId) {
        navigate(`/trips/${data.tripId}`);
      } else if (data.type === "sms_review") {
        navigate("/");
      } else if (data.type === "settlement") {
        navigate("/trips");
      }
    });

    await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const data: Record<string, string> = action.notification.data ?? {};
      if (data.type === "trip_expense" && data.tripId) {
        navigate(`/trips/${data.tripId}`);
      } else if (data.type === "sms_review") {
        navigate("/");
      } else if (data.type === "settlement") {
        navigate("/trips");
      } else if (data.type === "budget" || data.type === "cash_nudge") {
        navigate("/");
      }
    });

    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") return;

    await PushNotifications.register();
  } catch (e) {
    // Never let a push-setup failure bubble up — it must not break app startup.
    console.error("Push notification init failed:", e);
  }
}
