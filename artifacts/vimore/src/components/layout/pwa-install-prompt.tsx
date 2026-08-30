'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'vimore-install-dismissed-at';
const DISMISS_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 7;

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }

    try {
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (dismissedAt && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) return;
    } catch {}

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onInstalled = () => {
      setInstalled(true);
      setVisible(false);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'dismissed') {
        try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
      }
    } finally {
      setDeferred(null);
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setVisible(false);
  };

  if (installed || !visible || !deferred) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Install ViMore"
      className="fixed bottom-4 left-1/2 z-[9999] -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-sm rounded-2xl border border-white/10 bg-[#1a0b2e]/95 backdrop-blur-xl shadow-2xl px-4 py-3 flex items-center gap-3 animate-in slide-in-from-bottom-4 fade-in duration-300"
    >
      <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-[#6200ea] flex items-center justify-center">
        <Download className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm leading-tight">Install ViMore</p>
        <p className="text-white/70 text-xs leading-tight mt-0.5">
          Add to your home screen for the full app experience.
        </p>
      </div>
      <button
        onClick={handleInstall}
        className="flex-shrink-0 bg-[#9940E5] hover:bg-[#8233cc] text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss install prompt"
        className="flex-shrink-0 text-white/60 hover:text-white p-1 rounded-md transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
