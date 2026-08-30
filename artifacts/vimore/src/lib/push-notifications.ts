/**
 * Web Push subscription helpers.
 *
 * Usage from a client component:
 *   await subscribeToPush();   // asks permission + subscribes + POSTs to /api/push/subscribe
 *   await unsubscribeFromPush();
 *
 * Requires `NEXT_PUBLIC_VAPID_PUBLIC_KEY` to be set for real push delivery.
 * If the key is missing, the helpers no-op gracefully so the rest of the PWA
 * (install prompt, offline, badging from local state) keeps working.
 */

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return 'denied';
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  return await Notification.requestPermission();
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BGRfT6eaMS4SJwWAA4ZM-IR32_qDO1xAoyq3N5LqF6kLgPXLdBrC1WExJEt0daf091gcfZhlSezLv4FqWCFikk0';
  if (!vapidKey) {
    console.warn('[push] VAPID public key not set; skipping subscribe.');
    return null;
  }

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') return null;

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as BufferSource,
    });
  }

  try {
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub.toJSON()),
    });
  } catch (err) {
    console.warn('[push] failed to POST subscription to server', err);
  }

  return sub;
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return true;

  try {
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
  } catch {}

  return await sub.unsubscribe();
}

export async function getPushPermissionState(): Promise<NotificationPermission | 'unsupported'> {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}
