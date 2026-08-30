"use client";

import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { loadCache, OFFLINE_KEYS } from "@/lib/offline-cache";
import { MainNav } from "@/components/layout/main-nav";
import { Header } from "@/components/layout/header";
import { MusicGrid } from "@/components/music/music-grid";
import { MusicNav } from "@/components/music/music-nav";
import { MusicCharts } from "@/components/music/music-charts";
import { MusicUpload } from "@/components/music/music-upload";
import { CreatePlaylistModal } from "@/components/music/create-playlist-modal";
import { NativeAdNode } from "@/components/ad/native-ad-node";
import { useMusic, Album, Track, Playlist } from "@/context/MusicContext";
import { usePosts } from "@/context/PostContext";
import { useTranslation } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Search, X, Heart, ListMusic, Plus, Music, Disc3,
  Download, Trash2, MoreVertical, Zap, WifiOff, Play, Headphones,
  Flame, TrendingUp, Sparkles, Radio, Library, Upload as UploadIcon,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

function fmt(n: number | string): string {
  const num = typeof n === "string" ? parseInt(n, 10) : n;
  if (isNaN(num)) return "0";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

/* ── SKELETONS ── */
function DiscoverSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="w-full h-52 rounded-3xl bg-muted/50" />
      <div className="flex gap-2">
        {[...Array(3)].map((_, i) => <div key={i} className="h-8 w-24 rounded-full bg-muted/40" />)}
      </div>
      <div className="space-y-3">
        <div className="h-4 w-32 bg-muted/40 rounded-full" />
        <div className="flex gap-3 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="shrink-0 space-y-2">
              <div className="h-36 w-32 rounded-2xl bg-muted/40" />
              <div className="h-3 w-24 bg-muted/40 rounded-full" />
              <div className="h-2.5 w-16 bg-muted/30 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/20">
            <div className="h-12 w-12 rounded-xl bg-muted/40 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-40 bg-muted/40 rounded-full" />
              <div className="h-2.5 w-24 bg-muted/30 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LibrarySkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => <div key={i} className="h-9 w-20 rounded-full bg-muted/40" />)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="aspect-square rounded-2xl bg-muted/40" />
            <div className="h-3 w-3/4 bg-muted/40 rounded-full" />
            <div className="h-2.5 w-1/2 bg-muted/30 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── TRENDING ROW ── */
function TrendingRow({ track, rank, onPlay }: { track: Track; rank: number; onPlay: () => void }) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-2xl bg-white/70 dark:bg-card/60 border border-border/30 cursor-pointer active:scale-[0.98] transition-transform"
      onClick={onPlay}
    >
      <div className="text-lg font-black italic text-muted-foreground/50 w-6 shrink-0 text-center">
        {rank}
      </div>
      <div className="relative h-12 w-12 rounded-xl overflow-hidden shrink-0 shadow-md">
        <Image src={track.cover} alt={track.title} fill className="object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate">{track.title}</p>
        <p className="text-[11px] text-muted-foreground truncate">{track.artist}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Zap className="h-3 w-3 text-primary" />
        <span className="text-[11px] font-black text-muted-foreground">{fmt(track.streams || 0)}</span>
      </div>
    </div>
  );
}

/* ── LIBRARY EMPTY ── */
function LibraryEmpty({ icon, title, desc, action }: { icon: React.ReactNode; title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div className="py-16 flex flex-col items-center gap-4 rounded-3xl bg-white/60 dark:bg-card/30 border border-dashed border-border/50">
      <div className="h-16 w-16 rounded-2xl bg-muted/40 flex items-center justify-center">{icon}</div>
      <div className="text-center px-8 space-y-1">
        <h3 className="text-base font-black italic uppercase tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      {action}
    </div>
  );
}

