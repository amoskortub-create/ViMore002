
"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export function StoryRailSkeleton() {
  return (
    <div className="flex gap-3 p-1 pb-4 overflow-hidden">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="relative w-28 h-48 rounded-2xl overflow-hidden shrink-0 border border-primary/5">
          <Skeleton className="w-full h-full" />
          <div className="absolute top-2 left-2">
            <Skeleton className="h-8 w-8 rounded-full border-2 border-background" />
          </div>
          <div className="absolute bottom-2 left-2 right-2">
            <Skeleton className="h-2 w-16 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PostCardSkeleton() {
  return (
    <Card className="border-none shadow-sm overflow-hidden mb-4 bg-white dark:bg-card">
      <CardHeader className="flex flex-row items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-2 w-20" />
          </div>
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </CardHeader>
      <CardContent className="px-3 pb-2 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[90%]" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </CardContent>
      <CardFooter className="p-3 pt-0 flex justify-between gap-2 border-t border-primary/5 mt-2">
        <Skeleton className="h-9 flex-1 rounded-md" />
        <Skeleton className="h-9 flex-1 rounded-md" />
        <Skeleton className="h-9 flex-1 rounded-md" />
      </CardFooter>
    </Card>
  );
}
