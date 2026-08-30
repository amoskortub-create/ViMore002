
"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function ShellSkeleton() {
  return (
    <div className="w-full bg-white/95 dark:bg-card/95 border-b border-primary/10 px-4 py-2 flex items-center justify-between shadow-sm sticky top-0 z-[100]">
      <div className="flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-xl" />
        <Skeleton className="hidden sm:block w-48 h-9 rounded-full" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="w-9 h-9 rounded-full" />
        <Skeleton className="w-9 h-9 rounded-full" />
        <Skeleton className="w-9 h-9 rounded-full" />
        <Skeleton className="hidden sm:block w-9 h-9 rounded-full" />
      </div>
    </div>
  );
}

export function SubHeaderSkeleton() {
  return (
    <div className="w-full bg-white dark:bg-card border-b border-primary/5 sticky top-[61px] z-40 h-14">
      <div className="max-w-[1440px] mx-auto px-4 h-full flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-20 h-6 rounded-lg" />
          <Skeleton className="w-20 h-6 rounded-lg" />
          <Skeleton className="w-20 h-6 rounded-lg" />
          <Skeleton className="hidden sm:block w-20 h-6 rounded-lg" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="w-32 h-8 rounded-xl" />
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}
