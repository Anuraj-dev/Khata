import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

type RegisterFn = (args: { fcmToken: string; platform: string }) => Promise<unknown>;
type NavigateFn = (path: string) => void;

export async function initPushNotifications(
  register: RegisterFn,
  navigate: NavigateFn
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return;

  await PushNotifications.register();

  PushNotifications.addListener("registration", (token) => {
    register({ fcmToken: token.value, platform: Capacitor.getPlatform() }).catch(
      (e) => console.error("Push token registration failed:", e)
    );
  });

  PushNotifications.addListener("registrationError", (err) => {
    console.error("Push registration error:", err.error);
  });

  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    const data: Record<string, string> = action.notification.data ?? {};
    if (data.type === "trip_expense" && data.tripId) {
      navigate(`/trips/${data.tripId}`);
    } else if (data.type === "sms_review") {
      navigate("/");
    } else if (data.type === "settlement") {
      navigate("/trips");
    }
  });
}
