
"use client";

import { useState, useMemo, useEffect } from "react";
import { saveCache, OFFLINE_KEYS } from "@/lib/offline-cache";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OnlineIndicator } from "@/components/ui/online-indicator";
import {
  Search,
  Layers,
  ArrowLeft,
  Mail,
  Bot,
  Users2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePosts } from "@/context/PostContext";
import { useMusic } from "@/context/MusicContext";
import { useNotifications } from "@/context/NotificationContext";
import { useTranslation } from "@/context/LanguageContext";
import { useNetwork } from "@/context/NetworkContext";
import { getAdaptivePreview } from "@/lib/adaptive-media";
import { useToast } from "@/hooks/use-toast";
import { CreateClusterModal } from "./create-cluster-modal";
import Link from "next/link";
import { LiteLink } from "@/components/ui/lite-link";

interface ChatListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ChatList({ selectedId, onSelect }: ChatListProps) {
  const { tier } = useNetwork();
  const { connections = [], clusters = [], triggerHaptic, settings, currentUser, friendUsernames, acceptedStrangerUsernames, chatMessages, markChatMessagesRead, chatLastMessageAt, chatLastIncomingAt, chatReadReceipts, chatUnreadCounts, onlineUserIds } = usePosts();
  const { categoryPulses, clearPulse, messagePreviews } = useNotifications();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "clusters">("all");

  const [pinnedUsernames] = useState(new Set<string>());

