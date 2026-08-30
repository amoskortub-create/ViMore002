export default function UserProfileLoading() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-white/10 dark:to-white/5" />
      <div className="px-4 -mt-10 space-y-4">
        <div className="flex items-end justify-between">
          <div className="h-20 w-20 rounded-[1.5rem] bg-gray-200 dark:bg-white/15 border-4 border-background" />
          <div className="h-9 w-24 rounded-full bg-gray-200 dark:bg-white/10 mb-1" />
        </div>
        <div className="space-y-2">
          <div className="h-5 w-40 rounded-full bg-gray-200 dark:bg-white/10" />
          <div className="h-3.5 w-24 rounded-full bg-gray-200 dark:bg-white/10" />
          <div className="h-3.5 w-52 rounded-full bg-gray-200 dark:bg-white/10 mt-2" />
        </div>
        <div className="flex gap-6 py-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-1">
              <div className="h-5 w-8 rounded-full bg-gray-200 dark:bg-white/10" />
              <div className="h-3 w-14 rounded-full bg-gray-200 dark:bg-white/10" />
            </div>
          ))}
        </div>
        <div className="h-11 rounded-2xl bg-gray-200 dark:bg-white/10" />
      </div>
      <div className="mt-4 px-4 grid grid-cols-3 gap-1">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-gray-200 dark:bg-white/10" />
        ))}
      </div>
    </div>
  );
}
