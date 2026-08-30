'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { client, DATABASE_ID, COL, formatTimeAgo } from '@/lib/appwrite';
import { usePosts, PostComment } from '@/context/PostContext';
import { useNotifications } from '@/context/NotificationContext';
import { useAdminAlerts } from '@/context/AdminAlertsContext';
import { useFeedSignal } from '@/context/FeedSignalContext';
import { useNetwork } from '@/context/NetworkContext';
const POST_ACTIVE_PATHS = ['/', '/reels', '/music', '/explore'];

function isPostActivePage(pathname: string): boolean {
  if (POST_ACTIVE_PATHS.includes(pathname)) return true;
  if (pathname.startsWith('/profile/')) return true;
  if (pathname.startsWith('/music')) return true;
  return false;
}

const ADMIN_ALERT_SOUND = '/sounds/notification.mp3';

function playAdminSound(type: 'withdrawal' | 'highTicket' | 'payment') {
  if (typeof window === 'undefined') return;
  try {
    const audio = new Audio(ADMIN_ALERT_SOUND);
    audio.volume = type === 'withdrawal' ? 0.9 : type === 'highTicket' ? 0.75 : 0.6;
    audio.playbackRate = type === 'withdrawal' ? 1.3 : 1.0;
    audio.play().catch(() => {});
  } catch { /* ignore */ }
}

