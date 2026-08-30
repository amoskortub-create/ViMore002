
"use client";

import { LiteLink as Link } from "@/components/ui/lite-link";
import { Search, TrendingUp, Users, UserRoundPlus, Check, UserRoundX, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePosts } from "@/context/PostContext";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/context/LanguageContext";

export function RightSidebar() {
  const { currentUser, connections = [], isFriend, isRequestSent, sendFriendRequest, cancelFriendRequest, setSearchOpen, posts = [] } = usePosts();
  const { t } = useTranslation();

  const suggestions = useMemo(() => {
    if (!connections || !Array.isArray(connections)) return [];
    return connections
      .filter(c => !isFriend(c.username) && !isRequestSent(c.username) && c.username !== currentUser?.username)
      .slice(0, 3);
  }, [connections, isFriend, isRequestSent, currentUser?.username]);

  const trends = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    posts.forEach((p: any) => {
      const content: string = p.content || '';
      const matches = content.match(/#[a-zA-Z0-9_]+/g) || [];
      matches.forEach(tag => {
        const clean = tag.slice(1);
        tagCounts[clean] = (tagCounts[clean] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([tag, count]) => ({ tag, posts: count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count) }));
  }, [posts]);

  return (
    <div className="flex flex-col gap-6 py-6 h-full">
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input 
          placeholder="Search ViMore" 
          className="pl-10 rounded-full bg-white/50 border-primary/10 focus-visible:ring-primary h-11 cursor-pointer" 
          readOnly
          onClick={() => setSearchOpen(true)}
        />
      </div>

      <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-5 border border-primary/10 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="font-headline font-bold text-lg italic uppercase tracking-tight">Discovery Nodes</h3>
        </div>
        <div className="space-y-4">
          {suggestions.length > 0 ? suggestions.map((user) => {
            const sent = isRequestSent(user.username);
            
            return (
              <div key={user.username} className="flex items-center justify-between group">
                <Link href={`/profile/${user.username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity flex-1 min-w-0">
                  <Avatar className="h-10 w-10 border border-primary/5 transition-transform group-hover:scale-105">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>{user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-sm leading-none truncate group-hover:underline">{user.name}</span>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter truncate">@{user.username}</span>
                  </div>
                </Link>
                <Button 
                  size="sm" 
                  variant={sent ? "outline" : "default"} 
                  className={cn(
                    "rounded-full h-8 px-4 font-black text-[9px] uppercase tracking-widest transition-all group/hs",
                    sent ? "border-primary/20 text-primary hover:bg-destructive hover:text-white" : "bg-primary text-white"
                  )}
                  onClick={() => sent ? cancelFriendRequest(user.username) : sendFriendRequest(user.username)}
                >
                  <span className={cn(sent && "group-hover/hs:hidden")}>
                    {sent ? "Sent" : "Add"}
                  </span>
                  {sent && (
                    <span className="hidden group-hover/hs:inline">
                      <X className="h-3 w-3" />
                    </span>
                  )}
                </Button>
              </div>
            );
          }) : (
            <div className="py-4 text-center text-[10px] font-black uppercase text-muted-foreground/40">
              Vault clusters synced
            </div>
          )}
        </div>
        <Link href="/friends?tab=add" className="block w-full">
          <Button variant="ghost" className="w-full text-xs font-black uppercase text-primary hover:bg-primary/5">Show more</Button>
        </Link>
      </div>

      <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-5 border border-primary/10 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="font-headline font-bold text-lg italic uppercase tracking-tight">Trending Now</h3>
        </div>
        <div className="space-y-4">
          {trends.length > 0 ? trends.map((trend) => (
            <div key={trend.tag} className="flex flex-col hover:bg-primary/5 p-2 -m-2 rounded-lg cursor-pointer transition-colors group">
              <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Pulse Node</span>
              <span className="font-black italic uppercase text-sm text-primary group-hover:translate-x-1 transition-transform">#{trend.tag}</span>
              <span className="text-[9px] text-muted-foreground/60 font-black uppercase">{trend.posts} vibes materialized</span>
            </div>
          )) : (
            <div className="py-4 text-center text-[10px] font-black uppercase text-muted-foreground/40">
              No trending tags yet
            </div>
          )}
        </div>
        <button className="w-full text-xs font-black uppercase text-primary hover:bg-primary/5 py-2">Show full pulse</button>
      </div>
    </div>
  );
}
