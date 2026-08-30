export default function PrivacyLoading() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      {/* Header */}
      <div className="sticky top-0 z-50 h-14 bg-background/80 border-b border-border/50 px-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-white/10" />
        <div className="h-4 w-32 rounded-full bg-gray-200 dark:bg-white/10" />
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-20 space-y-6 pt-6">
        {/* Hero */}
        <div className="h-28 rounded-[2rem] bg-gray-200 dark:bg-white/10" />

        {/* Sections */}
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="space-y-3">
            <div className="h-5 w-40 rounded-full bg-gray-200 dark:bg-white/10" />
            <div className="h-3.5 w-full rounded-full bg-gray-200 dark:bg-white/10" />
            <div className="h-3.5 w-5/6 rounded-full bg-gray-200 dark:bg-white/10" />
            <div className="h-3.5 w-4/5 rounded-full bg-gray-200 dark:bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
