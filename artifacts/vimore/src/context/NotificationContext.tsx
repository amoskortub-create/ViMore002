'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { usePosts } from '@/context/PostContext';
import { databases, DATABASE_ID, COL, ID, Query } from '@/lib/appwrite';
import { firePush } from '@/lib/push-fire';

export type SignalType = 'SOCIAL' | 'SONIC' | 'POST' | 'SYSTEM';
export type PulseCategory = 'HOME' | 'FRIENDS' | 'MUSIC' | 'MESSAGES' | 'ADMIN';

export interface MessagePreview {
  text: string;
  time: string;
}

export interface NotificationNode {
  id: string;
  type: SignalType;
  title: string;
  content: string;
  time: string;
  isRead: boolean;
  recipientId?: string;
  avatar?: string;
  image?: string;
  actionLabel?: string;
  actionHref?: string;
  postId?: string;
  trackId?: string | number;
  targetUsername?: string;
}

interface NotificationContextType {
  notifications: NotificationNode[];
  unreadCount: number;
  unreadMessageCount: number;
  categoryPulses: Record<PulseCategory, number>;
  messagePreviews: Record<string, MessagePreview>;
  addSignal: (signal: Omit<NotificationNode, 'id' | 'time' | 'isRead'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  purgeSignal: (id: string) => void;
  clearPulse: (category: PulseCategory) => void;
  incrementPulse: (category: PulseCategory) => void;
  setPulseCount: (category: PulseCategory, count: number) => void;
  incrementUnreadMessageCount: () => void;
  decrementUnreadMessageCount: (by?: number) => void;
  updateMessagePreview: (clusterId: string, text: string, time: string) => void;
  refreshNotifications: (userId: string) => Promise<void>;
  requestPushPermission: () => Promise<void>;
  hasPushPermission: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const NOTIFICATION_SOUND = "/sounds/notification.mp3";

function formatTimeAgoSimple(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationNode[]>([]);
  const [categoryPulses, setCategoryPulses] = useState<Record<PulseCategory, number>>({
    HOME: 0, FRIENDS: 0, MUSIC: 0, MESSAGES: 0, ADMIN: 0,
  });
  const [messagePreviews, setMessagePreviews] = useState<Record<string, MessagePreview>>({});
  const [hasPushPermission, setHasPushPermission] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const { settings, triggerHaptic, currentUser, selectedChatId } = usePosts();

  // Tracks IDs currently being deleted so polls don't re-add them
  const pendingDeletions = React.useRef<Set<string>>(new Set());

  const loadNotifications = useCallback(async (userId: string) => {
    try {
      const res = await databases.listDocuments(DATABASE_ID, COL.NOTIFICATIONS, [
        Query.equal('user_id', userId),
        Query.notEqual('type', 'CALL_INCOMING'),
        Query.orderDesc('$createdAt'),
        Query.limit(50),
      ]);
      const mapped: NotificationNode[] = res.documents
        .filter((doc: any) => !pendingDeletions.current.has(doc.$id))
        .map((doc: any) => ({
          id: doc.$id,
          type: (doc.type as SignalType) || 'SYSTEM',
          title: doc.title || '',
          content: doc.content || doc.message || '',
          time: formatTimeAgoSimple(doc.$createdAt),
          isRead: doc.is_read || false,
          recipientId: doc.user_id || '',
          postId: doc.post_id || undefined,
          trackId: doc.track_id || undefined,
          targetUsername: doc.target_username || undefined,
          avatar: doc.avatar || undefined,
          image: doc.image || undefined,
          actionLabel: doc.action_label || undefined,
          actionHref: doc.action_href || undefined,
        }));
      setNotifications(mapped);
    } catch (err) {
      console.error('loadNotifications error:', err);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadNotifications(currentUser.$id);
    } else {
      setNotifications([]);
    }
  }, [currentUser, loadNotifications]);

  // Notifications are pushed via the real-time WebSocket in GlobalRealtimeListener.
  // Polling is intentionally removed to save mobile data.

  const triggerSound = useCallback(() => {
    if (settings.isSilenceActive) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const isSilenced = settings.silenceStart < settings.silenceEnd
        ? (currentTime >= settings.silenceStart && currentTime <= settings.silenceEnd)
        : (currentTime >= settings.silenceStart || currentTime <= settings.silenceEnd);
      if (isSilenced) return;
    }
    const audio = new Audio(NOTIFICATION_SOUND);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  }, [settings]);

  const addSignal = useCallback((signal: Omit<NotificationNode, 'id' | 'time' | 'isRead'>) => {
    const newNotif: NotificationNode = {
      ...signal,
      id: 'notif_' + Date.now(),
      time: 'Just now',
      isRead: false,
    };
    setNotifications(prev => [newNotif, ...prev]);
    triggerSound();
    triggerHaptic(15);

    const targetUserId = signal.recipientId || (currentUser?.$id);
    if (targetUserId) {
      const notifData: Record<string, any> = {
        user_id: targetUserId,
        from_user_id: currentUser?.$id || '',
        from_user_name: currentUser?.name || currentUser?.username || '',
        from_user_avatar: currentUser?.avatar || '',
        type: signal.type,
        message: signal.content || signal.title || '',
        is_read: false,
      };
      if (signal.title) notifData.title = signal.title;
      if (signal.content) notifData.content = signal.content;
      if (signal.postId) notifData.post_id = signal.postId;
      if (signal.trackId) notifData.track_id = String(signal.trackId);
      if (signal.targetUsername) notifData.target_username = signal.targetUsername;
      if (signal.actionHref) notifData.action_href = signal.actionHref;
      if (signal.actionLabel) notifData.action_label = signal.actionLabel;
      if (signal.avatar) notifData.avatar = signal.avatar;
      databases.createDocument(DATABASE_ID, COL.NOTIFICATIONS, ID.unique(), notifData).catch((err) => {
        console.error('addSignal DB write failed:', err);
      });

      // Deliver a Web Push to the recipient for ALL notification types
      // (SOCIAL, SONIC, POST, SYSTEM, ADMIN, etc.) — works in background too.
      if (targetUserId !== currentUser?.$id) {
        firePush({
          userId: targetUserId,
          title: signal.title || 'ViMore',
          body: signal.content || '',
          url: signal.actionHref || '/notifications',
          icon: signal.avatar || '/icons/icon-192.png',
          image: signal.image,
          tag: `vimore-${signal.type.toLowerCase()}`,
          data: {
            type: signal.type,
            postId: signal.postId,
            trackId: signal.trackId,
            targetUsername: signal.targetUsername,
          },
        });
      }
    }
  }, [triggerSound, triggerHaptic, currentUser]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    databases.updateDocument(DATABASE_ID, COL.NOTIFICATIONS, id, { is_read: true }).catch(() => { /* ignore */ });
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      prev.filter(n => !n.isRead).forEach(n => {
        databases.updateDocument(DATABASE_ID, COL.NOTIFICATIONS, n.id, { is_read: true }).catch(() => { /* ignore */ });
      });
      return prev.map(n => ({ ...n, isRead: true }));
    });
  }, []);

  const purgeSignal = useCallback((id: string) => {
    // Remove from UI immediately
    setNotifications(prev => prev.filter(n => n.id !== id));
    // Guard the polling loop so it won't re-add this ID while the delete is in flight
    pendingDeletions.current.add(id);
    // Use server-side route so the delete succeeds regardless of collection permissions
    fetch('/api/notifications/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: id, userId: currentUser?.$id || '' }),
    })
      .catch(() => { /* UI already updated — silent */ })
      .finally(() => {
        pendingDeletions.current.delete(id);
      });
  }, [currentUser?.$id]);

  const clearPulse = useCallback((category: PulseCategory) => {
    setCategoryPulses(prev => ({ ...prev, [category]: 0 }));
    if (category === 'MESSAGES') setUnreadMessageCount(0);
  }, []);

  const incrementPulse = useCallback((category: PulseCategory) => {
    setCategoryPulses(prev => ({ ...prev, [category]: (prev[category] || 0) + 1 }));
    triggerSound();
  }, [triggerSound]);

  const setPulseCount = useCallback((category: PulseCategory, count: number) => {
    setCategoryPulses(prev => ({ ...prev, [category]: count }));
  }, []);

  const fetchUnreadMessageCount = useCallback(async (userId: string) => {
    try {
      const res = await databases.listDocuments(DATABASE_ID, COL.MESSAGES, [
        Query.equal('receiver_id', userId),
        Query.orderDesc('$createdAt'),
        Query.limit(100),
      ]);
      const count = res.documents.filter((doc: any) => doc.is_read === false).length;
      setUnreadMessageCount(count);
      setPulseCount('MESSAGES', count);
    } catch {
      // silently ignore — badge simply won't update if the collection is unreachable
    }
  }, [setPulseCount]);

  // Load unread message count once on login; increments/decrements come from the real-time WebSocket.
  useEffect(() => {
    if (!currentUser?.$id) { setUnreadMessageCount(0); return; }
    fetchUnreadMessageCount(currentUser.$id);
  }, [currentUser?.$id, fetchUnreadMessageCount]);

  const incrementUnreadMessageCount = useCallback(() => {
    setUnreadMessageCount(prev => prev + 1);
  }, []);

  const decrementUnreadMessageCount = useCallback((by = 1) => {
    setUnreadMessageCount(prev => Math.max(0, prev - by));
  }, []);

  const updateMessagePreview = useCallback((clusterId: string, text: string, time: string) => {
    setMessagePreviews(prev => ({
      ...prev,
      [clusterId]: { text, time },
    }));
  }, []);

  const refreshNotifications = useCallback(async (userId: string) => {
    await loadNotifications(userId);
  }, [loadNotifications]);

  const requestPushPermission = async () => {
    if (typeof window !== 'undefined' && "Notification" in window) {
      const permission = await Notification.requestPermission();
      setHasPushPermission(permission === "granted");
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, unreadMessageCount, categoryPulses, messagePreviews,
      addSignal, markAsRead, markAllAsRead, purgeSignal, clearPulse,
      incrementPulse, setPulseCount, incrementUnreadMessageCount, decrementUnreadMessageCount,
      updateMessagePreview, refreshNotifications,
      requestPushPermission, hasPushPermission,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
}
