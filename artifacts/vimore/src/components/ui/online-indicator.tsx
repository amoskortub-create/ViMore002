"use client";

import { cn } from "@/lib/utils";

interface OnlineIndicatorProps {
  isOnline: boolean;
  lastSeenAt?: string | null;
  showText?: boolean;
  className?: string;
  dotClassName?: string;
}

const STALE_THRESHOLD_MS = 90_000; // 90 seconds — if heartbeat missed, treat as offline

function formatLastSeen(lastSeenAt: string): string {
  const date = new Date(lastSeenAt);
  if (isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = diffMs / 3600000;

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 5) return `${Math.floor(diffHours)}h ago`;
  return date.toLocaleString('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function OnlineIndicator({
  isOnline,
  lastSeenAt,
  showText = false,
  className,
  dotClassName,
}: OnlineIndicatorProps) {
  const dot = dotClassName || "h-2.5 w-2.5";

  // Treat as offline if the last heartbeat is stale (tab killed without firing events)
  const effectivelyOnline = isOnline && (
    !lastSeenAt || (Date.now() - new Date(lastSeenAt).getTime()) < STALE_THRESHOLD_MS
  );

  if (effectivelyOnline) {
    return (
      <span className={cn("flex items-center gap-1.5", className)}>
        <span
          className={cn(
            "block rounded-full bg-purple-500 animate-pulse shadow-[0_0_6px_rgba(168,85,247,0.9)]",
            dot
          )}
        />
        {showText && (
          <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest">
            Online
          </span>
        )}
      </span>
    );
  }

  if (!lastSeenAt) return null;

  const text = formatLastSeen(lastSeenAt);
  if (!text) return null;

  return (
    <span className={cn("flex items-center gap-1.5", className)}>
      <span className={cn("block rounded-full bg-gray-400 dark:bg-gray-600", dot)} />
      {showText && (
        <span suppressHydrationWarning className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
          {text}
        </span>
      )}
    </span>
  );
}
