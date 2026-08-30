export default function HowItWorksLoading() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#080808] animate-pulse">
      {/* Header */}
      <div className="sticky top-0 z-50 h-14 bg-white/80 dark:bg-black/80 border-b border-black/5 dark:border-white/5 px-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-white/10" />
        <div className="h-4 w-28 rounded-full bg-gray-200 dark:bg-white/10" />
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-20 space-y-6 pt-6">
        {/* Hero */}
        <div className="h-32 rounded-[2rem] bg-gradient-to-br from-gray-200 to-gray-300 dark:from-white/10 dark:to-white/5" />

        {/* Currency cards */}
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map(i => (
            <div key={i} className="h-24 rounded-2xl bg-gray-200 dark:bg-white/10" />
          ))}
        </div>

        {/* Feature cards */}
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-36 rounded-[1.5rem] bg-gray-200 dark:bg-white/10" />
        ))}
      </div>
    </div>
  );
}
