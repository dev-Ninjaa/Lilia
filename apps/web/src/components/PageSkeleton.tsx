export const PageSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-4" aria-busy="true" aria-live="polite">
    <div className="h-8 w-56 rounded-lg bg-white/[0.06]" />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-28 rounded-2xl bg-white/[0.05]" />
      ))}
    </div>
    <div className="h-64 rounded-2xl bg-white/[0.04]" />
    <span className="sr-only">Loading live data from the Lilia API…</span>
  </div>
);
