
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { 
  X, 
  Search, 
  History, 
  TrendingUp, 
  Users, 
  Music2, 
  FileText, 
  ArrowRight,
  Mic2,
  Trash2,
  Zap,
  ChevronRight,
  Play,
  UserPlus,
  Hash,
  EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { usePosts } from "@/context/PostContext";
import { useMusic } from "@/context/MusicContext";
import { useNetwork } from "@/context/NetworkContext";
import { getAdaptivePreview, adaptiveDebounceMs } from "@/lib/adaptive-media";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Image from "next/image";

type SearchTab = "all" | "people" | "audio" | "nodes";

export function SearchPortal() {
  const { tier } = useNetwork();
  const router = useRouter();
  const { isSearchOpen, setSearchOpen, connections, posts, setSelectedPostId, triggerHaptic, settings, searchAllUsers } = usePosts();
  const { setTrack, globalSongs } = useMusic();
  
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("all");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [liveUsers, setLiveUsers] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persistence: Load recent searches
  useEffect(() => {
    const saved = localStorage.getItem('vimore_recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  // Spatial Focus: Auto-focus when materializing
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
      setQuery("");
      setLiveUsers([]);
    }
  }, [isSearchOpen]);

  // Live user search with adaptive debounce (Lite=600ms, Standard=350ms, Rich=200ms)
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!query.trim()) { setLiveUsers([]); return; }
    setIsSearchingUsers(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchAllUsers(query);
        setLiveUsers(results);
      } catch { setLiveUsers([]); }
      finally { setIsSearchingUsers(false); }
    }, adaptiveDebounceMs(tier));
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [query, searchAllUsers, tier]);

  const saveSearch = (term: string) => {
    if (!term.trim()) return;
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('vimore_recent_searches', JSON.stringify(updated));
  };

  const purgeRecent = (term: string) => {
    triggerHaptic?.(5);
    const updated = recentSearches.filter(s => s !== term);
    setRecentSearches(updated);
    localStorage.setItem('vimore_recent_searches', JSON.stringify(updated));
  };

  const filteredResults = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();

    const audio = globalSongs.filter(s => 
      (s.title || "").toLowerCase().includes(q) || 
      (s.artist || "").toLowerCase().includes(q)
    );

    const qIsExactTag = q.startsWith('#');
    const nodes = posts.filter(p => {
      const matchesContent = (p.content || "").toLowerCase().includes(q);
      const matchesUser = (p.user?.name || "").toLowerCase().includes(q);
      const postHashtags: string[] = (p as any).hashtags || [];
      const matchesHashtag = qIsExactTag
        ? postHashtags.includes(q)
        : postHashtags.some((h: string) => h.includes(q));
      return matchesContent || matchesUser || matchesHashtag;
    });

    // Sort people: verified first → active boost → regular
    const now = Date.now();
    const boostedUsernames = new Set(
      posts
        .filter((p: any) => p.isBoosted && p.boostExpiry && p.boostExpiry > now)
        .map((p: any) => p.user?.username)
        .filter(Boolean)
    );
    const sortedPeople = [...liveUsers].sort((a, b) => {
      const score = (u: any) => (u.isVerified ? 2 : boostedUsernames.has(u.username) ? 1 : 0);
      return score(b) - score(a);
    });
    return { people: sortedPeople, audio, nodes };
  }, [query, liveUsers, posts, globalSongs]);

  const handleDeepLink = (type: 'profile' | 'track' | 'post', id: string | number) => {
    triggerHaptic?.(15);
    saveSearch(query);
    setSearchOpen(false);

    if (type === 'profile') {
      router.push(`/profile/${id}`);
    } else if (type === 'track') {
      const track = globalSongs.find(s => s.id === id);
      if (track) setTrack(track);
    } else if (type === 'post') {
      setSelectedPostId(id as string);
    }
  };

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-[600] bg-white/80 dark:bg-[#050505]/80 backdrop-blur-3xl flex flex-col animate-in fade-in duration-300 overflow-hidden">
      {/* Aurora Ambience */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/20 blur-[120px] rounded-full animate-pulse delay-700" />
      </div>

      <header className="h-24 px-6 flex items-center gap-4 shrink-0 relative z-10 border-b border-primary/5">
        <div className="flex-1 max-w-3xl mx-auto flex items-center gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              ref={inputRef}
              placeholder="Query the network..." 
              className="h-14 pl-12 pr-12 bg-secondary/30 border-none rounded-2xl text-lg font-bold placeholder:text-muted-foreground/40 focus-visible:ring-primary/20 transition-all shadow-inner"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveSearch(query)}
            />
            {query && (
              <button 
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button variant="ghost" size="icon" className="rounded-2xl h-14 w-14 bg-secondary/30 hover:bg-destructive/10 hover:text-destructive transition-all" onClick={() => setSearchOpen(false)}>
            <X className="h-6 w-6" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto scrollbar-hide pb-20">
        <div className="max-w-3xl mx-auto px-6 py-10 space-y-12">
          
          {/* Recent Pulses */}
          {!query && recentSearches.length > 0 && (
            <section className="space-y-4 animate-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                  <History className="h-3.5 w-3.5" /> Recent Pulses
                </h3>
                <Button variant="link" className="text-[10px] font-black uppercase h-auto p-0" onClick={() => { setRecentSearches([]); localStorage.removeItem('vimore_recent_searches'); }}>Clear Cache</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <div key={term} className="group flex items-center gap-2 bg-secondary/40 border border-primary/5 pl-4 pr-2 py-2 rounded-xl transition-all hover:bg-primary/5 hover:border-primary/20">
                    <button className="text-sm font-bold" onClick={() => setQuery(term)}>{term}</button>
                    <button onClick={() => purgeRecent(term)} className="opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity p-1"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Trending Rail */}
          {!query && (
            <section className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
              <div className="px-1">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" /> Trending Now
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {["#BuildingInPublic", "#SonicSignature", "#ViMoreVibes", "#HighVelocity"].map((tag) => (
                  <button 
                    key={tag} 
                    className="flex items-center justify-between p-5 bg-white/40 dark:bg-white/5 border border-white/20 rounded-[1.75rem] hover:bg-primary/5 hover:border-primary/20 transition-all group text-left"
                    onClick={() => { saveSearch(tag); setSearchOpen(false); router.push(`/hashtag/${encodeURIComponent(tag.replace('#', ''))}`); }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Hash className="h-5 w-5" />
                      </div>
                      <span className="font-bold text-lg">{tag}</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground opacity-40 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Results State */}
          {query && filteredResults && (
            <div className="space-y-12 animate-in fade-in duration-500">
              
              {/* Tab Filters */}
              <div className="flex items-center gap-2 p-1 bg-secondary/20 rounded-2xl w-fit">
                {(["all", "people", "audio", "nodes"] as SearchTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => { triggerHaptic?.(5); setActiveTab(tab); }}
                    className={cn(
                      "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      activeTab === tab ? "bg-white dark:bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* People Clusters */}
              {(activeTab === 'all' || activeTab === 'people') && isSearchingUsers && (
                <section className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 px-1">
                    <Users className="h-4 w-4" /> Creators
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground px-1 animate-pulse">
                    <Zap className="h-4 w-4 text-primary" /> Scanning the network...
                  </div>
                </section>
              )}
              {(activeTab === 'all' || activeTab === 'people') && !isSearchingUsers && filteredResults.people.length > 0 && (
                <section className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 px-1">
                    <Users className="h-4 w-4" /> Creators
                  </h3>
                  <div className="space-y-3">
                    {filteredResults.people.map((person) => (
                      <div 
                        key={person.username}
                        onClick={() => handleDeepLink('profile', person.username)}
                        className="flex items-center justify-between p-4 bg-white/40 dark:bg-white/5 border border-white/20 rounded-2xl hover:bg-secondary/40 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12 border-2 border-primary/10 group-hover:scale-105 transition-transform">
                            <AvatarImage src={getAdaptivePreview(person.avatar, 'avatar', tier) || person.avatar} />
                            <AvatarFallback>{person.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-bold text-base">{person.name}</span>
                            <span className="text-xs text-muted-foreground uppercase font-black tracking-tighter">@{person.username}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-primary opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight className="h-5 w-5" /></Button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Audio Nodes */}
              {(activeTab === 'all' || activeTab === 'audio') && filteredResults.audio.length > 0 && (
                <section className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 px-1">
                    <Music2 className="h-4 w-4" /> Sonic Nodes
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredResults.audio.map((track) => (
                      <div 
                        key={track.id}
                        onClick={() => handleDeepLink('track', track.id)}
                        className="flex items-center gap-4 p-3 bg-white/40 dark:bg-white/5 border border-white/20 rounded-2xl hover:bg-primary/5 hover:border-primary/20 transition-all cursor-pointer group"
                      >
                        <div className="relative h-14 w-14 rounded-xl overflow-hidden shrink-0 shadow-lg group-hover:scale-105 transition-transform bg-secondary/30 flex items-center justify-center">
                          <>
                              <Image src={track.cover} alt={track.title} fill className="object-cover" />
                              <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Play className="h-6 w-6 text-white fill-current" />
                              </div>
                            </>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-sm truncate">{track.title}</span>
                          <span className="text-[10px] text-muted-foreground font-medium truncate uppercase tracking-widest">{track.artist}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Content Nodes */}
              {(activeTab === 'all' || activeTab === 'nodes') && filteredResults.nodes.length > 0 && (
                <section className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 px-1">
                    <FileText className="h-4 w-4" /> Content Nodes
                  </h3>
                  <div className="space-y-3">
                    {filteredResults.nodes.map((post) => (
                      <div 
                        key={post.$id}
                        onClick={() => handleDeepLink('post', post.$id)}
                        className="p-5 bg-white/40 dark:bg-white/5 border border-white/20 rounded-[2rem] hover:bg-secondary/40 transition-all cursor-pointer group space-y-3"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-primary/10">
                            <AvatarImage src={getAdaptivePreview(post.user.avatar, 'avatar', tier) || post.user.avatar} />
                            <AvatarFallback>{post.user.name[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-bold">{post.user.name}</span>
                          <span className="text-[10px] text-muted-foreground font-medium ml-auto">{post.time}</span>
                        </div>
                        <div className="flex gap-4">
                          <p className="flex-1 text-sm line-clamp-2 leading-relaxed text-muted-foreground italic">"{post.content}"</p>
                          {(post.image || post.images?.length) && (
                            <div className="relative h-12 w-12 rounded-lg overflow-hidden shrink-0 border border-primary/5">
                              <Image src={post.image || post.images![0]} alt="Post visual" fill className="object-cover" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Empty Search State */}
              {!isSearchingUsers && filteredResults.people.length === 0 && filteredResults.audio.length === 0 && filteredResults.nodes.length === 0 && (
                <div className="py-20 text-center space-y-6 opacity-40">
                  <div className="h-20 w-20 bg-secondary/30 rounded-full flex items-center justify-center mx-auto">
                    <Zap className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-black italic uppercase tracking-tighter">Cluster Silent</h3>
                    <p className="text-sm font-medium">No network nodes matched your query.</p>
                  </div>
                  <Button variant="outline" className="rounded-full border-primary text-primary" onClick={() => setQuery("")}>Reset Query</Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Mic Trigger Overlay */}
      <footer className="h-20 px-6 shrink-0 flex items-center justify-center relative z-10">
        <div className="flex items-center gap-2 text-muted-foreground/40 text-[10px] font-black uppercase tracking-widest">
          <Mic2 className="h-3.5 w-3.5" />
          Sonic search coming in next sync
        </div>
      </footer>
    </div>
  );
}
