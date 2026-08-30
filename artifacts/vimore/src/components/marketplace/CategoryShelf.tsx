"use client";

import Link from "next/link";
import { StoreDoc, categoryToSlug } from "@/lib/stores";
import { StoreCard, StoreCardSkeleton, CATEGORY_STYLES } from "./StoreCard";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const GRID_MAX = 10;

interface CategoryShelfProps {
  category: string;
  stores: StoreDoc[];
  loading?: boolean;
}

export function CategoryShelf({ category, stores, loading }: CategoryShelfProps) {
  const slug = categoryToSlug(category);
  const style = CATEGORY_STYLES[category] || CATEGORY_STYLES['Other'];
  const visible = stores.slice(0, GRID_MAX);
  const hasMore = stores.length > GRID_MAX;

  if (!loading && stores.length === 0) return null;

  return (
    <section className={cn("rounded-2xl border overflow-hidden", style.border)}>
      <div className={cn("px-4 py-3 flex items-center justify-between", style.soft)}>
        <div className="flex items-center gap-2.5">
          <span className="text-xl leading-none">{style.emoji}</span>
          <div>
            <h2 className={cn("text-[11px] font-black uppercase tracking-widest leading-none", style.text)}>{category}</h2>
            {!loading && (
              <p className="text-[9px] text-muted-foreground font-bold mt-0.5">
                {stores.length} store{stores.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
        {(hasMore || stores.length > 5) && (
          <Link
            href={`/marketplace/category/${slug}`}
            className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:underline", style.text)}
          >
            See All <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      <div className="p-3 bg-white dark:bg-card">
        <div className="grid grid-cols-5 gap-2">
          {loading
            ? Array.from({ length: 10 }).map((_, i) => <StoreCardSkeleton key={i} />)
            : visible.map(store => <StoreCard key={store.$id} store={store} />)
          }
          {hasMore && !loading && (
            <Link
              href={`/marketplace/category/${slug}`}
              className={cn(
                "w-full flex flex-col items-center justify-center text-center rounded-xl border-2 border-dashed p-2 transition-colors gap-1",
                style.border,
                style.soft
              )}
            >
              <ArrowRight className={cn("h-4 w-4", style.text)} />
              <span className={cn("text-[8px] font-black uppercase tracking-widest leading-tight", style.text)}>
                +{stores.length - GRID_MAX}
              </span>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
