export default function NotificationsLoading() {
  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-background">
      <div className="h-[61px] bg-white/80 dark:bg-card/80 border-b border-border/30 flex items-center px-4 gap-3">
        <div className="h-8 w-8 rounded-full bg-muted/50 animate-pulse" />
        <div className="h-4 w-40 bg-muted/50 rounded-full animate-pulse" />
        <div className="flex-1" />
        <div className="h-8 w-8 rounded-full bg-muted/40 animate-pulse" />
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-5 space-y-4">
        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-9 w-24 rounded-full bg-muted/40 animate-pulse shrink-0" style={{ animationDelay: `${i * 50}ms` }} />
          ))}
        </div>

        {/* Notification items */}
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white/70 dark:bg-card/60 rounded-2xl p-4 flex items-start gap-3 animate-pulse border border-border/20 shadow-sm" style={{ animationDelay: `${i * 70}ms` }}>
            {/* Icon circle */}
            <div className="h-10 w-10 rounded-2xl bg-muted/50 shrink-0" />
            {/* Avatar */}
            <div className="h-10 w-10 rounded-full bg-muted/50 shrink-0" />
            {/* Content */}
            <div className="flex-1 space-y-2">
              <div className="h-3 w-4/5 bg-muted/50 rounded-full" />
              <div className="h-2.5 w-3/5 bg-muted/30 rounded-full" />
              <div className="h-2 w-20 bg-muted/20 rounded-full" />
            </div>
            {/* Action button */}
            <div className="h-8 w-20 rounded-full bg-muted/40 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
