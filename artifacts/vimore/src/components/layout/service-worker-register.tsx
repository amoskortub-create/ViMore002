'use client';

import { useEffect } from 'react';

const PRECACHE_ROUTES = [
  '/',
  '/marketplace',
  '/reels',
  '/music',
  '/messages',
  '/notifications',
  '/menu',
  '/settings',
  '/search',
];

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SW_UPDATED') {
        window.dispatchEvent(new CustomEvent('sw-updated', { detail: { version: event.data.version } }));
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);

    navigator.serviceWorker
      // Never let the browser's HTTP cache keep an old worker that serves
      // stale Next bundles after an import/build.
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((reg) => {
        void reg.update();
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

        // After the SW is active, ask it to pre-cache all main routes
        // so the user can navigate offline even on their first visit.
        navigator.serviceWorker.ready.then((activeReg) => {
          activeReg.active?.postMessage({ type: 'PRECACHE_ROUTES', routes: PRECACHE_ROUTES });
        }).catch(() => {});
      })
      .catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener('message', onMessage);
    };
  }, []);

  return null;
}
