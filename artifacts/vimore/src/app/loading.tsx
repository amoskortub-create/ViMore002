export default function RootLoading() {
  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-background">
      <div className="h-[61px] bg-white/80 dark:bg-card/80 border-b border-border/30 flex items-center px-4 gap-3">
        <div className="h-8 w-8 rounded-full bg-muted/50 animate-pulse" />
        <div className="h-4 w-28 bg-muted/50 rounded-full animate-pulse" />
        <div className="flex-1" />
        <div className="h-8 w-8 rounded-full bg-muted/50 animate-pulse" />
        <div className="h-8 w-8 rounded-full bg-muted/50 animate-pulse" />
      </div>
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block border-r border-border/30 pt-6 px-4 space-y-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-muted/30 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </aside>
        <main className="px-4 sm:px-6 py-4 space-y-4">
          <div className="flex gap-3 pt-2 overflow-hidden">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 animate-pulse" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="h-14 w-14 rounded-full bg-muted/50" />
                <div className="h-2 w-10 bg-muted/40 rounded-full" />
              </div>
            ))}
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white/70 dark:bg-card/60 rounded-2xl p-4 space-y-3 animate-pulse border border-border/20 shadow-sm" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted/50" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 w-32 bg-muted/50 rounded-full" />
                  <div className="h-2.5 w-20 bg-muted/30 rounded-full" />
                </div>
                <div className="h-7 w-7 rounded-full bg-muted/30" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-muted/40 rounded-full" />
                <div className="h-3 w-4/5 bg-muted/30 rounded-full" />
                <div className="h-3 w-3/5 bg-muted/20 rounded-full" />
              </div>
              <div className="h-52 rounded-xl bg-muted/40" />
              <div className="flex gap-4 pt-1">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-8 w-16 rounded-full bg-muted/30" />
                ))}
              </div>
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}
