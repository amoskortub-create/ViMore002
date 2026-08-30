"use client";

import { useMemo, useState, useEffect } from "react";
import { Users, UserPlus, ChevronRight, Sparkles, Check, UserRoundX, UserRoundPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { OnlineIndicator } from "@/components/ui/online-indicator";
import { usePosts } from "@/context/PostContext";
import { useMusic } from "@/context/MusicContext";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useTranslation } from "@/context/LanguageContext";
import { useNetwork } from "@/context/NetworkContext";
import { getAdaptivePreview } from "@/lib/adaptive-media";
import { databases, Query, COL, DATABASE_ID, BUCKET, getFileUrl, avatarFallback } from "@/lib/appwrite";

export function SuggestedFollows() {
  const { connections, posts, isFriend, isRequestSent, isRequestReceived, sendFriendRequest, cancelFriendRequest, isFollowing, currentUser, settings } = usePosts();
  const { triggerHaptic } = useMusic();
  const { t } = useTranslation();
  const { tier } = useNetwork();

  const [fallbackUsers, setFallbackUsers] = useState<any[]>([]);

  const suggestions = useMemo(() => {
    if (!currentUser) return [];

    // Boosted post authors: active boost, not already following, not self
    const now = Date.now();
    const boostedAuthors: any[] = [];
    const seenBoostedUsernames = new Set<string>();
    for (const post of posts) {
      if (
        post.isBoosted &&
        post.boostExpiry &&
        post.boostExpiry > now &&
        !isFriend(post.user.username) &&
        !isRequestSent(post.user.username) &&
        !isRequestReceived(post.user.username) &&
        post.user.username !== currentUser?.username &&
        !seenBoostedUsernames.has(post.user.username)
      ) {
        seenBoostedUsernames.add(post.user.username);
        boostedAuthors.push({ ...post.user, isBoosted: true });
      }
    }

    // Connection suggestions (not yet friends, no pending request either direction)
    const connectionSuggestions = connections
      .filter(c =>
        !isFriend(c.username) &&
        !isRequestSent(c.username) &&
        !isRequestReceived(c.username) &&
        c.username !== currentUser?.username
      )
      .map(c => ({ ...c, isBoosted: false }));

    // Merge and deduplicate
    const existingUsernames = new Set(boostedAuthors.map(u => u.username));
    const mergedConnections = connectionSuggestions.filter(c => !existingUsernames.has(c.username));
    const combined = [...boostedAuthors, ...mergedConnections];

    // Sort: verified first → boosted (not verified) → regular
    const rankUser = (u: any) => (u.isVerified ? 2 : u.isBoosted ? 1 : 0);
    combined.sort((a, b) => rankUser(b) - rankUser(a));

    // If we have enough, return immediately
    if (combined.length >= 3) return combined.slice(0, 10);

    // Otherwise fill with fallback users
    const existingAll = new Set([...combined.map(u => u.username), currentUser.username]);
    const extras = fallbackUsers
      .filter(u =>
        !existingAll.has(u.username) &&
        !isFriend(u.username) &&
        !isRequestSent(u.username) &&
        !isRequestReceived(u.username)
      )
      .map(u => ({ ...u, isBoosted: false }));

    const all = [...combined, ...extras];
    all.sort((a, b) => rankUser(b) - rankUser(a));
    return all.slice(0, 10);
  }, [connections, posts, isFriend, isRequestSent, isRequestReceived, isFollowing, currentUser, fallbackUsers]);

  // Fetch fallback users from DB when we don't have enough connection-based suggestions
  useEffect(() => {
    if (!currentUser) return;
    databases.listDocuments(DATABASE_ID, COL.USERS, [
      Query.orderDesc('followers_count'),
      Query.limit(20),
    ]).then(res => {
      setFallbackUsers(res.documents.map((u: any) => ({
        $id: u.$id,
        name: u.name || 'User',
        username: u.username || 'user',
        avatar: u.avatar_id ? getFileUrl(BUCKET.AVATARS, u.avatar_id) : avatarFallback(u.name || 'U'),
        category: u.category || 'Creator',
        isVerified: u.is_verified || false,
        isOnline: u.is_online || false,
        lastSeenAt: u.last_seen_at || null,
      })));
    }).catch(() => {});
  }, [currentUser]);

  if (suggestions.length === 0) return null;

  return (
    <div className="w-full bg-white dark:bg-card rounded-[2rem] border border-primary/5 py-6 space-y-4 shadow-sm mb-4">
      <div className="flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Users className="h-4 w-4" />
          </div>
          <h3 className="font-black italic uppercase tracking-widest text-sm">Add Friends</h3>
        </div>
        <Link href="/friends?tab=add">
          <Button variant="ghost" className="text-primary font-black uppercase text-[10px] tracking-widest h-8 px-3 rounded-full hover:bg-primary/5">
            See All
          </Button>
        </Link>
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex w-max space-x-4 px-6 pb-4">
          {suggestions.map((person) => {
            const sent = isRequestSent(person.username);
            const isOnlineVisible = person.isOnline && !settings?.isGhostMode;
            
            return (
              <div 
                key={person.username} 
                className={cn(
                  "relative w-40 rounded-[2rem] p-5 flex flex-col items-center text-center gap-3 group border transition-all",
                  person.isBoosted
                    ? "bg-primary/5 border-primary/20 hover:border-primary/40"
                    : "bg-secondary/20 border-transparent hover:border-primary/20"
                )}
              >
                {person.isBoosted && (
                  <div className="absolute top-3 left-0 right-0 flex justify-center">
                    <span className="bg-primary/10 border border-primary/20 text-primary text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles className="h-2.5 w-2.5" /> Sponsored
                    </span>
                  </div>
                )}
                <Link href={`/profile/${person.username}`} className={cn("relative group/avatar", person.isBoosted && "mt-3")}>
                  <div className={cn("absolute -inset-1 blur-md rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity", person.isBoosted ? "bg-primary/30" : "bg-primary/20")} />
                  <div className="relative">
                    <Avatar className={cn("h-20 w-20 border-4 shadow-lg transition-transform group-hover/avatar:scale-105", person.isBoosted ? "border-primary/30" : "border-white dark:border-card")}>
                      <AvatarImage src={getAdaptivePreview(person.avatar, 'avatar', tier) || person.avatar} />
                      <AvatarFallback>{person.name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <OnlineIndicator
                      isOnline={!!isOnlineVisible}
                      lastSeenAt={person.lastSeenAt || null}
                      dotClassName="h-3 w-3"
                      className="absolute -bottom-0.5 -right-0.5 border-2 border-white dark:border-card rounded-full"
                    />
                  </div>
                </Link>

                <div className="flex flex-col gap-0.5 min-w-0 w-full">
                  <span className="font-bold text-sm truncate">{person.name}</span>
                  <span className="text-[10px] font-black text-primary/60 uppercase tracking-tighter truncate">{person.category}</span>
                </div>

                <Button 
                  size="sm" 
                  variant={sent ? "outline" : "default"}
                  className={cn(
                    "w-full rounded-xl font-black italic uppercase tracking-widest text-[9px] shadow-sm transition-all active:scale-95 group/hs",
                    sent ? "border-primary/20 text-primary hover:bg-destructive hover:text-white" : "bg-primary text-white"
                  )}
                  onClick={() => { triggerHaptic(15); sent ? cancelFriendRequest(person.username) : sendFriendRequest(person.username); }}
                >
                  <span className={cn(sent && "group-hover/hs:hidden flex items-center gap-1")}>
                    {sent ? <><Check className="h-3 w-3 mr-1" /> Sent</> : <><UserRoundPlus className="h-3 w-3 mr-1" />{t('friends_add_friend')}</>}
                  </span>
                  {sent && (
                    <span className="hidden group-hover/hs:flex items-center gap-1">
                      <UserRoundX className="h-3 w-3" /> Cancel
                    </span>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="opacity-0" />
      </ScrollArea>
    </div>
  );
}
