"use client";

import { useRouter } from "next/navigation";
import { StoreDoc, getStoreLogoUrl, isStoreBoosted } from "@/lib/stores";
import { Store, Zap, ExternalLink, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePosts } from "@/context/PostContext";

export const CATEGORY_STYLES: Record<string, {
  gradient: string; soft: string; text: string; badge: string; border: string; emoji: string;
}> = {
  'Fashion & Clothing':    { gradient: 'from-rose-400 to-pink-600',     soft: 'bg-rose-50 dark:bg-rose-950/30',    text: 'text-rose-600 dark:text-rose-400',    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',    border: 'border-rose-300/60 dark:border-rose-700/40',    emoji: '👗' },
  'Electronics & Gadgets': { gradient: 'from-blue-400 to-sky-600',      soft: 'bg-blue-50 dark:bg-blue-950/30',     text: 'text-blue-600 dark:text-blue-400',    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',    border: 'border-blue-300/60 dark:border-blue-700/40',    emoji: '📱' },
  'Food & Drinks':         { gradient: 'from-orange-400 to-amber-600',  soft: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-600 dark:text-orange-400', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', border: 'border-orange-300/60 dark:border-orange-700/40', emoji: '🍔' },
  'Beauty & Health':       { gradient: 'from-purple-400 to-fuchsia-600',soft: 'bg-purple-50 dark:bg-purple-950/30', text: 'text-purple-600 dark:text-purple-400', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', border: 'border-purple-300/60 dark:border-purple-700/40', emoji: '💄' },
  'Home & Living':         { gradient: 'from-teal-400 to-emerald-600',  soft: 'bg-teal-50 dark:bg-teal-950/30',    text: 'text-teal-600 dark:text-teal-400',    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',    border: 'border-teal-300/60 dark:border-teal-700/40',    emoji: '🏠' },
  'Services':              { gradient: 'from-indigo-400 to-violet-600', soft: 'bg-indigo-50 dark:bg-indigo-950/30', text: 'text-indigo-600 dark:text-indigo-400', badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300', border: 'border-indigo-300/60 dark:border-indigo-700/40', emoji: '🔧' },
  'Farming & Agriculture': { gradient: 'from-green-400 to-lime-600',    soft: 'bg-green-50 dark:bg-green-950/30',   text: 'text-green-600 dark:text-green-400',  badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',  border: 'border-green-300/60 dark:border-green-700/40',  emoji: '🌾' },
  'Books & Education':     { gradient: 'from-yellow-400 to-orange-500', soft: 'bg-yellow-50 dark:bg-yellow-950/30', text: 'text-yellow-600 dark:text-yellow-500', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', border: 'border-yellow-300/60 dark:border-yellow-700/40', emoji: '📚' },
  'Sports & Fitness':      { gradient: 'from-red-400 to-rose-600',      soft: 'bg-red-50 dark:bg-red-950/30',       text: 'text-red-600 dark:text-red-400',      badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',      border: 'border-red-300/60 dark:border-red-700/40',      emoji: '⚽' },
  'Art & Crafts':          { gradient: 'from-violet-400 to-purple-600', soft: 'bg-violet-50 dark:bg-violet-950/30', text: 'text-violet-600 dark:text-violet-400', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300', border: 'border-violet-300/60 dark:border-violet-700/40', emoji: '🎨' },
  'Other':                 { gradient: 'from-slate-400 to-gray-600',    soft: 'bg-slate-50 dark:bg-slate-950/30',   text: 'text-slate-600 dark:text-slate-400',  badge: 'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300',  border: 'border-slate-300/60 dark:border-slate-700/40',  emoji: '🛍️' },
};

interface StoreCardProps {
  store: StoreDoc;
  size?: "normal" | "boosted" | "search";
}

export function StoreCard({ store, size = "normal" }: StoreCardProps) {
  const router = useRouter();
  const { allUsers } = usePosts();
  const boosted = isStoreBoosted(store);
  const logoUrl = store.logo_file_id ? getStoreLogoUrl(store.logo_file_id) : null;
  const style = CATEGORY_STYLES[store.category] || CATEGORY_STYLES['Other'];
  const isOwnerVerified = allUsers.find(u => u.$id === store.owner_id)?.isVerified || false;

  if (size === "boosted") {
    return (
      <button
        onClick={() => router.push(`/marketplace/store/${store.$id}`)}
        className="flex-shrink-0 w-52 rounded-2xl border overflow-hidden bg-white dark:bg-card shadow-md hover:shadow-xl transition-all duration-200 active:scale-95 snap-start border-amber-300/50 dark:border-amber-700/30 group"
      >
        <div className="relative h-28 bg-gradient-to-br from-amber-400/20 via-yellow-300/10 to-orange-400/20 flex items-center justify-center overflow-hidden">
          {logoUrl ? (
            <img src={logoUrl} alt={store.store_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className={cn("w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg", style.gradient)}>
              <Store className="h-7 w-7 text-white" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber-400 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow">
            <Zap className="h-2.5 w-2.5 fill-white" /> Featured
          </div>
          {isOwnerVerified && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/90 dark:bg-black/60 backdrop-blur-sm text-primary text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full shadow">
              <CheckCircle2 className="h-2.5 w-2.5 fill-primary text-white" /> Verified
            </div>
          )}
        </div>
        <div className="p-3 text-left space-y-1">
          <div className="flex items-center gap-1.5">
            <p className="font-black text-sm text-foreground leading-tight line-clamp-1 flex-1">{store.store_name}</p>
            {isOwnerVerified && <CheckCircle2 className="h-3.5 w-3.5 text-primary fill-primary shrink-0" />}
          </div>
          {store.motto && <p className="text-[10px] text-muted-foreground line-clamp-2 leading-snug">{store.motto}</p>}
          <span className={cn("inline-block text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full mt-1", style.badge)}>
            {style.emoji} {store.category}
          </span>
        </div>
      </button>
    );
  }

  if (size === "search") {
    return (
      <button
        onClick={() => router.push(`/marketplace/store/${store.$id}`)}
        className={cn(
          "w-full flex items-center gap-3 p-3 rounded-2xl border bg-white dark:bg-card shadow-sm hover:shadow-md transition-all active:scale-95",
          style.border
        )}
      >
        <div className={cn("h-12 w-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center", style.soft)}>
          {logoUrl
            ? <img src={logoUrl} alt={store.store_name} className="w-full h-full object-cover" />
            : <Store className={cn("h-6 w-6", style.text)} />
          }
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-black text-sm text-foreground truncate">{store.store_name}</p>
            {isOwnerVerified && <CheckCircle2 className="h-3.5 w-3.5 text-primary fill-primary shrink-0" />}
            {boosted && <Zap className="h-3 w-3 text-amber-500 fill-amber-400 shrink-0" />}
          </div>
          {store.motto && <p className="text-[11px] text-muted-foreground truncate">{store.motto}</p>}
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className={cn("inline-block text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full", style.badge)}>
              {style.emoji} {store.category}
            </span>
            {isOwnerVerified && (
              <span className="inline-flex items-center gap-0.5 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="h-2 w-2" /> Verified Store
              </span>
            )}
          </div>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground/40 shrink-0" />
      </button>
    );
  }

  return (
    <button
      onClick={() => router.push(`/marketplace/store/${store.$id}`)}
      className="w-full flex flex-col items-center text-center rounded-xl border border-border/30 bg-white dark:bg-card/80 p-2 transition-all duration-150 active:scale-90 hover:shadow-md hover:border-primary/20 snap-start group"
    >
      <div className={cn(
        "relative w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center mb-1.5 ring-1 ring-black/5",
        logoUrl ? "" : cn("bg-gradient-to-br", style.gradient)
      )}>
        {logoUrl
          ? <img src={logoUrl} alt={store.store_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
          : <Store className="h-5 w-5 text-white" />
        }
        {boosted && (
          <div className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-amber-400 border border-white flex items-center justify-center">
            <Zap className="h-2 w-2 text-white fill-white" />
          </div>
        )}
        {isOwnerVerified && !boosted && (
          <div className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-white dark:bg-card border border-white flex items-center justify-center shadow-sm">
            <CheckCircle2 className="h-3 w-3 text-primary fill-primary" />
          </div>
        )}
        {isOwnerVerified && boosted && (
          <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-white dark:bg-card border border-white flex items-center justify-center shadow-sm">
            <CheckCircle2 className="h-3 w-3 text-primary fill-primary" />
          </div>
        )}
      </div>
      <p className="text-[9px] font-black leading-tight line-clamp-2 text-foreground w-full">{store.store_name}</p>
    </button>
  );
}

export function StoreCardSkeleton({ size = "normal" }: { size?: "normal" | "boosted" | "search" }) {
  if (size === "boosted") {
    return (
      <div className="flex-shrink-0 w-52 rounded-2xl border border-border/20 bg-secondary/10 animate-pulse snap-start">
        <div className="h-28 bg-secondary/30 rounded-t-2xl" />
        <div className="p-3 space-y-2">
          <div className="h-3 w-28 rounded bg-secondary/40" />
          <div className="h-2.5 w-20 rounded bg-secondary/30" />
          <div className="h-4 w-16 rounded-full bg-secondary/30 mt-1" />
        </div>
      </div>
    );
  }
  if (size === "search") {
    return (
      <div className="w-full flex items-center gap-3 p-3 rounded-2xl border border-border/20 bg-secondary/10 animate-pulse">
        <div className="h-12 w-12 rounded-xl bg-secondary/40 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 rounded bg-secondary/40" />
          <div className="h-2.5 w-16 rounded bg-secondary/30" />
        </div>
      </div>
    );
  }
  return (
    <div className="w-full flex flex-col items-center rounded-xl border border-border/20 bg-secondary/10 animate-pulse p-2">
      <div className="w-11 h-11 rounded-xl bg-secondary/40 mb-1.5" />
      <div className="h-2 w-10 rounded bg-secondary/30" />
      <div className="h-2 w-8 rounded bg-secondary/20 mt-1" />
    </div>
  );
}
