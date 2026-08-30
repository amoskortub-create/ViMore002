"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ShoppingBag, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "./ProductCard";
import { listProducts, ProductDoc, isFeatured } from "@/lib/marketplace";

interface Props {
  sellerId: string;
  isOwner: boolean;
}

type Filter = "active" | "sold" | "all";

export function UserListings({ sellerId, isOwner }: Props) {
  const [products, setProducts] = useState<ProductDoc[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("active");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const all = await listProducts({ limit: 200 });
        if (cancelled) return;
        setProducts(all.filter(p => p.sellerId === sellerId));
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sellerId]);

  const filtered = useMemo(() => {
    if (!products) return [];
    const list = filter === "all" ? products : products.filter(p => p.status === filter);
    return [...list].sort((a, b) => Number(isFeatured(b)) - Number(isFeatured(a)));
  }, [products, filter]);

  const counts = useMemo(() => {
    if (!products) return { active: 0, sold: 0, all: 0 };
    return {
      active: products.filter(p => p.status === "active").length,
      sold: products.filter(p => p.status === "sold").length,
      all: products.length,
    };
  }, [products]);

  const handleDeleted = (productId: string) => {
    setProducts(prev => prev ? prev.filter(p => p.$id !== productId) : prev);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="h-14 w-14 rounded-2xl bg-fuchsia-500/10 text-fuchsia-500 flex items-center justify-center mb-3">
          <ShoppingBag className="h-7 w-7" />
        </div>
        <p className="text-sm font-bold text-foreground">No listings yet</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          {isOwner ? "List your first product on the Marketplace." : "This user hasn't listed anything for sale."}
        </p>
        {isOwner && (
          <Link href="/marketplace/new">
            <Button className="mt-4 rounded-2xl bg-primary hover:bg-primary/90 gap-2 h-10 px-5">
              <Plus className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">List a Product</span>
            </Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 bg-secondary/40 rounded-full p-1">
          {(["active", "sold", "all"] as Filter[]).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 h-8 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors ${filter === f ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {f} <span className="opacity-60 ml-1">{counts[f]}</span>
            </button>
          ))}
        </div>
        {isOwner && (
          <Link href="/marketplace/new">
            <Button size="sm" className="rounded-xl bg-primary hover:bg-primary/90 gap-1.5 h-9">
              <Plus className="h-3.5 w-3.5" />
              <span className="text-[10px] font-black uppercase tracking-widest">New</span>
            </Button>
          </Link>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-10 italic">
          No {filter === "all" ? "" : filter} listings.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map(p => (
            <ProductCard key={p.$id} product={p} onDeleted={handleDeleted} />
          ))}
        </div>
      )}
    </div>
  );
}