export function GlobalRealtimeListener() {
  const pathname = usePathname();
  const onPostPage = isPostActivePage(pathname);
  const { tier } = useNetwork();
  // On Lite networks, skip ambient post / comment streams to save bytes + battery.
  const ambientRealtimeEnabled = tier !== 'lite';

  const {
    currentUser, selectedChatId, refreshAdminData,
    followingUserIds, applyPostCountUpdate, addStreamedComment, activeCommentPostId,
    addIncomingMessage, applyRemotePostEdit, refreshSocialGraph, applyReadReceipt, applyClusterMemberReceipt,
    updateConnectionPresence, connections, clusters,
    updateUserOnlineStatus,
  } = usePosts();
  const {
    incrementPulse, updateMessagePreview, refreshNotifications,
    incrementUnreadMessageCount, decrementUnreadMessageCount,
  } = useNotifications();
  const {
    incrementPendingPayments,
    incrementPendingWithdrawals,
    incrementOpenTickets,
  } = useAdminAlerts();
  const { incrementNewPosts } = useFeedSignal();

  const currentUserRef              = useRef(currentUser);
  const selectedChatRef             = useRef(selectedChatId);
  const followingUserIdsRef         = useRef(followingUserIds);
  const activeCommentPostRef        = useRef(activeCommentPostId);
  const updatePresenceRef           = useRef(updateConnectionPresence);
  const connectionsRef              = useRef(connections);
  const clustersRef                 = useRef(clusters);
  const updateUserOnlineStatusRef   = useRef(updateUserOnlineStatus);
  const adminRefTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { currentUserRef.current             = currentUser;               }, [currentUser]);
  useEffect(() => { selectedChatRef.current            = selectedChatId;            }, [selectedChatId]);
  useEffect(() => { followingUserIdsRef.current        = followingUserIds;          }, [followingUserIds]);
  useEffect(() => { activeCommentPostRef.current       = activeCommentPostId;       }, [activeCommentPostId]);
  useEffect(() => { updatePresenceRef.current          = updateConnectionPresence;  }, [updateConnectionPresence]);
  useEffect(() => { connectionsRef.current             = connections;               }, [connections]);
  useEffect(() => { clustersRef.current                = clusters;                  }, [clusters]);
  useEffect(() => { updateUserOnlineStatusRef.current  = updateUserOnlineStatus;    }, [updateUserOnlineStatus]);

  const debouncedAdminRefresh = useCallback(() => {
    if (adminRefTimerRef.current) clearTimeout(adminRefTimerRef.current);
    adminRefTimerRef.current = setTimeout(() => {
      refreshAdminData().catch(() => {});
    }, 700);
  }, [refreshAdminData]);

  useEffect(() => {
    return () => {
      if (adminRefTimerRef.current) clearTimeout(adminRefTimerRef.current);
    };
  }, []);

  // ─── Core social + admin channels ───────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.$id) return;

    const isAdmin = currentUser.role && currentUser.role !== 'USER';

    const channels: string[] = [
      `databases.${DATABASE_ID}.collections.${COL.MESSAGES}.documents`,
      `databases.${DATABASE_ID}.collections.${COL.GROUP_MESSAGES}.documents`,
      `databases.${DATABASE_ID}.collections.${COL.NOTIFICATIONS}.documents`,
      `databases.${DATABASE_ID}.collections.${COL.FRIEND_REQUESTS}.documents`,
      `databases.${DATABASE_ID}.collections.${COL.CHAT_READ_RECEIPTS}.documents`,
    ];
    if (isAdmin) {
      channels.push(`databases.${DATABASE_ID}.collections.${COL.REPORTS}.documents`);
    }

    const unsubscribe = client.subscribe(channels, (response) => {
      const events: string[] = response.events as string[];
      const payload = response.payload as any;
      if (!payload) return;

      const isCreate = events.some(e => e.endsWith('.create'));
      const isUpdate = events.some(e => e.endsWith('.update'));

      const isGroupMessageEvent = events.some(e => e.includes(`.${COL.GROUP_MESSAGES}.`));
      const isDmMessageEvent    = events.some(e => e.includes(`.${COL.MESSAGES}.`) && !e.includes(`.${COL.GROUP_MESSAGES}.`));
      const isMessageEvent      = isGroupMessageEvent || isDmMessageEvent;
      const isNotificationEvent = events.some(e => e.includes(`.${COL.NOTIFICATIONS}.`));
      const isFriendReqEvent    = events.some(e => e.includes(`.${COL.FRIEND_REQUESTS}.`));
      const isReportEvent       = events.some(e => e.includes(`.${COL.REPORTS}.`));
      const isReceiptEvent      = events.some(e => e.includes(`.${COL.CHAT_READ_RECEIPTS}.`));

      const user   = currentUserRef.current;
      const chatId = selectedChatRef.current;

      if (isMessageEvent && isCreate) {
        if (payload.sender_id !== user?.$id) {
          const clusterId: string = payload.cluster_id || '';

          // For group messages, verify this user is actually a member of that cluster.
          // For DMs, any message arriving on this subscription is already addressed to this user.
          const isUserMember = isGroupMessageEvent
            ? clustersRef.current.some(cl => cl.$id === clusterId)
            : true;

          if (clusterId && isUserMember) {
            const rawText =
              payload.text
                ? String(payload.text).slice(0, 80)
                : payload.type === 'voice'
                  ? '🎤 Voice message'
                  : payload.media_url
                    ? '📷 Media'
                    : 'New message';
            const timeStr = payload.$createdAt ? formatTimeAgo(payload.$createdAt) : 'Just now';

            // Build the incoming message object
            const incomingMsg = {
              $id: payload.$id || `msg_${Date.now()}`,
              sender: 'them' as const,
              senderId: payload.sender_id || '',
              senderName: payload.sender_name || '',
              senderAvatar: payload.sender_avatar || '',
              text: payload.text || undefined,
              time: timeStr,
              status: 'delivered' as const,
              type: (payload.type || 'text') as any,
              mediaUrl: payload.media_url || undefined,
              voiceDuration: payload.voice_duration || undefined,
              replyToId: payload.reply_to_id || undefined,
              replyToText: payload.reply_to_text || undefined,
              replyToSenderName: payload.reply_to_sender_name || undefined,
              replyToType: payload.reply_to_type || undefined,
            };

            // Instantly update both the message list and the chat preview sidebar
            addIncomingMessage(clusterId, incomingMsg, rawText, timeStr);
            updateMessagePreview(clusterId, rawText, timeStr);

            // Badge + unread count
            const isInCurrentChat = chatId && clusterId === chatId;
            if (!isInCurrentChat) {
              incrementPulse('MESSAGES');
              // Group: increment for all members. DM: only if directly addressed.
              if (isGroupMessageEvent || payload.receiver_id === user?.$id) {
                incrementUnreadMessageCount();
              }
            } else {
              // User has this chat open — clear badge if it was a DM
              if (isDmMessageEvent && payload.receiver_id === user?.$id) {
                decrementUnreadMessageCount(0);
              }
            }
          }
        }
      }

      if (isNotificationEvent && isCreate) {
        if (payload.user_id === user?.$id) {
          if (user) refreshNotifications(user.$id);
        }
      }

      if (isFriendReqEvent && (isCreate || isUpdate)) {
        if (payload.to_user_id === user?.$id || payload.from_user_id === user?.$id) {
          incrementPulse('FRIENDS');
          refreshSocialGraph().catch(() => {});
        }
      }

      if (isReportEvent && isCreate && isAdmin) {
        incrementPulse('ADMIN');
      }

      if (isReceiptEvent && (isCreate || isUpdate)) {
        if (payload.user_id === user?.$id) {
          applyReadReceipt(payload.cluster_id, payload.last_read_at, payload.$id);
        } else {
          // Another member read this cluster — update cluster member receipts
          applyClusterMemberReceipt(payload.cluster_id, payload.user_id, payload.last_read_at);
        }
      }
    });

    return () => { unsubscribe(); };
  }, [currentUser?.$id, currentUser?.role, incrementPulse, updateMessagePreview, refreshNotifications, addIncomingMessage, incrementUnreadMessageCount, decrementUnreadMessageCount, refreshSocialGraph, applyReadReceipt, applyClusterMemberReceipt]);

  // ─── Post interaction counts (likes / comments / shares) ─────────────────
  useEffect(() => {
    if (!currentUser?.$id || !onPostPage || !ambientRealtimeEnabled) return;

    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.${COL.POSTS}.documents`,
      (response) => {
        const events: string[] = response.events as string[];
        const payload = response.payload as any;
        if (!payload) return;
        const postId: string = payload.$id;
        if (!postId) return;

        const isCreate = events.some(e => e.endsWith('.create'));
        const isUpdate = events.some(e => e.endsWith('.update'));

        if (isUpdate) {
          const update: { likes?: number; unlikes?: number; comments?: number; shares?: number } = {};
          if (typeof payload.likes_count === 'number')    update.likes    = payload.likes_count;
          if (typeof payload.unlikes_count === 'number')  update.unlikes  = payload.unlikes_count;
          if (typeof payload.comments_count === 'number') update.comments = payload.comments_count;
          if (typeof payload.shares_count === 'number')   update.shares   = payload.shares_count;
          if (Object.keys(update).length > 0) {
            applyPostCountUpdate(postId, update);
          }
          // Propagate content edits to all users' feeds in real-time
          if (typeof payload.content === 'string') {
            applyRemotePostEdit(postId, payload.content);
          }
        }

        if (isCreate) {
          const authorId: string = payload.user_id || '';
          const me = currentUserRef.current;
          if (authorId && me && authorId !== me.$id) {
            if (followingUserIdsRef.current.has(authorId)) {
              incrementNewPosts();
              incrementPulse('HOME');
            }
          }
          // AI moderation — fire-and-forget, no await, never blocks the UI
          const textToScan = [payload.content, payload.caption].filter(Boolean).join(' ').trim();
          if ((textToScan || payload.media_url) && payload.$id) {
            fetch('/api/moderate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                docId: payload.$id,
                collection: COL.POSTS,
                text: textToScan,
                userId: payload.user_id || '',
                mediaUrl: payload.media_url || payload.image_url || undefined,
              }),
            }).catch(() => {});
          }
        }
      }
    );

    return () => { unsubscribe(); };
  }, [currentUser?.$id, onPostPage, ambientRealtimeEnabled, applyPostCountUpdate, applyRemotePostEdit, incrementNewPosts, incrementPulse]);

  // ─── Real-time comment streaming ─────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.$id || !onPostPage || !ambientRealtimeEnabled) return;

    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.${COL.POST_COMMENTS}.documents`,
      (response) => {
        const events: string[] = response.events as string[];
        const payload = response.payload as any;
        if (!payload) return;
        const isCreate = events.some(e => e.endsWith('.create'));
        if (!isCreate) return;

        const targetPostId: string = payload.post_id || '';
        const activeId = activeCommentPostRef.current;
        if (!targetPostId || !activeId || targetPostId !== activeId) return;

        const comment: PostComment = {
          $id: payload.$id,
          userId: payload.user_id || '',
          userName: payload.user_name || 'Unknown',
          userAvatar: payload.user_avatar || '',
          text: payload.text || payload.content || '',
          time: payload.$createdAt ? formatTimeAgo(payload.$createdAt) : 'Just now',
          timestamp: payload.$createdAt ? new Date(payload.$createdAt).getTime() : Date.now(),
          parentId: payload.parent_id || undefined,
        };
        addStreamedComment(comment);
      }
    );

    return () => { unsubscribe(); };
  }, [currentUser?.$id, onPostPage, ambientRealtimeEnabled, addStreamedComment]);

  // ─── Admin financial channels ─────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.$id) return;
    const isAdmin = currentUser.role && currentUser.role !== 'USER';
    if (!isAdmin) return;

    const adminChannels = [
      `databases.${DATABASE_ID}.collections.${COL.PAYMENT_REQUESTS}.documents`,
      `databases.${DATABASE_ID}.collections.${COL.WITHDRAWAL_REQUESTS}.documents`,
      `databases.${DATABASE_ID}.collections.${COL.SUPPORT_TICKETS}.documents`,
    ];

    const unsubscribe = client.subscribe(adminChannels, (response) => {
      const events: string[] = response.events as string[];
      const payload = response.payload as any;
      if (!payload) return;

      const isCreate = events.some(e => e.endsWith('.create'));
      const isUpdate = events.some(e => e.endsWith('.update'));

      const isPaymentEvent    = events.some(e => e.includes(`.${COL.PAYMENT_REQUESTS}.`));
      const isWithdrawalEvent = events.some(e => e.includes(`.${COL.WITHDRAWAL_REQUESTS}.`));
      const isTicketEvent     = events.some(e => e.includes(`.${COL.SUPPORT_TICKETS}.`));

      if (isPaymentEvent && isCreate) {
        const status = (payload.status || '').toUpperCase();
        if (!status || status === 'PENDING' || status === 'AWAITING_REVIEW') {
          incrementPendingPayments();
          incrementPulse('ADMIN');
          playAdminSound('payment');
          debouncedAdminRefresh();
        }
      }

      if (isWithdrawalEvent && isCreate) {
        const status = (payload.status || '').toUpperCase();
        if (!status || status === 'PENDING' || status === 'AWAITING_REVIEW') {
          incrementPendingWithdrawals();
          incrementPulse('ADMIN');
          playAdminSound('withdrawal');
          debouncedAdminRefresh();
        }
      }

      if (isTicketEvent && (isCreate || isUpdate)) {
        const status   = (payload.status || '').toUpperCase();
        const priority = (payload.priority || '').toUpperCase();
        if (isCreate && (status === 'OPEN' || !status)) {
          incrementOpenTickets();
          incrementPulse('ADMIN');
          if (priority === 'HIGH' || priority === 'URGENT') {
            playAdminSound('highTicket');
          }
          debouncedAdminRefresh();
        } else if (isUpdate) {
          debouncedAdminRefresh();
        }
      }
    });

    return () => { unsubscribe(); };
  }, [
    currentUser?.$id,
    currentUser?.role,
    incrementPendingPayments,
    incrementPendingWithdrawals,
    incrementOpenTickets,
    incrementPulse,
    debouncedAdminRefresh,
  ]);

  // ─── Connection presence (online status + last seen) ──────────────────────
  // Subscribe to the USERS collection so any time a contact updates
  // is_online / last_seen_at we immediately reflect it in the UI.
  useEffect(() => {
    if (!currentUser?.$id) return;

    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.${COL.USERS}.documents`,
      (response) => {
        const events: string[] = response.events as string[];
        const payload = response.payload as any;
        if (!payload) return;

        const isUpdate = events.some(e => e.endsWith('.update'));
        if (!isUpdate) return;

        const changedUserId: string = payload.$id;
        if (!changedUserId) return;

        // Skip updates for the current user — their own presence is managed
        // by the heartbeat in PostContext, not by this subscriber.
        if (changedUserId === currentUserRef.current?.$id) return;

        // Update if this person is a DM connection OR a member of any cluster the current user is in.
        const isConnection = connectionsRef.current.some(c => c.$id === changedUserId);
        const isClusterMember = !isConnection && clustersRef.current.some(cl =>
          cl.members?.some((m: any) => m.$id === changedUserId)
        );
        if (!isConnection && !isClusterMember) return;

        const isOnline: boolean   = payload.is_online   ?? false;
        const lastSeenAt: string | null = payload.last_seen_at ?? null;

        // Always update the global online set (used for group active status)
        updateUserOnlineStatusRef.current(changedUserId, isOnline);
        // Also update the per-connection presence (DM list indicators + last seen)
        updatePresenceRef.current(changedUserId, isOnline, lastSeenAt);
      },
    );

    return () => { unsubscribe(); };
  }, [currentUser?.$id, updateUserOnlineStatus]);

  return null;
}
