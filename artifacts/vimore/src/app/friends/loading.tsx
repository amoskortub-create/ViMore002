export default function FriendsLoading() {
  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-background">
      <div className="h-[61px] bg-white/80 dark:bg-card/80 border-b border-border/30 flex items-center px-4 gap-3">
        <div className="h-8 w-8 rounded-full bg-muted/50 animate-pulse" />
        <div className="h-4 w-36 bg-muted/50 rounded-full animate-pulse" />
        <div className="flex-1" />
        <div className="h-8 w-24 rounded-full bg-muted/40 animate-pulse" />
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Tab pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-9 w-28 rounded-full bg-muted/40 animate-pulse shrink-0" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>

        {/* Search bar */}
        <div className="h-10 rounded-xl bg-white/70 dark:bg-card/60 border border-border/20 animate-pulse" />

        {/* Friend cards grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white/70 dark:bg-card/60 rounded-2xl p-4 space-y-3 animate-pulse border border-border/20 shadow-sm" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex flex-col items-center gap-2">
                <div className="h-16 w-16 rounded-full bg-muted/50" />
                <div className="h-3 w-24 bg-muted/50 rounded-full" />
                <div className="h-2.5 w-16 bg-muted/30 rounded-full" />
              </div>
              <div className="h-8 w-full rounded-full bg-muted/40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
