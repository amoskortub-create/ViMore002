export default function PostLoading() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      {/* Header */}
      <div className="sticky top-0 z-50 h-14 bg-background/80 border-b border-border/50 px-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-white/10" />
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-white/10" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-24 rounded-full bg-gray-200 dark:bg-white/10" />
            <div className="h-2.5 w-16 rounded-full bg-gray-200 dark:bg-white/10" />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        {/* Post card */}
        <div className="mx-4 mt-4 space-y-3">
          {/* Media placeholder */}
          <div className="aspect-square rounded-[2rem] bg-gray-200 dark:bg-white/10" />

          {/* Reactions */}
          <div className="flex items-center gap-4 px-1">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 w-14 rounded-full bg-gray-200 dark:bg-white/10" />
            ))}
          </div>

          {/* Content */}
          <div className="space-y-2 px-1">
            <div className="h-4 w-full rounded-full bg-gray-200 dark:bg-white/10" />
            <div className="h-4 w-5/6 rounded-full bg-gray-200 dark:bg-white/10" />
          </div>
        </div>

        {/* Comments */}
        <div className="mt-6 px-4 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-white/10 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-24 rounded-full bg-gray-200 dark:bg-white/10" />
                <div className="h-3 w-48 rounded-full bg-gray-200 dark:bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
