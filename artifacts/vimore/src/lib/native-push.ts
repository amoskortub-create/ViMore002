import { Capacitor } from "@capacitor/core";
import { PushNotifications, type Token } from "@capacitor/push-notifications";

let listenersRegistered = false;

export function isNativePushAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

async function saveToken(token: Token, userId: string): Promise<void> {
  await fetch("/api/push/native-subscribe", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: token.value, userId }),
  });
}

export async function registerNativePush(
  userId: string,
  onOpen?: (url: string) => void,
): Promise<void> {
  if (!isNativePushAvailable() || !userId) return;

  const permission = await PushNotifications.checkPermissions();
  const requested =
    permission.receive === "prompt"
      ? await PushNotifications.requestPermissions()
      : permission;
  if (requested.receive !== "granted") return;

  if (!listenersRegistered) {
    listenersRegistered = true;
    await PushNotifications.addListener("registration", (token) => {
      saveToken(token, userId).catch((error) =>
        console.warn("[native-push] token save failed", error),
      );
    });
    await PushNotifications.addListener("registrationError", (error) => {
      console.warn("[native-push] registration failed", error);
    });
    await PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action) => {
        const url = (action.notification.data as { url?: string } | undefined)
          ?.url;
        if (url && url.startsWith("/")) onOpen?.(url);
      },
    );
  }

  await PushNotifications.register();
}
