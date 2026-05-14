export function SkeletonCard() {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl shimmer" />
          <div>
            <div className="h-4 w-28 rounded shimmer" />
            <div className="mt-1.5 h-3 w-20 rounded shimmer" />
          </div>
        </div>
        <div className="h-5 w-16 rounded-full shimmer" />
      </div>
      <div className="space-y-2.5">
        <div className="h-4 rounded shimmer" />
        <div className="h-4 w-3/4 rounded shimmer" />
        <div className="h-4 w-1/2 rounded shimmer" />
      </div>
    </div>
  );
}
