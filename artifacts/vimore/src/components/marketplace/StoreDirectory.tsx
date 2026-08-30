"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePosts } from "@/context/PostContext";
import { listAllStores, getMyStore, isStoreBoosted, StoreDoc, STORE_CATEGORIES } from "@/lib/stores";
import { StoreCard, StoreCardSkeleton, CATEGORY_STYLES } from "./StoreCard";
import { CategoryShelf } from "./CategoryShelf";
import { Search, Store, Zap, X, Plus, WifiOff, ShieldAlert, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const CACHE_KEY = "vimore_store_dir_cache_v2";
const CACHE_TTL = 1000 * 60 * 3;

export function StoreDirectory() {
  const router = useRouter();
  const { currentUser, isOffline } = usePosts();
  const [stores, setStores] = useState<StoreDoc[]>([]);
  const [myStore, setMyStore] = useState<StoreDoc | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const categoryInitialized = useRef(false);
  const sessionSeed = useRef(Math.floor(Math.random() * 0x7fffffff));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cached = typeof window !== "undefined" ? localStorage.getItem(CACHE_KEY) : null;
        if (cached) {
          try {
            const { ts, data } = JSON.parse(cached);
            if (Date.now() - ts < CACHE_TTL && Array.isArray(data)) {
              if (!cancelled) { setStores(data); setLoading(false); }
            }
          } catch {}
        }
        const fresh = await listAllStores(200);
        if (cancelled) return;
        setStores(fresh);
        setLoading(false);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: fresh })); } catch {}
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!currentUser?.$id) { setMyStore(null); return; }
    getMyStore(currentUser.$id).then(s => setMyStore(s ?? null));
  }, [currentUser?.$id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? stores.filter(s =>
          s.store_name.toLowerCase().includes(q) ||
          s.motto.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.owner_username.toLowerCase().includes(q)
        )
      : stores;
    if (activeCategory) return base.filter(s => s.category === activeCategory);
    return base;
  }, [stores, search, activeCategory]);

  const boostedStores = useMemo(() => filtered.filter(isStoreBoosted), [filtered]);
  const regularStores = useMemo(() => filtered.filter(s => !isStoreBoosted(s)), [filtered]);

  const byCategory = useMemo(() => {
    const map = new Map<string, StoreDoc[]>();
    let s = sessionSeed.current;
    for (const cat of STORE_CATEGORIES) {
      const catStores = regularStores.filter(store => store.category === cat);
      if (catStores.length === 0) continue;
      // Shuffle stores within each category using the session seed so order varies per reload
      const shuffled = [...catStores];
      for (let i = shuffled.length - 1; i > 0; i--) {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        const j = Math.abs(s) % (i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      map.set(cat, shuffled);
    }
    return map;
  }, [regularStores]);

  const categoriesWithStores = useMemo(() =>
    STORE_CATEGORIES.filter(c => stores.some(s => s.category === c)),
    [stores]
  );

  // Randomly pre-select a category on first load so the same shelf isn't always shown first
  useEffect(() => {
    if (categoryInitialized.current || categoriesWithStores.length === 0) return;
    categoryInitialized.current = true;
    const randomIdx = Math.floor(Math.random() * categoriesWithStores.length);
    setActiveCategory(categoriesWithStores[randomIdx]);
  }, [categoriesWithStores]);

  const isSearching = search.trim().length > 0 || !!activeCategory;

  return (
    <div className="flex flex-col">
      {/* Sticky compact header */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-card/95 backdrop-blur-sm border-b border-border/40 px-4 pt-4 pb-3 space-y-3">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
              <Store className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase tracking-tight leading-none">Marketplace</h1>
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Local Stores</p>
            </div>
          </div>
          <Button
            onClick={() => router.push(myStore ? `/marketplace/store/${myStore.$id}` : "/marketplace/store/new")}
            size="sm"
            className={cn(
              "h-9 rounded-xl gap-1.5 font-black uppercase tracking-widest text-[9px] px-3",
              myStore ? "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20" : "bg-primary text-white hover:bg-primary/90"
            )}
            disabled={myStore === undefined}
          >
            {myStore ? <><Store className="h-3.5 w-3.5" /> My Store</> : <><Plus className="h-3.5 w-3.5" /> Open Store</>}
          </Button>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search stores, categories..."
            className="pl-10 pr-9 h-10 rounded-xl bg-secondary/30 border-none text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted-foreground/20 flex items-center justify-center"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Category filter pills */}
        {!loading && categoriesWithStores.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 pb-0.5">
            <button
              onClick={() => setActiveCategory(null)}
              className={cn(
                "flex-shrink-0 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-colors",
                !activeCategory
                  ? "bg-primary text-white border-primary"
                  : "bg-secondary/40 text-muted-foreground border-border/40 hover:border-primary/30"
              )}
            >
              All
            </button>
            {categoriesWithStores.map(cat => {
              const style = CATEGORY_STYLES[cat] || CATEGORY_STYLES['Other'];
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                  className={cn(
                    "flex-shrink-0 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap",
                    activeCategory === cat
                      ? cn("border-transparent", style.badge)
                      : "bg-secondary/40 text-muted-foreground border-border/40 hover:border-primary/30"
                  )}
                >
                  <span>{style.emoji}</span>
                  <span>{cat.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Offline notice */}
        {isOffline && stores.length > 0 && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5">
            <WifiOff className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
              Offline — showing {stores.length} cached stores
            </span>
          </div>
        )}

        {/* Safety notice (compact) */}
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-700/30 rounded-xl px-3 py-2">
          <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-[10px] text-amber-800/80 dark:text-amber-200/60 font-medium leading-tight">
            Always meet in a safe public place. ViMore is not responsible for peer-to-peer transactions.
          </p>
        </div>

        {/* Search/filter results */}
        {isSearching && (
          <>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              {activeCategory ? ` in ${activeCategory}` : ""}
            </p>
            <div className="space-y-2">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <StoreCardSkeleton key={i} size="search" />)
                : filtered.map(s => <StoreCard key={s.$id} store={s} size="search" />)
              }
              {!loading && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <Store className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">No stores found</p>
                  <button onClick={() => { setSearch(""); setActiveCategory(null); }} className="text-xs text-primary font-bold hover:underline">Clear filters</button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Default browse view */}
        {!isSearching && (
          <>
            {/* ── Featured / Boosted ── */}
            {(loading || boostedStores.length > 0) && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-[13px] font-black uppercase tracking-tight leading-none">Featured Stores</h2>
                    <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mt-0.5">
                      Boosted to the top
                    </p>
                  </div>
                  <div className="ml-auto">
                    <span className="text-[8px] font-black uppercase tracking-widest bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full border border-amber-300/40 dark:border-amber-700/40">
                      ✨ Promoted
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
                  <div className="flex gap-3 w-max" style={{ scrollSnapType: "x mandatory" }}>
                    {loading
                      ? Array.from({ length: 3 }).map((_, i) => <StoreCardSkeleton key={i} size="boosted" />)
                      : boostedStores.map(s => <StoreCard key={s.$id} store={s} size="boosted" />)
                    }
                  </div>
                </div>
              </section>
            )}

            {/* Empty boost promo */}
            {!loading && boostedStores.length === 0 && (
              <button
                onClick={() => myStore && router.push(`/marketplace/store/${myStore.$id}`)}
                className="w-full rounded-2xl overflow-hidden border border-amber-300/50 dark:border-amber-700/30 group hover:shadow-lg transition-all"
              >
                <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 px-4 py-3 flex items-center gap-3">
                  <Zap className="h-5 w-5 text-white fill-white" />
                  <div className="text-left">
                    <p className="text-[11px] font-black uppercase tracking-widest text-white">Boost your store to the top</p>
                    <p className="text-[9px] text-white/80 font-bold">Get featured here for just 3 Credits/day</p>
                  </div>
                  <TrendingUp className="h-4 w-4 text-white ml-auto group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            )}

            {/* Category shelves */}
            {loading
              ? STORE_CATEGORIES.slice(0, 3).map(cat => (
                  <CategoryShelf key={cat} category={cat} stores={[]} loading />
                ))
              : Array.from(byCategory.entries()).map(([cat, catStores]) => (
                  <CategoryShelf key={cat} category={cat} stores={catStores} />
                ))
            }

            {/* No stores at all */}
            {!loading && byCategory.size === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                  <Store className="h-10 w-10 text-primary/40" />
                </div>
                <div>
                  <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">No stores yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Be the first to open a store on ViMore</p>
                </div>
                <Button onClick={() => router.push("/marketplace/store/new")} className="rounded-2xl h-11 px-6 font-black uppercase tracking-widest gap-2">
                  <Plus className="h-4 w-4" /> Open a Store
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
