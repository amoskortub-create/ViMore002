'use client';

import { useEffect } from 'react';
import { useNotifications } from '@/context/NotificationContext';

/**
 * Keeps the installed PWA's app-icon badge (Badging API) in sync with
 * the current unread notifications + unread messages count.
 * Works on Android Chrome, Edge, and supported desktop browsers.
 */
export function AppBadgeSync() {
  const { unreadCount, unreadMessageCount } = useNotifications();
  const total = (unreadCount || 0) + (unreadMessageCount || 0);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

    const nav = navigator as any;
    try {
      if (total > 0 && typeof nav.setAppBadge === 'function') {
        nav.setAppBadge(total).catch(() => {});
      } else if (typeof nav.clearAppBadge === 'function') {
        nav.clearAppBadge().catch(() => {});
      }
    } catch {}

    // Also inform the service worker so it can update the badge when the tab is closed.
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        navigator.serviceWorker.controller.postMessage({
          type: total > 0 ? 'SET_BADGE' : 'CLEAR_BADGE',
          count: total,
        });
      } catch {}
    }
  }, [total]);

  return null;
}
