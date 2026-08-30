"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MainNav } from "@/components/layout/main-nav";
import { StoreCard, StoreCardSkeleton } from "@/components/marketplace/StoreCard";
import { listStoresByCategory, slugToCategory, StoreDoc } from "@/lib/stores";
import { ArrowLeft, Store } from "lucide-react";

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const category = slugToCategory(slug);
  const [stores, setStores] = useState<StoreDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!category) { setLoading(false); return; }
    listStoresByCategory(category, 100).then(data => {
      setStores(data);
      setLoading(false);
    });
  }, [category]);

  if (!category) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Store className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Category not found</p>
        <Link href="/marketplace"><Button variant="secondary" className="rounded-xl">Back to Marketplace</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="max-w-[1440px] w-full grid grid-cols-1 md:grid-cols-[280px_1fr]">
        <aside className="hidden md:block border-r border-primary/5 bg-white dark:bg-card">
          <div className="sticky top-0 h-screen overflow-y-auto"><MainNav /></div>
        </aside>

        <main className="px-4 sm:px-6 py-6 pb-24 md:pb-6">
          <header className="flex items-center gap-3 mb-6">
            <Link href="/marketplace">
              <Button variant="ghost" size="icon" className="rounded-full h-10 w-10"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <div>
              <h1 className="text-2xl font-black italic uppercase tracking-tighter">{category}</h1>
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                {loading ? "Loading..." : `${stores.length} store${stores.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </header>

          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex justify-center"><StoreCardSkeleton /></div>
              ))}
            </div>
          ) : stores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
              <Store className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">No stores in this category yet</p>
              <Link href="/marketplace/store/new">
                <Button className="rounded-2xl h-11 px-6 gap-2 font-black uppercase tracking-widest bg-primary mt-1">
                  Open the First Store
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {stores.map(store => (
                <div key={store.$id} className="flex justify-center">
                  <StoreCard store={store} />
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
