"use client";

import { MainNav } from "@/components/layout/main-nav";
import { StoreDirectory } from "@/components/marketplace/StoreDirectory";

export default function MarketplacePage() {
  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-background flex justify-center">
      <div className="max-w-[1440px] w-full grid grid-cols-1 md:grid-cols-[280px_1fr]">
        <aside className="hidden md:block border-r border-primary/5 bg-white dark:bg-card">
          <div className="sticky top-0 h-screen overflow-y-auto"><MainNav /></div>
        </aside>
        <main className="w-full bg-white dark:bg-card min-h-screen pb-24 md:pb-6">
          <StoreDirectory />
        </main>
      </div>
    </div>
  );
}
