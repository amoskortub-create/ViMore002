"use client";

import React, { useState, useMemo } from "react";
import { useTranslation } from "@/context/LanguageContext";
import { Header } from "@/components/layout/header";
import { SubHeader } from "@/components/layout/sub-header";
import { MainNav } from "@/components/layout/main-nav";
import { RightSidebar } from "@/components/layout/right-sidebar";
import { useNotifications, NotificationNode } from "@/context/NotificationContext";
import { usePosts } from "@/context/PostContext";
import { useMusic } from "@/context/MusicContext";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { NativeAdNode } from "@/components/ad/native-ad-node";
import {
  Heart,
  MessageCircle,
  UserPlus,
  Music2,
  Zap,
  BellOff,
  ShieldCheck,
  Trash2,
  Star,
  UserCheck,
  Bell,
  CheckCheck,
  Gift,
  TrendingUp,
} from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";

const TYPE_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string; Icon: any }> = {
  SOCIAL:  { color: "text-blue-500",   bg: "bg-blue-500/10",   border: "border-blue-500/15",   dot: "bg-blue-500",   Icon: UserPlus   },
  POST:    { color: "text-primary",    bg: "bg-primary/10",    border: "border-primary/15",    dot: "bg-primary",    Icon: Heart      },
  SONIC:   { color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/15", dot: "bg-purple-500", Icon: Music2     },
  SYSTEM:  { color: "text-emerald-500",bg: "bg-emerald-500/10",border: "border-emerald-500/15",dot: "bg-emerald-500",Icon: ShieldCheck },
  default: { color: "text-primary",    bg: "bg-primary/10",    border: "border-primary/15",    dot: "bg-primary",    Icon: Zap        },
};

const FILTERS = [
  { id: "all",    label: "All",     Icon: Bell     },
  { id: "SOCIAL", label: "Social",  Icon: UserPlus },
  { id: "POST",   label: "Content", Icon: Heart    },
  { id: "SONIC",  label: "Music",   Icon: Music2   },
  { id: "SYSTEM", label: "System",  Icon: ShieldCheck },
];

function renderContent(content: string) {
  const parts = content.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <span key={i} className="font-black text-foreground">{part.slice(2, -2)}</span>;
    }
    return <span key={i}>{part}</span>;
  });
}

