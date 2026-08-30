export default function CurrencyLoading() {
  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-[#060608] animate-pulse">
      {/* Header */}
      <div className="sticky top-0 z-50 h-16 bg-white/80 dark:bg-[#0D0D12]/80 border-b border-black/5 dark:border-white/5 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-white/10" />
          <div className="space-y-1.5">
            <div className="h-4 w-28 rounded-full bg-gray-200 dark:bg-white/10" />
            <div className="h-2.5 w-20 rounded-full bg-gray-200 dark:bg-white/10" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-24 rounded-2xl bg-gray-200 dark:bg-white/10" />
          <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-white/10" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-32 space-y-6 pt-6">
        {/* Wallet Hero */}
        <div className="h-40 rounded-[2rem] bg-gradient-to-br from-gray-200 to-gray-300 dark:from-white/10 dark:to-white/5" />

        {/* Tab Bar */}
        <div className="h-14 rounded-2xl bg-gray-200 dark:bg-white/10" />

        {/* Packages grid */}
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-44 rounded-[1.75rem] bg-gray-200 dark:bg-white/10" />
          ))}
        </div>
      </div>
    </div>
  );
}
