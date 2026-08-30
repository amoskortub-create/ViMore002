"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, ShoppingBag, SlidersHorizontal, X } from "lucide-react";
import { listProducts, ProductDoc, ProductCurrency, isFeatured } from "@/lib/marketplace";
import { ProductCard } from "./ProductCard";

const CACHE_KEY = "vimore_marketplace_cache_v1";
const CACHE_TTL_MS = 1000 * 60 * 2;

type SortKey = "newest" | "price_asc" | "price_desc";

export function ProductGrid() {
  const [products, setProducts] = useState<ProductDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState<"ALL" | ProductCurrency>("ALL");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cached = typeof window !== 'undefined' ? localStorage.getItem(CACHE_KEY) : null;
        if (cached) {
          try {
            const { ts, data } = JSON.parse(cached);
            if (Date.now() - ts < CACHE_TTL_MS && Array.isArray(data)) {
              if (!cancelled) { setProducts(data); setLoading(false); }
            }
          } catch {}
        }
        const fresh = await listProducts({ limit: 100 });
        if (cancelled) return;
        setProducts(fresh);
        setLoading(false);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: fresh })); } catch {}
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = minPrice ? parseFloat(minPrice) : null;
    const max = maxPrice ? parseFloat(maxPrice) : null;
    const filtered = products.filter(p => {
      if (p.status !== 'active') return false;
      if (currencyFilter !== "ALL" && p.priceCurrency !== currencyFilter) return false;
      if (min !== null && !isNaN(min) && p.priceAmount < min) return false;
      if (max !== null && !isNaN(max) && p.priceAmount > max) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.sellerUsername.toLowerCase().includes(q)
      );
    });

    const sorted = [...filtered];
    if (sortKey === "price_asc") {
      sorted.sort((a, b) => a.priceAmount - b.priceAmount);
    } else if (sortKey === "price_desc") {
      sorted.sort((a, b) => b.priceAmount - a.priceAmount);
    } else {
      sorted.sort((a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime());
    }
    // Featured listings always float to the top
    sorted.sort((a, b) => Number(isFeatured(b)) - Number(isFeatured(a)));
    return sorted;
  }, [products, search, currencyFilter, minPrice, maxPrice, sortKey]);

  const activeFilterCount = (currencyFilter !== "ALL" ? 1 : 0) + (minPrice ? 1 : 0) + (maxPrice ? 1 : 0) + (sortKey !== "newest" ? 1 : 0);

  const clearFilters = () => {
    setCurrencyFilter("ALL");
    setMinPrice("");
    setMaxPrice("");
    setSortKey("newest");
  };

  const onDeleted = (id: string) => {
    setProducts(prev => prev.filter(p => p.$id !== id));
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data } = JSON.parse(cached);
        const next = (data || []).filter((p: ProductDoc) => p.$id !== id);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: next }));
      }
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products, location, seller..."
            className="pl-10 pr-10 h-11 rounded-xl bg-secondary/30 border-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted-foreground/20 text-muted-foreground hover:bg-muted-foreground/30 flex items-center justify-center"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <Button
          type="button"
          variant={showFilters || activeFilterCount > 0 ? "default" : "secondary"}
          onClick={() => setShowFilters(s => !s)}
          className="h-11 rounded-xl gap-2 px-4 font-black uppercase tracking-widest text-[10px]"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 h-5 min-w-5 px-1.5 rounded-full bg-white/20 text-[10px] font-black flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {showFilters && (
        <div className="bg-secondary/20 border border-border/40 rounded-2xl p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">Currency</p>
            <div className="flex items-center gap-1 bg-background/60 rounded-xl p-1 w-fit">
              {(["ALL", "LRD", "USD"] as const).map(opt => (
                <Button
                  key={opt}
                  type="button"
                  size="sm"
                  variant={currencyFilter === opt ? "default" : "ghost"}
                  onClick={() => setCurrencyFilter(opt)}
                  className="h-8 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest"
                >
                  {opt === "ALL" ? "All" : opt}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">Price Range</p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="decimal"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="Min"
                className="h-10 rounded-xl bg-background/60 border-none text-sm"
                min={0}
              />
              <span className="text-muted-foreground text-xs">to</span>
              <Input
                type="number"
                inputMode="decimal"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Max"
                className="h-10 rounded-xl bg-background/60 border-none text-sm"
                min={0}
              />
            </div>
          </div>

          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">Sort By</p>
            <div className="flex items-center gap-1 bg-background/60 rounded-xl p-1 flex-wrap">
              {([
                { k: "newest" as SortKey, label: "Newest" },
                { k: "price_asc" as SortKey, label: "Price ↑" },
                { k: "price_desc" as SortKey, label: "Price ↓" },
              ]).map(opt => (
                <Button
                  key={opt.k}
                  type="button"
                  size="sm"
                  variant={sortKey === opt.k ? "default" : "ghost"}
                  onClick={() => setSortKey(opt.k)}
                  className="h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest"
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="flex justify-end pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/10 gap-1.5"
              >
                <X className="h-3 w-3" /> Clear
              </Button>
            </div>
          )}
        </div>
      )}

      {(search || activeFilterCount > 0) && !loading && (
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
          {visible.length} result{visible.length === 1 ? "" : "s"}
        </p>
      )}

      {loading && products.length === 0 ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground gap-3">
          <ShoppingBag className="h-12 w-12 opacity-30" />
          <p className="text-sm font-bold uppercase tracking-widest">
            {search || activeFilterCount > 0 ? "No matches" : "No listings yet"}
          </p>
          <p className="text-xs max-w-xs">
            {search || activeFilterCount > 0
              ? "Try clearing filters or searching for something else."
              : "Be the first to list a product on the ViMore Marketplace."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map(p => (
            <ProductCard key={p.$id} product={p} onDeleted={onDeleted} />
          ))}
        </div>
      )}
    </div>
  );
}
