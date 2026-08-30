"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { RefreshCw } from "lucide-react";

const PULL_THRESHOLD = 72;
const MAX_PULL = 110;
const RESISTANCE = 0.45;

const DISABLED_PATHS = ["/intelligent"];

export function PullToRefresh() {
  const pathname = usePathname();
  const [pullDistance, setPullDistance] = useState(0);
  const [phase, setPhase] = useState<"idle" | "pulling" | "ready" | "refreshing">("idle");

  const startY = useRef(0);
  const isDragging = useRef(false);
  const frameRef = useRef<number | null>(null);

  const isDisabled = DISABLED_PATHS.some((p) => pathname?.startsWith(p));

  const getScrollTop = useCallback(() => {
    // Check the document scroll first
    const docScroll = document.documentElement.scrollTop || document.body.scrollTop || window.scrollY;
    if (docScroll > 2) return docScroll;

    // Also check any overflowing scroll containers at the touch point
    const scrollContainers = document.querySelectorAll<HTMLElement>(
      '[data-ptr-scroll], .overflow-y-auto, .overflow-y-scroll, [style*="overflow-y: auto"], [style*="overflow-y: scroll"]'
    );
    for (const el of scrollContainers) {
      if (el.scrollTop > 2) return el.scrollTop;
    }
    return 0;
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (isDisabled) return;
    if (getScrollTop() > 2) return;
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, [isDisabled, getScrollTop]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current || isDisabled) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0) {
      if (pullDistance > 0) setPullDistance(0);
      return;
    }

    const dampened = Math.min(dy * RESISTANCE, MAX_PULL);

    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      setPullDistance(dampened);
      setPhase(dampened >= PULL_THRESHOLD ? "ready" : "pulling");
    });

    if (dy > 8) {
      e.preventDefault();
    }
  }, [pullDistance, isDisabled]);

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (pullDistance >= PULL_THRESHOLD && !isDisabled) {
      setPhase("refreshing");
      setPullDistance(PULL_THRESHOLD * 0.75);
      await new Promise<void>((res) => setTimeout(res, 400));
      window.location.reload();
      return;
    }

    setPullDistance(0);
    setPhase("idle");
  }, [pullDistance, isDisabled]);

  useEffect(() => {
    if (isDisabled) return;
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, isDisabled]);

  if (isDisabled || (phase === "idle" && pullDistance === 0)) return null;

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const rotation = progress * 240;
  const isRefreshing = phase === "refreshing";

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] flex justify-center pointer-events-none"
      style={{
        transform: `translateY(${pullDistance - 48}px)`,
        transition: isRefreshing ? "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)" : "none",
      }}
    >
      <div
        className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-zinc-900 shadow-lg border border-black/5 dark:border-white/10"
        style={{
          opacity: Math.min(progress * 1.5, 1),
          transform: `scale(${0.7 + progress * 0.3})`,
          transition: isRefreshing ? "all 0.3s ease" : "none",
        }}
      >
        <RefreshCw
          className="text-primary"
          style={{
            width: 18,
            height: 18,
            transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
            animation: isRefreshing ? "spin 0.7s linear infinite" : "none",
          }}
          strokeWidth={2.5}
        />
      </div>
    </div>
  );
}