  const { sortedChats } = useMemo(() => {
    if (!currentUser) return { sortedChats: [], requestCount: 0 };

    const allItems = [
      ...(connections || [])
        .filter(c => c && c.username && c.username !== currentUser.username)
        .map(c => ({ ...c, isGroup: false })),
      ...(clusters || [])
        .filter(cl => cl.members && cl.members.some((m: any) => m.username === currentUser.username))
        .map(cl => ({ ...cl, isGroup: true }))
    ];

    const seen = new Set<string>();
    let mains: any[] = [];

    allItems.forEach(item => {
      const id = (item as any).username || (item as any).$id;
      if (seen.has(id)) return;
      seen.add(id);
      mains.push(item);
    });

    let list = mains;

    if (activeFilter === "clusters") {
      list = list.filter(item => item.isGroup);
    } else if (activeFilter === "unread") {
      list = list.filter(item => {
        const itemId = (item as any).username || (item as any).$id;
        const lastIncomingAt = chatLastIncomingAt[itemId];
        if (lastIncomingAt === undefined) return false;
        const lastReadAt = chatReadReceipts[itemId] ? new Date(chatReadReceipts[itemId]).getTime() : 0;
        return lastIncomingAt > lastReadAt;
      });
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item =>
        (item.name || "").toLowerCase().includes(q) ||
        ((item as any).username || "").toLowerCase().includes(q)
      );
    }

    const getLastMsgTime = (id: string): number => {
      if (chatLastMessageAt[id]) return chatLastMessageAt[id];
      const msgs = chatMessages[id];
      if (!msgs || msgs.length === 0) return -1;
      return msgs.length;
    };

    const sorted = list.sort((a, b) => {
      const aId = (a as any).username || (a as any).$id;
      const bId = (b as any).username || (b as any).$id;
      const aPinned = pinnedUsernames.has(aId);
      const bPinned = pinnedUsernames.has(bId);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return getLastMsgTime(bId) - getLastMsgTime(aId);
    });

    return { sortedChats: sorted, requestCount: 0 };
  }, [connections, clusters, searchQuery, activeFilter, pinnedUsernames, currentUser, friendUsernames, acceptedStrangerUsernames, chatMessages, chatLastMessageAt, chatLastIncomingAt, chatReadReceipts]);

  // Persist the sorted conversation list to localStorage for offline access
  useEffect(() => {
    if (sortedChats.length === 0) return;
    const slim = sortedChats.slice(0, 80).map((c: any) => ({
      $id: c.$id,
      username: c.username,
      name: c.name,
      avatar: c.avatar,
      isGroup: c.isGroup || false,
      isOnline: c.isOnline || false,
      isVerified: c.isVerified || false,
    }));
    saveCache(OFFLINE_KEYS.MESSAGES_CONTACTS, slim, 80);
  }, [sortedChats]);

  const handleSelection = (id: string) => {
    triggerHaptic(5);
    clearPulse('MESSAGES');
    markChatMessagesRead(id);
    onSelect(id);
  };

  const totalUnread = Object.values(chatUnreadCounts || {}).reduce((a: number, b: any) => a + (b || 0), 0);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0a0a0f] relative overflow-hidden">
      {/* Decorative background gradient */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Link href="/">
              <button className="h-9 w-9 rounded-2xl bg-secondary/60 dark:bg-white/5 flex items-center justify-center hover:bg-secondary transition-all active:scale-90 backdrop-blur-sm">
                <ArrowLeft className="h-4 w-4" />
              </button>
            </Link>
            <div>
              <h2 className="text-xl font-black tracking-tight text-foreground">Messages</h2>
              <p className="text-[10px] font-semibold text-muted-foreground">
                {(connections?.length || 0) + (clusters?.length || 0)} conversations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {totalUnread > 0 && (
              <span className="h-6 min-w-[24px] px-1.5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center shadow-lg shadow-primary/40">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
            <CreateClusterModal>
              <button className="h-9 w-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-all active:scale-90">
                <Layers className="h-4 w-4" />
              </button>
            </CreateClusterModal>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search conversations..."
            className="w-full h-11 pl-10 pr-4 bg-secondary/40 dark:bg-white/5 border border-transparent focus:border-primary/30 rounded-2xl text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:bg-secondary/60"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2">
          {[
            { key: "all", label: "All" },
            { key: "unread", label: "Unread", pulse: categoryPulses.MESSAGES > 0 },
            { key: "clusters", label: "Clusters" },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => { triggerHaptic(5); setActiveFilter(f.key as any); }}
              className={cn(
                "flex items-center gap-1.5 h-7 px-3.5 rounded-full text-[11px] font-bold transition-all",
                activeFilter === f.key
                  ? "bg-primary text-white shadow-md shadow-primary/30"
                  : "bg-secondary/50 dark:bg-white/5 text-muted-foreground hover:bg-secondary"
              )}
            >
              {f.label}
              {f.pulse && <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />}
            </button>
          ))}
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-2 pb-20">
        {sortedChats.length > 0 ? (
          <div className="space-y-0.5">
            {sortedChats.map((item) => {
              const id = (item as any).username || (item as any).$id;
              const isSelected = selectedId === id;

              const isOnlineVisible = !settings.isGhostMode && !item.isGroup && onlineUserIds.has((item as any).$id);
              const lastSeenAt = !item.isGroup ? (item as any).lastSeenAt : null;

              const memberOnlineCount = item.isGroup
                ? ((item as any).members || []).filter((m: any) => {
                    if (m.$id === currentUser?.$id) return false;
                    return onlineUserIds.has(m.$id);
                  }).length
                : 0;
              const isGroupActive = item.isGroup && memberOnlineCount >= 1;

              const lastIncomingAt = chatLastIncomingAt[id];
              const lastReadAt = chatReadReceipts[id] ? new Date(chatReadReceipts[id]).getTime() : 0;
              const hasNewPulse = !isSelected && lastIncomingAt !== undefined && lastIncomingAt > lastReadAt;
              const unreadCount = (chatUnreadCounts && chatUnreadCounts[id]) || 0;

              const lastMessageText = (() => {
                const lastMsg = chatMessages[id]?.at(-1);
                if (lastMsg) {
                  if (lastMsg.text) return lastMsg.text;
                  if (lastMsg.type === 'photo') return '📷 Photo';
                  if (lastMsg.type === 'video') return '🎥 Video';
                  if (lastMsg.type === 'voice') return `🎤 Voice${lastMsg.voiceDuration ? ` · ${lastMsg.voiceDuration}` : ''}`;
                  if (lastMsg.type === 'post') return '📌 Shared Post';
                }
                if (messagePreviews[id]?.text) return messagePreviews[id].text;
                if ((item as any).lastMessage) return (item as any).lastMessage;
                return "Tap to start chatting";
              })();

              return (
                <button
                  key={id}
                  onClick={() => handleSelection(id)}
                  className={cn(
                    "w-full flex items-center gap-3.5 px-3 py-3 rounded-2xl cursor-pointer transition-all text-left",
                    isSelected
                      ? "bg-primary/8 dark:bg-primary/10"
                      : "hover:bg-secondary/40 dark:hover:bg-white/4 active:scale-[0.98]"
                  )}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {item.isGroup ? (
                      <div className={cn(
                        "h-13 w-13 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center relative overflow-hidden border",
                        isGroupActive ? "border-emerald-400/40" : "border-primary/10"
                      )} style={{ height: 52, width: 52 }}>
                        {item.avatar
                          ? <img src={getAdaptivePreview(item.avatar, 'avatar', tier) || item.avatar} alt="Cluster" className="w-full h-full object-cover" />
                          : <div className="relative w-full h-full">
                              {(item as any).members?.slice(0, 2).map((m: any, i: number) => (
                                <Avatar key={m.username} className={cn("absolute h-7 w-7 border-2 border-white dark:border-[#0a0a0f]", i === 0 ? "top-0.5 left-0.5" : "bottom-0.5 right-0.5")}>
                                  <AvatarImage src={getAdaptivePreview(m.avatar, 'avatar', tier) || m.avatar} />
                                  <AvatarFallback className="text-[10px]">{m.name?.[0]}</AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                        }
                      </div>
                    ) : (
                      <div className={cn(
                        "rounded-2xl overflow-hidden border-2",
                        isOnlineVisible ? "border-emerald-400/60" : "border-transparent",
                        hasNewPulse && "ring-2 ring-primary/30"
                      )} style={{ height: 52, width: 52 }}>
                        <Avatar className="h-full w-full rounded-none">
                          <AvatarImage src={getAdaptivePreview((item as any).avatar, 'avatar', tier) || (item as any).avatar} className="object-cover" />
                          <AvatarFallback className="text-base font-bold rounded-none">{item.name?.[0]}</AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                    {/* Online dot */}
                    {!item.isGroup && isOnlineVisible && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-white dark:border-[#0a0a0f]" />
                    )}
                    {item.isGroup && (
                      <span className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-[#0a0a0f] transition-colors",
                        isGroupActive ? "bg-emerald-400" : "bg-muted-foreground/20"
                      )} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={cn(
                          "text-sm truncate",
                          hasNewPulse ? "font-black text-foreground" : "font-semibold text-foreground/90"
                        )}>
                          {item.name}
                        </span>
                        {item.isGroup && (
                          <span className="shrink-0 text-[8px] font-black uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                            Group
                          </span>
                        )}
                      </div>
                      <span className={cn(
                        "text-[10px] shrink-0",
                        hasNewPulse ? "text-primary font-bold" : "text-muted-foreground/60"
                      )}>
                        {messagePreviews[id]?.time || (item as any).lastTime}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn(
                        "text-xs truncate leading-snug",
                        hasNewPulse ? "text-foreground/80 font-medium" : "text-muted-foreground/60"
                      )}>
                        {lastMessageText}
                      </p>
                      <div className="shrink-0">
                        {!isSelected && unreadCount > 0 ? (
                          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center shadow-sm shadow-primary/40">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        ) : hasNewPulse ? (
                          <span className="h-2 w-2 rounded-full bg-primary shadow-sm shadow-primary/60" />
                        ) : null}
                      </div>
                    </div>
                    {item.isGroup && (
                      <p className={cn(
                        "text-[9px] font-semibold uppercase tracking-wide mt-0.5",
                        isGroupActive ? "text-emerald-500" : "text-muted-foreground/30"
                      )}>
                        {isGroupActive
                          ? memberOnlineCount === 1 ? "1 active" : `${memberOnlineCount} active`
                          : "quiet"}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-20 opacity-40">
            <div className="h-16 w-16 rounded-3xl bg-secondary/60 flex items-center justify-center mb-4">
              {searchQuery ? <Search className="h-7 w-7" /> : <Mail className="h-7 w-7" />}
            </div>
            <p className="text-sm font-bold text-center">
              {searchQuery ? `No results for "${searchQuery}"` : "No conversations yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {searchQuery ? "Try a different name" : "Start chatting with someone"}
            </p>
          </div>
        )}
      </div>

      {/* Floating AI button */}
      <LiteLink
        href="/intelligent"
        className="absolute bottom-5 right-5 h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-xl shadow-purple-500/40 hover:scale-110 active:scale-95 transition-all z-20"
        title="ViMore Intelligent"
      >
        <Bot className="h-6 w-6 text-white" />
        <span className="sr-only">ViMore Intelligent</span>
      </LiteLink>
    </div>
  );
}
