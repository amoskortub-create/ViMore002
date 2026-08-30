export default function MusicLoading() {
  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-background">
      {/* Header */}
      <div className="h-[61px] bg-white/80 dark:bg-card/80 border-b border-border/30 flex items-center px-4 gap-3">
        <div className="h-8 w-8 rounded-full bg-muted/50 animate-pulse" />
        <div className="h-4 w-28 bg-muted/50 rounded-full animate-pulse" />
        <div className="flex-1" />
        <div className="h-8 w-32 rounded-xl bg-muted/40 animate-pulse" />
      </div>

      {/* Sticky search bar */}
      <div className="sticky top-[61px] z-30 bg-[#F0F2F5]/90 dark:bg-background/90 border-b border-border/30 px-4 py-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-muted/40 animate-pulse shrink-0" />
        <div className="flex-1 h-9 rounded-xl bg-muted/40 animate-pulse" />
      </div>

      <div className="px-4 sm:px-6 py-5 space-y-8">
        {/* Hero banner */}
        <div className="w-full rounded-[1.75rem] bg-muted/40 animate-pulse" style={{ aspectRatio: "16/9", maxHeight: "320px" }} />

        {/* Pills */}
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-7 w-24 rounded-full bg-muted/40 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>

        {/* Song grid 1 */}
        <div className="space-y-3">
          <div className="h-5 w-40 bg-muted/40 rounded-full animate-pulse" />
          <div className="flex gap-4 overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="shrink-0 space-y-2 animate-pulse" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="h-40 w-36 rounded-2xl bg-muted/40" />
                <div className="h-3 w-28 bg-muted/40 rounded-full" />
                <div className="h-2.5 w-20 bg-muted/30 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Album grid */}
        <div className="space-y-3">
          <div className="h-5 w-52 bg-muted/40 rounded-full animate-pulse" />
          <div className="flex gap-4 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="shrink-0 space-y-2 animate-pulse" style={{ animationDelay: `${i * 70}ms` }}>
                <div className="h-44 w-40 rounded-2xl bg-muted/40" />
                <div className="h-3 w-32 bg-muted/40 rounded-full" />
                <div className="h-2.5 w-24 bg-muted/30 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Artist row */}
        <div className="space-y-3">
          <div className="h-5 w-44 bg-muted/40 rounded-full animate-pulse" />
          <div className="flex gap-5 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="shrink-0 flex flex-col items-center gap-2 animate-pulse" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="h-16 w-16 rounded-full bg-muted/40" />
                <div className="h-2.5 w-14 bg-muted/30 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom nav skeleton */}
      <div className="fixed bottom-0 left-0 right-0 pb-5 flex justify-center">
        <div className="flex items-center gap-1 bg-white/80 dark:bg-zinc-900/90 rounded-[2rem] px-3 py-2 shadow-xl animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1 px-4 py-2">
              <div className="h-5 w-5 rounded-lg bg-muted/40" />
              <div className="h-2 w-10 rounded-full bg-muted/30" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