export default function NotificationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { notifications, markAsRead, markAllAsRead, purgeSignal } = useNotifications();
  const { setSelectedPostId, isFollowing, triggerHaptic, currentUser } = usePosts();
  const { setTrack, currentTrack, isExpanded, globalSongs } = useMusic();
  const [activeFilter, setActiveFilter] = useState("all");
  const isPlayerActive = currentTrack && !isExpanded;

  const filtered = useMemo(() => {
    if (activeFilter === "all") return notifications;
    return notifications.filter((n) => n.type === activeFilter);
  }, [notifications, activeFilter]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleClick = (node: NotificationNode) => {
    triggerHaptic(10);
    markAsRead(node.id);
    if (node.postId) { setSelectedPostId(node.postId); }
    else if (node.trackId) {
      const track = globalSongs.find((s) => String(s.id) === String(node.trackId));
      if (track) { setTrack(track); router.push("/music"); }
    } else if (node.targetUsername) { router.push(`/profile/${node.targetUsername}`); }
    else if (node.actionHref) { router.push(node.actionHref); }
  };

  const handleAction = (e: React.MouseEvent, node: NotificationNode) => {
    e.stopPropagation();
    triggerHaptic(25);
    if (node.type === "SOCIAL" && node.targetUsername) { router.push(`/profile/${node.targetUsername}`); }
    else if (node.trackId) {
      const track = globalSongs.find((s) => String(s.id) === String(node.trackId));
      if (track) { setTrack(track); router.push("/music"); }
    } else if (node.postId) { setSelectedPostId(node.postId); }
    else if (node.actionHref) { router.push(node.actionHref); }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-[#080808] transition-colors duration-300">
      <Header />
      <SubHeader />

      <div className={cn(
        "max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-[280px_1fr_360px] gap-8 px-4 transition-all duration-300",
        "pt-6"
      )}>
        <aside className={cn(
          "hidden lg:block sticky h-[calc(100vh-132px)] overflow-y-auto",
          "top-[132px]"
        )}>
          <MainNav />
        </aside>

        <main className="w-full pb-24 space-y-4 min-w-0">

          {/* ── Page header ── */}
          <div className="bg-white dark:bg-card rounded-[2rem] overflow-hidden shadow-sm border border-black/5 dark:border-white/5">
            <div className="bg-gradient-to-br from-primary/90 via-primary to-violet-700 p-6 pb-8 relative overflow-hidden">
              <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] mb-1">Activity</p>
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white leading-none">
                      Notifications
                    </h1>
                  </div>
                  {unreadCount > 0 && (
                    <div className="bg-white/20 backdrop-blur px-3 py-1.5 rounded-full">
                      <span className="text-white font-black text-sm">{unreadCount} new</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => { triggerHaptic(5); markAllAsRead(); }}
                  className="flex items-center gap-2 bg-white/15 hover:bg-white/25 active:scale-95 transition-all rounded-full px-4 py-2"
                >
                  <CheckCheck className="h-3.5 w-3.5 text-white" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Mark all read</span>
                </button>
              </div>
            </div>

            {/* Filter pills */}
            <div className="px-4 -mt-4 pb-4">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide bg-white dark:bg-card rounded-[1.5rem] p-2 shadow-lg border border-black/5 dark:border-white/5">
                {FILTERS.map((f) => {
                  const isActive = activeFilter === f.id;
                  const count = f.id === "all"
                    ? notifications.length
                    : notifications.filter((n) => n.type === f.id).length;
                  return (
                    <button
                      key={f.id}
                      onClick={() => { triggerHaptic(5); setActiveFilter(f.id); }}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-xl shrink-0 transition-all duration-200",
                        isActive
                          ? "bg-primary text-white shadow-md shadow-primary/20 scale-[1.03]"
                          : "text-muted-foreground hover:bg-secondary/60"
                      )}
                    >
                      <f.Icon className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{f.label}</span>
                      {count > 0 && (
                        <span className={cn(
                          "text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                          isActive ? "bg-white/25 text-white" : "bg-secondary text-muted-foreground"
                        )}>{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <NativeAdNode type="banner-468" id="notif-top-pulse" />

          {/* ── Notification list ── */}
          {filtered.length === 0 ? (
            <div className="bg-white dark:bg-card rounded-[2rem] border border-black/5 dark:border-white/5 py-20 flex flex-col items-center gap-5 text-center px-8 shadow-sm">
              <div className="h-20 w-20 rounded-[1.5rem] bg-primary/5 border-2 border-dashed border-primary/20 flex items-center justify-center">
                <Bell className="h-9 w-9 text-primary/30" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-black italic uppercase tracking-tighter">{t("notif_empty_title")}</h3>
                <p className="text-muted-foreground text-sm font-medium max-w-xs">{t("notif_empty_desc")}</p>
              </div>
              <Button
                variant="outline"
                className="rounded-full border-primary/30 text-primary font-black uppercase text-[10px] tracking-widest h-10 px-6 hover:bg-primary hover:text-white transition-all"
                onClick={() => router.push("/")}
              >
                {t("notif_back")}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((node, i) => {
                const cfg = TYPE_CONFIG[node.type] || TYPE_CONFIG.default;
                const TypeIcon = cfg.Icon;
                const isUnread = !node.isRead;
                const amFollowing = node.targetUsername ? isFollowing(node.targetUsername) : false;

                return (
                  <React.Fragment key={node.id}>
                    <div
                      onClick={() => handleClick(node)}
                      className={cn(
                        "group relative bg-white dark:bg-card rounded-[1.75rem] border transition-all cursor-pointer overflow-hidden",
                        "animate-in fade-in slide-in-from-bottom-1 duration-300",
                        isUnread
                          ? `${cfg.border} shadow-sm`
                          : "border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10"
                      )}
                      style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                    >
                      {/* Unread accent strip */}
                      {isUnread && (
                        <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-[1.75rem]", cfg.dot)} />
                      )}

                      <div className="flex items-start gap-3 p-4 pl-5">
                        {/* Avatar + type badge */}
                        <div className="relative shrink-0">
                          <Avatar className={cn(
                            "h-12 w-12 border-2 transition-all",
                            isUnread ? "border-primary/30" : "border-transparent"
                          )}>
                            <AvatarImage src={node.avatar || (node.type !== "SYSTEM" ? node.image : undefined) || (node.type === "SYSTEM" ? "/icon.svg" : undefined)} />
                            <AvatarFallback className="text-xs font-black">V</AvatarFallback>
                          </Avatar>
                          <div className={cn(
                            "absolute -bottom-1 -right-1 h-6 w-6 rounded-full flex items-center justify-center border-2 border-white dark:border-card shadow-sm",
                            cfg.bg
                          )}>
                            <TypeIcon className={cn("h-3 w-3", cfg.color)} />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pr-8">
                          <p className={cn(
                            "text-sm leading-relaxed",
                            isUnread ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {renderContent(node.content)}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-tight",
                              isUnread ? cfg.color : "text-muted-foreground/50"
                            )}>
                              {node.time}
                            </span>
                            <span className="text-muted-foreground/20 text-[10px]">·</span>
                            <span className={cn(
                              "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                              cfg.bg, cfg.color
                            )}>
                              {node.type}
                            </span>
                          </div>

                          {/* Action button */}
                          {(node.actionLabel || node.postId || node.trackId || node.targetUsername) && (
                            <button
                              onClick={(e) => handleAction(e, node)}
                              className={cn(
                                "mt-3 flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                isUnread
                                  ? `${cfg.bg} ${cfg.color} border ${cfg.border}`
                                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
                              )}
                            >
                              {node.type === "SOCIAL"
                                ? (amFollowing
                                  ? <><UserCheck className="h-3 w-3" /> Following</>
                                  : <><UserPlus className="h-3 w-3" /> {t("notif_follow_back")}</>)
                                : (node.actionLabel || t("notif_view"))
                              }
                            </button>
                          )}
                        </div>

                        {/* Thumbnail */}
                        {(node.image || node.postId) && !node.avatar && (
                          <div className="hidden sm:block h-14 w-14 rounded-2xl overflow-hidden shrink-0 border border-black/5 dark:border-white/5">
                            <Image src={node.image || "/icon.svg"} alt="" width={56} height={56} className="object-cover w-full h-full" />
                          </div>
                        )}
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); triggerHaptic(10); purgeSignal(node.id); }}
                        className="absolute top-3 right-3 h-7 w-7 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground/60 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    {i === 4 && <NativeAdNode type="banner-468" id="notif-mid-pulse" />}
                  </React.Fragment>
                );
              })}

              <div className="pt-4 flex justify-center">
                <NativeAdNode type="banner-468" id="notif-bottom-pulse" />
              </div>
            </div>
          )}
        </main>

        <aside className={cn(
          "hidden lg:block sticky h-[calc(100vh-132px)] overflow-y-auto",
          "top-[132px]"
        )}>
          <RightSidebar />
        </aside>
      </div>
    </div>
  );
}
