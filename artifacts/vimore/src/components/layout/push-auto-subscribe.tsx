'use client';

import { useEffect } from 'react';
import { subscribeToPush, isPushSupported } from '@/lib/push-notifications';

/**
 * After the first user interaction, attempt to subscribe the user to web push.
 * Silently no-ops if VAPID key is unset, permission is denied, or push is unsupported.
 */
export function PushAutoSubscribe() {
  useEffect(() => {
    if (!isPushSupported()) return;
    if (Notification.permission === 'denied') return;

    const tryOnce = () => {
      subscribeToPush().catch(() => {});
      window.removeEventListener('pointerdown', tryOnce);
      window.removeEventListener('keydown', tryOnce);
    };

    // Wait for user interaction so the permission prompt isn't blocked by the browser.
    window.addEventListener('pointerdown', tryOnce, { once: true });
    window.addEventListener('keydown', tryOnce, { once: true });

    return () => {
      window.removeEventListener('pointerdown', tryOnce);
      window.removeEventListener('keydown', tryOnce);
    };
  }, []);

  return null;
}
