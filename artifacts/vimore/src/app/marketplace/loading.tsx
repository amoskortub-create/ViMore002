export default function MarketplaceLoading() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#08080A] animate-pulse">
      {/* Header */}
      <div className="sticky top-0 z-50 h-14 bg-white/80 dark:bg-[#0D0D12]/80 border-b border-black/5 dark:border-white/5 px-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-white/10" />
        <div className="flex-1 h-9 rounded-full bg-gray-200 dark:bg-white/10" />
        <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-white/10" />
      </div>

      <div className="px-4 pt-4 pb-24 space-y-4">
        {/* Categories */}
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-9 w-20 rounded-full shrink-0 bg-gray-200 dark:bg-white/10" />
          ))}
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-[1.5rem] overflow-hidden bg-white dark:bg-white/5 border border-black/5 dark:border-white/5 shadow-sm">
              <div className="aspect-square bg-gray-200 dark:bg-white/10" />
              <div className="p-3 space-y-2">
                <div className="h-3.5 w-3/4 rounded-full bg-gray-200 dark:bg-white/10" />
                <div className="h-4 w-1/3 rounded-full bg-gray-200 dark:bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
