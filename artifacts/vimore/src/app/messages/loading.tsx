export default function MessagesLoading() {
  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-background flex flex-col">
      <div className="h-[61px] bg-white/80 dark:bg-card/80 border-b border-border/30 flex items-center px-4 gap-3 shrink-0">
        <div className="h-4 w-28 bg-muted/50 rounded-full animate-pulse" />
        <div className="flex-1" />
        <div className="h-8 w-8 rounded-full bg-muted/40 animate-pulse" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat list */}
        <div className="w-full sm:w-80 lg:w-96 border-r border-border/30 bg-white/60 dark:bg-card/40 flex flex-col">
          {/* Search bar */}
          <div className="p-3 border-b border-border/20">
            <div className="h-9 rounded-xl bg-muted/40 animate-pulse" />
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-hidden divide-y divide-border/20">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="relative shrink-0">
                  <div className="h-12 w-12 rounded-full bg-muted/50" />
                  <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-muted/40 ring-2 ring-white dark:ring-card" />
                </div>
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex justify-between items-center">
                    <div className="h-3 w-28 bg-muted/50 rounded-full" />
                    <div className="h-2 w-12 bg-muted/30 rounded-full" />
                  </div>
                  <div className="h-2.5 w-full bg-muted/30 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat window placeholder (desktop) */}
        <div className="hidden sm:flex flex-1 flex-col items-center justify-center gap-4 bg-[#F0F2F5] dark:bg-background/50">
          <div className="h-20 w-20 rounded-3xl bg-muted/30 animate-pulse" />
          <div className="space-y-2 text-center">
            <div className="h-4 w-40 bg-muted/30 rounded-full animate-pulse mx-auto" />
            <div className="h-3 w-56 bg-muted/20 rounded-full animate-pulse mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
