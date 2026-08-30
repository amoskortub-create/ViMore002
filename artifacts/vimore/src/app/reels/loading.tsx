export default function ReelsLoading() {
  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Full-screen video placeholder */}
      <div className="flex-1 relative animate-pulse bg-zinc-900">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />

        {/* Top overlay */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12">
          <div className="h-8 w-8 rounded-full bg-white/10" />
          <div className="flex gap-2">
            <div className="h-8 w-8 rounded-full bg-white/10" />
            <div className="h-8 w-8 rounded-full bg-white/10" />
          </div>
        </div>

        {/* Right action buttons */}
        <div className="absolute right-3 bottom-24 flex flex-col gap-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="h-11 w-11 rounded-full bg-white/10" />
              <div className="h-2 w-8 bg-white/10 rounded-full" />
            </div>
          ))}
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-5 left-4 right-16 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-white/10" />
            <div className="h-3 w-28 bg-white/10 rounded-full" />
          </div>
          <div className="h-2.5 w-4/5 bg-white/10 rounded-full" />
          <div className="h-2.5 w-3/5 bg-white/10 rounded-full" />
          <div className="flex items-center gap-2 mt-1">
            <div className="h-5 w-5 rounded-full bg-white/10" />
            <div className="h-2 w-32 bg-white/10 rounded-full" />
          </div>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
          <div className="h-full w-1/3 bg-white/40 rounded-full" />
        </div>
      </div>
    </div>
  );
}
