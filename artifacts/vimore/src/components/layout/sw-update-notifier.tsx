'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

/**
 * Listens for the 'sw-updated' DOM event (fired by ServiceWorkerRegister
 * when the service worker broadcasts SW_UPDATED after activation) and shows
 * a persistent toast prompting the user to reload for the latest version.
 *
 * Must be rendered inside the Toaster provider tree.
 */
export function SwUpdateNotifier() {
  const { toast } = useToast();

  useEffect(() => {
    const handler = () => {
      toast({
        title: 'Update ready',
        description: 'A new version of ViMore is available.',
        duration: 0,
        action: (
          <button
            onClick={() => window.location.reload()}
            className="shrink-0 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Reload
          </button>
        ),
      });
    };

    window.addEventListener('sw-updated', handler);
    return () => window.removeEventListener('sw-updated', handler);
  }, [toast]);

  return null;
}
