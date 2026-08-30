'use client';

import { useEffect, useRef } from 'react';
import { useNetwork } from '@/context/NetworkContext';
import { usePosts } from '@/context/PostContext';
import { useToast } from '@/hooks/use-toast';
import {
  getOutboxMessages,
  removeOutboxMessage,
  incrementOutboxRetry,
} from '@/lib/offline-cache';

const MAX_RETRIES = 3;

export function OutboxRetry() {
  const { isOnline } = useNetwork();
  const { sendChatMessage, currentUser } = usePosts();
  const { toast } = useToast();
  const isRetryingRef = useRef(false);
  const prevOnlineRef = useRef(isOnline);

  useEffect(() => {
    const cameOnline = !prevOnlineRef.current && isOnline;
    prevOnlineRef.current = isOnline;

    if (!cameOnline || !currentUser || isRetryingRef.current) return;

    const outbox = getOutboxMessages();
    if (outbox.length === 0) return;

    isRetryingRef.current = true;

    (async () => {
      let sent = 0;
      let failed = 0;

      for (const msg of outbox) {
        if (msg.retries >= MAX_RETRIES) {
          removeOutboxMessage(msg.id);
          continue;
        }
        try {
          await sendChatMessage(msg.recipientId, {
            type: msg.mediaType ? (msg.mediaType as any) : 'text',
            text: msg.text,
            mediaUrl: msg.mediaUrl,
          });
          removeOutboxMessage(msg.id);
          sent++;
        } catch {
          incrementOutboxRetry(msg.id);
          failed++;
        }
      }

      if (sent > 0) {
        toast({
          title: `${sent} message${sent > 1 ? 's' : ''} delivered`,
          description: 'Your queued messages were sent after reconnecting.',
        });
      }
      if (failed > 0) {
        toast({
          variant: 'destructive',
          title: `${failed} message${failed > 1 ? 's' : ''} failed`,
          description: 'Could not send some queued messages. They will retry next time.',
        });
      }

      isRetryingRef.current = false;
    })();
  }, [isOnline, currentUser, sendChatMessage, toast]);

  return null;
}