/* ── MAIN CONTENT ── */
function MusicPageContent() {
  const searchParams = useSearchParams();
  const {
    globalSongs, globalAlbums, globalPlaylists, forYouSongs,
    currentTrack, isExpanded, selectedAlbum, selectedPlaylist,
    likedTracks, userPlaylists, userSongs, userAlbums,
    openCreatePlaylist, downloadedSongIds, deleteUserTrack, deleteUserAlbum, triggerHaptic,
    setTrack, isMusicLoading,
  } = useMusic();
  const { settings, isOffline } = usePosts();
  const { t } = useTranslation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("discover");
  const [libraryTab, setLibraryTab] = useState("playlists");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteItem, setDeleteItem] = useState<{ id: string | number; type: "track" | "album" } | null>(null);

  const recentlyPlayedTracks = useMemo<Track[]>(() => loadCache<Track>(OFFLINE_KEYS.MUSIC_PLAYED), []);
  const isPlayerActive = currentTrack && !isExpanded;

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["discover", "chart", "upload", "library"].includes(tab)) setActiveTab(tab);
  }, [searchParams]);

  useEffect(() => {
    if (!deleteItem) document.body.style.pointerEvents = "auto";
    return () => { document.body.style.pointerEvents = "auto"; };
  }, [deleteItem]);

  const filteredSongs = useMemo(() => {
    if (!searchQuery) return globalSongs;
    const q = searchQuery.toLowerCase();
    return globalSongs.filter(s =>
      (s.title || "").toLowerCase().includes(q) || (s.artist || "").toLowerCase().includes(q)
    );
  }, [searchQuery, globalSongs]);

  const heroTrack = useMemo(() => {
    if (filteredSongs.length === 0) return null;
    if (searchQuery) return filteredSongs[0];
    return [...filteredSongs].sort((a, b) => parseInt(b.streams || "0") - parseInt(a.streams || "0"))[0];
  }, [filteredSongs, searchQuery]);

  const seedRef = useRef(Math.floor(Math.random() * 0x7fffffff));
  const trendingBoosted = useMemo(() => {
    const boosted = globalSongs.filter(s => s.isBoosted);
    const result = [...boosted];
    let s = seedRef.current;
    for (let i = result.length - 1; i > 0; i--) {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      const j = Math.abs(s) % (i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalSongs.length]);

  const filteredAlbums = useMemo(() => {
    if (!searchQuery) return globalAlbums;
    const q = searchQuery.toLowerCase();
    return globalAlbums.filter(a => (a.title || "").toLowerCase().includes(q) || (a.artist || "").toLowerCase().includes(q));
  }, [searchQuery, globalAlbums]);

  const filteredPlaylists = useMemo(() => {
    if (!searchQuery) return globalPlaylists;
    const q = searchQuery.toLowerCase();
    return globalPlaylists.filter(p => (p.title || "").toLowerCase().includes(q));
  }, [searchQuery, globalPlaylists]);

  const filteredArtists = useMemo(() => {
    const map = new Map<string, any>();
    globalSongs.forEach(s => {
      const key = s.artistUsername || s.artist;
      if (!map.has(key)) map.set(key, { id: key, name: s.artist, username: s.artistUsername || "vimore", role: "Vocalist", avatar: s.cover, isLive: false });
    });
    const all = Array.from(map.values());
    if (!searchQuery) return all;
    const q = searchQuery.toLowerCase();
    return all.filter(a => (a.name || "").toLowerCase().includes(q));
  }, [searchQuery, globalSongs]);

  const hasResults = filteredSongs.length > 0 || filteredAlbums.length > 0 || filteredPlaylists.length > 0 || filteredArtists.length > 0;

  const downloadedTracks = useMemo(() => {
    const allKnownTracks = [...globalSongs, ...userSongs, ...likedTracks];
    const uniqueMap = new Map();
    allKnownTracks.forEach(t => { if (downloadedSongIds.has(t.id)) uniqueMap.set(t.id, t); });
    return Array.from(uniqueMap.values());
  }, [downloadedSongIds, userSongs, likedTracks, globalSongs]);

  const trendingList = useMemo(() =>
    [...globalSongs].sort((a, b) => parseInt(b.streams || "0") - parseInt(a.streams || "0")).slice(0, 8),
    [globalSongs]
  );

  const confirmDelete = () => {
    if (!deleteItem) return;
    triggerHaptic(50);
    const item = { ...deleteItem };
    document.body.style.pointerEvents = "auto";
    setDeleteItem(null);
    if (item.type === "track") {
      deleteUserTrack(item.id);
      toast({ title: "Track Withdrawn", description: "Your single has been removed." });
    } else {
      deleteUserAlbum(item.id);
      toast({ title: "Album Deleted", description: "The project has been removed." });
    }
  };

  return (
    <div className={cn(
      "min-h-screen bg-[#F0F2F5] dark:bg-background transition-colors duration-300",
      (isExpanded || selectedAlbum || selectedPlaylist) && "h-screen overflow-hidden"
    )}>
      <Header />

      <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className={cn(
          "hidden lg:block sticky border-r border-border/50 transition-all",
          "top-[61px] h-[calc(100vh-61px)]"
        )}>
          <MainNav />
        </aside>

        <main className={cn("flex flex-col pb-56 relative transition-all", "pt-0")}>

          {/* Offline banner */}
          {isOffline && (
            <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-center gap-2">
              <WifiOff className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Offline — showing saved music</span>
            </div>
          )}

          {/* Sticky search bar */}
          <div className={cn(
            "sticky z-30 bg-[#F0F2F5]/95 dark:bg-background/95 backdrop-blur-xl border-b border-border/20 px-3 sm:px-5 py-2.5 flex items-center gap-2.5 transition-all",
            "top-[61px]"
          )}>
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search songs, artists, albums…"
                className="pl-9 pr-8 h-9 rounded-xl bg-white/80 dark:bg-card/60 border-transparent focus-visible:border-primary/30 text-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setSearchQuery("")}>
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Tab content */}
          <div className="px-3 sm:px-5 py-4">

            {/* ── DISCOVER ── */}
            {activeTab === "discover" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-400">

                {/* Offline recently played */}
                {isOffline && recentlyPlayedTracks.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <WifiOff className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Recently Played</span>
                    </div>
                    <MusicGrid type="song" title="" items={recentlyPlayedTracks} />
                  </div>
                )}

                {/* Loading state */}
                {isMusicLoading ? (
                  <DiscoverSkeleton />
                ) : !hasResults && searchQuery ? (
                  /* No search results */
                  <div className="py-20 flex flex-col items-center gap-5 bg-white/60 dark:bg-card/30 rounded-3xl border border-dashed border-border/50">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Music className="h-8 w-8 text-primary/40" />
                    </div>
                    <div className="text-center space-y-1">
                      <h3 className="text-lg font-black italic uppercase tracking-tighter">Nothing Found</h3>
                      <p className="text-muted-foreground text-sm">No tracks match "{searchQuery}"</p>
                    </div>
                    <Button variant="outline" className="rounded-full px-8 border-primary text-primary font-bold" onClick={() => setSearchQuery("")}>
                      Clear Search
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* ── HERO BANNER ── */}
                    {!searchQuery && heroTrack && (
                      <div
                        className="relative w-full rounded-3xl overflow-hidden cursor-pointer group shadow-xl"
                        style={{ minHeight: "200px" }}
                        onClick={() => setTrack(heroTrack)}
                      >
                        <Image src={heroTrack.cover} alt={heroTrack.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />

                        {/* Top badges */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                          <span className="bg-primary text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Flame className="h-2.5 w-2.5 fill-current" /> #1 Trending
                          </span>
                          <span className="bg-black/40 backdrop-blur-md text-white/80 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Zap className="h-2.5 w-2.5 text-yellow-400" />
                            {fmt(heroTrack.streams ?? 0)} plays
                          </span>
                        </div>

                        {/* Bottom info */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
                          <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-white leading-none line-clamp-1 drop-shadow-lg">
                            {heroTrack.title}
                          </h2>
                          <p className="text-sm font-bold text-white/70">{heroTrack.artist}</p>
                          <Button
                            size="sm"
                            className="rounded-full bg-white text-black font-black gap-1.5 hover:scale-105 active:scale-95 transition-transform px-5 h-9 text-xs shadow-xl"
                            onClick={e => { e.stopPropagation(); setTrack(heroTrack); }}
                          >
                            <Play className="h-3.5 w-3.5 fill-current" /> Play Now
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* ── STAT PILLS ── */}
                    {!searchQuery && (
                      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                        {[
                          { icon: Headphones, label: `${globalSongs.length} Tracks`, color: "text-primary", bg: "bg-primary/10" },
                          { icon: Disc3, label: `${globalAlbums.length} Albums`, color: "text-violet-500", bg: "bg-violet-500/10" },
                          { icon: ListMusic, label: `${globalPlaylists.length} Playlists`, color: "text-pink-500", bg: "bg-pink-500/10" },
                        ].map(p => (
                          <div key={p.label} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-2xl shrink-0", p.bg)}>
                            <p.icon className={cn("h-3.5 w-3.5", p.color)} />
                            <span className={cn("text-[11px] font-black", p.color)}>{p.label}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── EMPTY STATE (no music yet) ── */}
                    {!searchQuery && globalSongs.length === 0 && globalAlbums.length === 0 && !isMusicLoading && (
                      <div className="py-16 flex flex-col items-center gap-5 bg-white/60 dark:bg-card/30 rounded-3xl border border-dashed border-border/50">
                        <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                          <Music className="h-10 w-10 text-primary/50" />
                        </div>
                        <div className="text-center space-y-2 px-6">
                          <h3 className="text-lg font-black italic uppercase tracking-tighter">No Music Yet</h3>
                          <p className="text-sm text-muted-foreground">Be the first creator to upload a track. Hit the Upload tab below to get started!</p>
                        </div>
                      </div>
                    )}

                    {/* ── BOOSTED / TRENDING ── */}
                    {!searchQuery && trendingBoosted.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-0.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                            <span className="text-sm font-black uppercase tracking-widest">Trending</span>
                            <span className="text-[9px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Zap className="h-2.5 w-2.5 fill-current" /> Boosted
                            </span>
                          </div>
                        </div>
                        <MusicGrid type="song" title="" items={trendingBoosted} />
                      </div>
                    )}

                    <NativeAdNode type="standard" id="discover-hero-sep" />

                    {/* ── FOR YOU ── */}
                    {!searchQuery && forYouSongs.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-0.5">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span className="text-sm font-black uppercase tracking-widest">For You</span>
                          </div>
                          <span className="text-[10px] font-black text-muted-foreground">{forYouSongs.length} picks</span>
                        </div>
                        <MusicGrid type="song" title="" items={forYouSongs.slice(0, 10)} />
                      </div>
                    )}

                    {/* ── TOP TRENDING LIST ── */}
                    {!searchQuery && trendingList.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-0.5">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-rose-500" />
                            <span className="text-sm font-black uppercase tracking-widest">Top Streams</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {trendingList.slice(0, 5).map((track, i) => (
                            <TrendingRow key={track.id} track={track} rank={i + 1} onPlay={() => setTrack(track)} />
                          ))}
                        </div>
                        {trendingList.length > 5 && (
                          <button className="w-full py-3 rounded-2xl bg-white/60 dark:bg-card/40 border border-border/30 text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-1.5 hover:bg-white/80 dark:hover:bg-card/60 transition-colors">
                            View All <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}

                    <NativeAdNode type="standard" id="discover-trending-sep" />

                    {/* ── SEARCH RESULTS ── */}
                    {searchQuery && filteredSongs.length > 0 && (
                      <div className="space-y-3">
                        <span className="text-sm font-black uppercase tracking-widest px-0.5">Songs</span>
                        <MusicGrid type="song" title="" items={filteredSongs} />
                      </div>
                    )}

                    {/* ── NEW RELEASES ── */}
                    {globalSongs.length > 0 && !searchQuery && (
                      <>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 px-0.5">
                            <Radio className="h-4 w-4 text-violet-500" />
                            <span className="text-sm font-black uppercase tracking-widest">{t("music_new_releases")}</span>
                          </div>
                          <MusicGrid type="song" title="" items={[...globalSongs].reverse()} />
                        </div>
                        <NativeAdNode type="standard" id="discover-new-sep" />
                      </>
                    )}

                    {/* ── ALBUMS ── */}
                    {filteredAlbums.length > 0 && (
                      <>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 px-0.5">
                            <Disc3 className="h-4 w-4 text-pink-500" />
                            <span className="text-sm font-black uppercase tracking-widest">{searchQuery ? "Albums" : t("music_trending_albums")}</span>
                          </div>
                          <MusicGrid type="album" title="" items={filteredAlbums} />
                        </div>
                        <NativeAdNode type="standard" id="discover-albums-sep" />
                      </>
                    )}

                    {/* ── PLAYLISTS ── */}
                    {filteredPlaylists.length > 0 && (
                      <>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 px-0.5">
                            <ListMusic className="h-4 w-4 text-cyan-500" />
                            <span className="text-sm font-black uppercase tracking-widest">{searchQuery ? "Playlists" : t("music_top_playlists")}</span>
                          </div>
                          <MusicGrid type="playlist" title="" items={filteredPlaylists} />
                        </div>
                        <NativeAdNode type="standard" id="discover-playlists-sep" />
                      </>
                    )}

                    {/* ── ARTISTS ── */}
                    {filteredArtists.length > 0 && (
                      <>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 px-0.5">
                            <Headphones className="h-4 w-4 text-amber-500" />
                            <span className="text-sm font-black uppercase tracking-widest">{searchQuery ? "Artists" : t("music_trending_artists")}</span>
                          </div>
                          <MusicGrid type="artist" title="" items={filteredArtists} />
                        </div>
                        <NativeAdNode type="standard" id="discover-artists-sep" />
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── CHARTS ── */}
            {activeTab === "chart" && <MusicCharts />}

            {/* ── UPLOAD ── */}
            {activeTab === "upload" && <MusicUpload onCancel={() => setActiveTab("discover")} />}

            {/* ── LIBRARY ── */}
            {activeTab === "library" && (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-400">

                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Library className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-black italic uppercase tracking-tighter">{t("music_my_library")}</h2>
                  </div>
                  {libraryTab === "playlists" && (
                    <Button
                      size="sm"
                      className="rounded-full bg-primary text-white font-bold gap-1.5 h-9 px-4 text-[11px] shadow-md shadow-primary/20"
                      onClick={() => openCreatePlaylist()}
                    >
                      <Plus className="h-3.5 w-3.5" /> New Playlist
                    </Button>
                  )}
                </div>

                {/* Sub-tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {[
                    { id: "playlists", label: "Playlists", icon: ListMusic, count: userPlaylists.length },
                    { id: "songs", label: "My Songs", icon: Music, count: userSongs.length },
                    { id: "albums", label: "My Albums", icon: Disc3, count: userAlbums.length },
                    { id: "downloaded", label: "Saved", icon: Download, count: downloadedTracks.length },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setLibraryTab(tab.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-[11px] font-black shrink-0 transition-all border",
                        libraryTab === tab.id
                          ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                          : "bg-white/80 dark:bg-card/60 border-border/40 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <tab.icon className="h-3.5 w-3.5" />
                      {tab.label}
                      {tab.count > 0 && (
                        <span className={cn("text-[10px] font-black px-1.5 py-0.5 rounded-full", libraryTab === tab.id ? "bg-white/20" : "bg-muted text-muted-foreground")}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <NativeAdNode type="standard" id="library-header-sep" />

                {/* Playlists */}
                {libraryTab === "playlists" && (
                  isMusicLoading ? <LibrarySkeleton /> :
                  userPlaylists.length === 0 ? (
                    <LibraryEmpty
                      icon={<ListMusic className="h-8 w-8 text-primary/30" />}
                      title="No Playlists Yet"
                      desc="Create your first playlist to curate your vibe."
                      action={<Button className="rounded-full bg-primary text-white font-bold px-6 h-9 text-sm" onClick={() => openCreatePlaylist()}>Create Playlist</Button>}
                    />
                  ) : <MusicGrid type="playlist" items={userPlaylists} />
                )}

                {/* My Songs */}
                {libraryTab === "songs" && (
                  isMusicLoading ? <LibrarySkeleton /> :
                  userSongs.length === 0 ? (
                    <LibraryEmpty
                      icon={<Music className="h-8 w-8 text-primary/30" />}
                      title="No Tracks Yet"
                      desc="Upload your first track to build your catalog."
                      action={<Button className="rounded-full bg-primary text-white font-bold px-6 h-9 text-sm" onClick={() => setActiveTab("upload")}>Upload Track</Button>}
                    />
                  ) : (
                    <div className="space-y-2">
                      {userSongs.map(song => (
                        <div key={song.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/70 dark:bg-card/60 border border-border/30">
                          <div className="relative h-12 w-12 rounded-xl overflow-hidden shrink-0 shadow-md">
                            <Image src={song.cover} alt={song.title} fill className="object-cover" />
                          </div>
                          <div className="flex-1 min-w-0" onClick={() => setTrack(song)}>
                            <p className="text-sm font-bold truncate">{song.title}</p>
                            <p className="text-[11px] text-muted-foreground">{song.artist}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Zap className="h-3 w-3 text-primary" />
                            <span className="text-[11px] font-black text-muted-foreground">{fmt(song.streams || 0)}</span>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground shrink-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl">
                              <DropdownMenuItem className="text-destructive gap-2 font-bold" onSelect={() => setDeleteItem({ id: song.id, type: "track" })}>
                                <Trash2 className="h-4 w-4" /> Withdraw Track
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* My Albums */}
                {libraryTab === "albums" && (
                  isMusicLoading ? <LibrarySkeleton /> :
                  userAlbums.length === 0 ? (
                    <LibraryEmpty
                      icon={<Disc3 className="h-8 w-8 text-primary/30" />}
                      title="No Albums Yet"
                      desc="Create your first album in the studio."
                      action={<Button className="rounded-full bg-primary text-white font-bold px-6 h-9 text-sm" onClick={() => setActiveTab("upload")}>Create Album</Button>}
                    />
                  ) : (
                    <div className="space-y-2">
                      {userAlbums.map(album => (
                        <div key={album.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/70 dark:bg-card/60 border border-border/30">
                          <div className="relative h-12 w-12 rounded-xl overflow-hidden shrink-0 shadow-md">
                            <Image src={album.cover} alt={album.title} fill className="object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{album.title}</p>
                            <p className="text-[11px] text-muted-foreground">{album.tracks} tracks · {album.year}</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground shrink-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl">
                              <DropdownMenuItem className="text-destructive gap-2 font-bold" onSelect={() => setDeleteItem({ id: album.id, type: "album" })}>
                                <Trash2 className="h-4 w-4" /> Delete Album
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* Saved / Downloaded */}
                {libraryTab === "downloaded" && (
                  downloadedTracks.length === 0 ? (
                    <LibraryEmpty
                      icon={<Download className="h-8 w-8 text-green-400/60" />}
                      title="Nothing Saved Yet"
                      desc="Save tracks to listen offline."
                      action={<Button variant="outline" className="rounded-full border-green-500 text-green-600 font-bold px-6 h-9 text-sm" onClick={() => setActiveTab("discover")}>Browse Music</Button>}
                    />
                  ) : <MusicGrid type="song" items={downloadedTracks} />
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      <MusicNav activeTab={activeTab} onTabChange={setActiveTab} />
      <CreatePlaylistModal />

      {/* Delete dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={open => !open && setDeleteItem(null)}>
        <AlertDialogContent className="rounded-3xl bg-white/95 dark:bg-card/95 backdrop-blur-2xl border-destructive/10 shadow-2xl max-w-sm mx-4">
          <AlertDialogHeader>
            <div className="mx-auto h-14 w-14 bg-destructive/10 rounded-2xl flex items-center justify-center text-destructive mb-3">
              <Trash2 className="h-7 w-7" />
            </div>
            <AlertDialogTitle className="font-black italic uppercase tracking-tighter text-xl text-center">Delete Content?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm leading-relaxed">
              This will permanently remove this {deleteItem?.type === "track" ? "track" : "album"} from ViMore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 pt-4">
            <AlertDialogAction onClick={confirmDelete} className="rounded-2xl h-12 font-black uppercase tracking-widest text-[11px] bg-destructive hover:bg-destructive/90 text-white">
              Delete
            </AlertDialogAction>
            <AlertDialogCancel className="rounded-2xl h-12 font-black uppercase tracking-widest text-[11px] border-none hover:bg-secondary">
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function MusicPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F0F2F5] dark:bg-background flex flex-col">
        <div className="h-16 bg-white/80 dark:bg-card/80 border-b border-border/30" />
        <div className="px-4 py-6 space-y-5 animate-pulse">
          <div className="h-52 rounded-3xl bg-muted/40" />
          <div className="flex gap-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-8 w-24 rounded-full bg-muted/40" />)}
          </div>
          <div className="flex gap-3 overflow-hidden">
            {[...Array(4)].map((_, i) => <div key={i} className="h-36 w-32 rounded-2xl bg-muted/40 shrink-0" />)}
          </div>
        </div>
      </div>
    }>
      <MusicPageContent />
    </Suspense>
  );
}
