"use client";

import React, { useState, useMemo } from "react";
import { TrendingUp, Play, Globe, Flame, Music2, Zap, Crown, BarChart2, Star, AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeAdNode } from "@/components/ad/native-ad-node";
import { useMusic, Track } from "@/context/MusicContext";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

const CHART_CATEGORIES = [
  { id: "global", label: "Global", icon: Globe },
  { id: "rising", label: "Rising", icon: TrendingUp },
  { id: "viral", label: "Viral", icon: Flame },
];

function fmt(n: number | string): string {
  const num = typeof n === "string" ? parseInt(n, 10) : n;
  if (isNaN(num)) return "0";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

const RANK_COLORS = [
  "from-yellow-400 to-amber-500",
  "from-slate-300 to-slate-400",
  "from-amber-600 to-amber-700",
];
const RANK_TEXT = ["text-yellow-500", "text-slate-400", "text-amber-600"];

export function MusicCharts() {
  const [activeCategory, setActiveCategory] = useState("global");
  const { globalSongs, setTrack, currentTrack, isPlaying, trackStats } = useMusic();

  const rankedSongs = useMemo(() => {
    if (!globalSongs || globalSongs.length === 0) return [];
    return [...globalSongs].sort((a, b) => {
      if (a.isBoosted && !b.isBoosted) return -1;
      if (!a.isBoosted && b.isBoosted) return 1;
      const aLikes = trackStats[a.id]?.likes || a.likes || 0;
      const bLikes = trackStats[b.id]?.likes || b.likes || 0;
      return bLikes - aLikes;
    }).slice(0, 50);
  }, [globalSongs, trackStats]);

  if (rankedSongs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-5 animate-in fade-in duration-500">
        <div className="h-20 w-20 bg-primary/5 rounded-3xl flex items-center justify-center border-2 border-dashed border-primary/20">
          <Music2 className="h-10 w-10 text-primary/20" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-xl font-black italic uppercase tracking-tighter">No Charts Yet</h3>
          <p className="text-muted-foreground text-sm">Upload tracks to see them rank here.</p>
        </div>
      </div>
    );
  }

  const top3 = rankedSongs.slice(0, 3);
  const rest = rankedSongs.slice(3);
  const topSong = top3[0];

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-400 pb-8">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-primary" />
            <h2 className="text-xl font-black italic uppercase tracking-tighter">Charts</h2>
          </div>
          <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest">{globalSongs.length} tracks ranked</p>
        </div>
        <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-black text-primary uppercase tracking-widest">Live</span>
        </div>
      </div>

      {/* ── CATEGORY CHIPS ── */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {CHART_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest shrink-0 border transition-all",
              activeCategory === cat.id
                ? "bg-primary text-white border-primary shadow-lg shadow-primary/25"
                : "bg-white/80 dark:bg-card/70 border-border/50 text-muted-foreground hover:text-foreground"
            )}
          >
            <cat.icon className="h-3.5 w-3.5" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── TOP 3 PODIUM ── */}
      {top3.length >= 1 && (
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-950 shadow-2xl">
          {/* blurred bg from #1 cover */}
          {topSong && (
            <div className="absolute inset-0 -z-0">
              <Image src={topSong.cover} alt="" fill className="object-cover opacity-20 blur-2xl scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/70 to-zinc-900/50" />
            </div>
          )}

          <div className="relative z-10 p-4 sm:p-5">
            {/* Podium bars */}
            <div className="flex items-end justify-center gap-2 sm:gap-3 mb-4">
              {/* 2nd place */}
              {top3[1] && (
                <div className="flex flex-col items-center gap-2 flex-1 max-w-[100px]">
                  <div
                    className="relative w-full aspect-square rounded-2xl overflow-hidden cursor-pointer group shadow-xl"
                    onClick={() => setTrack(top3[1])}
                  >
                    <Image src={top3[1].cover} alt={top3[1].title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/30" />
                    <div className="absolute top-1.5 left-1.5 h-6 w-6 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center text-white text-[11px] font-black shadow-lg">2</div>
                    {currentTrack?.id === top3[1].id && isPlaying && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="flex gap-0.5 items-end h-4">
                          {[1,2,3].map(i => <div key={i} className="w-1 bg-white rounded-full animate-bounce" style={{ height: `${i*30+10}%`, animationDelay: `${i*100}ms` }} />)}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-center w-full">
                    <p className="text-[11px] font-bold text-white line-clamp-1">{top3[1].title}</p>
                    <p className="text-[9px] text-white/50 line-clamp-1">{top3[1].artist}</p>
                  </div>
                  <div className="w-full h-10 bg-gradient-to-t from-slate-400/30 to-transparent rounded-t-lg" />
                </div>
              )}

              {/* 1st place */}
              <div className="flex flex-col items-center gap-2 flex-1 max-w-[120px]">
                <Crown className="h-5 w-5 text-yellow-400 fill-yellow-400 drop-shadow-lg" />
                <div
                  className="relative w-full aspect-square rounded-2xl overflow-hidden cursor-pointer group shadow-2xl ring-2 ring-yellow-400/50"
                  onClick={() => setTrack(top3[0])}
                >
                  <Image src={top3[0].cover} alt={top3[0].title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/10" />
                  <div className="absolute top-1.5 left-1.5 h-6 w-6 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-black text-[11px] font-black shadow-lg">1</div>
                  {currentTrack?.id === top3[0].id && isPlaying && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="flex gap-0.5 items-end h-4">
                        {[1,2,3].map(i => <div key={i} className="w-1 bg-white rounded-full animate-bounce" style={{ height: `${i*30+10}%`, animationDelay: `${i*100}ms` }} />)}
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Play className="h-5 w-5 text-white fill-current ml-0.5" />
                    </div>
                  </div>
                </div>
                <div className="text-center w-full">
                  <p className="text-[12px] font-black text-white line-clamp-1">{top3[0].title}</p>
                  <p className="text-[10px] text-white/60 line-clamp-1">{top3[0].artist}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Zap className="h-3 w-3 text-yellow-400" />
                    <span className="text-[9px] font-black text-yellow-400">{fmt(top3[0].streams || 0)}</span>
                  </div>
                </div>
                <div className="w-full h-16 bg-gradient-to-t from-yellow-400/20 to-transparent rounded-t-lg" />
              </div>

              {/* 3rd place */}
              {top3[2] && (
                <div className="flex flex-col items-center gap-2 flex-1 max-w-[100px]">
                  <div
                    className="relative w-full aspect-square rounded-2xl overflow-hidden cursor-pointer group shadow-xl"
                    onClick={() => setTrack(top3[2])}
                  >
                    <Image src={top3[2].cover} alt={top3[2].title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/35" />
                    <div className="absolute top-1.5 left-1.5 h-6 w-6 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white text-[11px] font-black shadow-lg">3</div>
                    {currentTrack?.id === top3[2].id && isPlaying && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="flex gap-0.5 items-end h-4">
                          {[1,2,3].map(i => <div key={i} className="w-1 bg-white rounded-full animate-bounce" style={{ height: `${i*30+10}%`, animationDelay: `${i*100}ms` }} />)}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-center w-full">
                    <p className="text-[11px] font-bold text-white line-clamp-1">{top3[2].title}</p>
                    <p className="text-[9px] text-white/50 line-clamp-1">{top3[2].artist}</p>
                  </div>
                  <div className="w-full h-6 bg-gradient-to-t from-amber-600/20 to-transparent rounded-t-lg" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <NativeAdNode type="standard" id="chart-hero-sep" />

      {/* ── FULL RANKED LIST ── */}
      <div className="rounded-3xl bg-white/80 dark:bg-card/60 backdrop-blur-xl border border-border/40 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Full Rankings</span>
          <span className="text-[10px] font-black text-primary">{rankedSongs.length} tracks</span>
        </div>

        {rankedSongs.map((item, index) => {
          const rank = index + 1;
          const isCurrent = currentTrack?.id === item.id;
          const plays = parseInt(item.streams || "0", 10);
          const likes = trackStats[item.id]?.likes || item.likes || 0;

          return (
            <React.Fragment key={item.id}>
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-black/5 dark:active:bg-white/5 transition-colors",
                  isCurrent ? "bg-primary/5 dark:bg-primary/10" : "hover:bg-black/3 dark:hover:bg-white/3"
                )}
                onClick={() => setTrack(item)}
              >
                {/* Rank badge */}
                <div className="w-8 shrink-0 flex flex-col items-center gap-0.5">
                  {rank <= 3 ? (
                    <div className={cn("h-6 w-6 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-black shadow", RANK_COLORS[rank - 1])}>
                      {rank}
                    </div>
                  ) : (
                    <span className="text-sm font-black italic text-muted-foreground">{rank.toString().padStart(2, "0")}</span>
                  )}
                  {rank <= 5 && <TrendingUp className="h-2.5 w-2.5 text-green-500" />}
                </div>

                {/* Cover */}
                <div className="relative h-12 w-12 rounded-xl overflow-hidden shadow-md shrink-0">
                  <Image src={item.cover} alt={item.title} fill className="object-cover" />
                  {isCurrent && isPlaying && (
                    <div className="absolute inset-0 bg-primary/40 flex items-center justify-center">
                      <div className="flex gap-0.5 items-end h-4">
                        {[1,2,3].map(i => <div key={i} className="w-0.5 bg-white rounded-full animate-bounce" style={{ height: `${i*30+20}%`, animationDelay: `${i*100}ms` }} />)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={cn("text-sm font-bold truncate", isCurrent && "text-primary")}>
                      {item.title}
                    </p>
                    {item.isBoosted && <Zap className="h-3 w-3 text-primary fill-current animate-pulse shrink-0" />}
                  </div>
                  <Link
                    href={`/profile/${item.artistUsername || "vimore"}`}
                    className="text-[11px] text-muted-foreground hover:text-primary transition-colors truncate block"
                    onClick={e => e.stopPropagation()}
                  >
                    {item.artist}
                  </Link>
                </div>

                {/* Stats */}
                <div className="text-right shrink-0">
                  <p className="text-[12px] font-black">{fmt(plays)}</p>
                  <p className="text-[9px] text-muted-foreground font-bold">{fmt(likes)} ♥</p>
                </div>
              </div>

              {rank % 5 === 0 && rank < rankedSongs.length && (
                <NativeAdNode type="standard" id={`chart-rank-${rank}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── BOTTOM CARDS ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-violet-600 via-primary to-purple-700 rounded-2xl p-4 text-white shadow-xl relative overflow-hidden">
          <Star className="absolute -right-4 -bottom-4 h-20 w-20 opacity-10" />
          <div className="relative z-10 space-y-1">
            <h3 className="text-sm font-black italic uppercase tracking-tight">Weekly Insight</h3>
            <p className="text-white/70 text-[11px] leading-relaxed">Engagement is peaking. Stay tuned.</p>
          </div>
        </div>
        <div className="bg-white/80 dark:bg-card/60 backdrop-blur-xl rounded-2xl p-4 border border-border/40 shadow-sm space-y-2">
          <div>
            <h3 className="text-sm font-black italic uppercase tracking-tight">Network</h3>
            <p className="text-muted-foreground text-[11px] font-bold">{globalSongs.length} tracks</p>
          </div>
          <Link href="/admin">
            <Button variant="outline" size="sm" className="rounded-full border-primary text-primary font-bold text-[10px] h-8 px-3 w-full">
              Analytics
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
