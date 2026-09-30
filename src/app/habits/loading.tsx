/** Instant skeleton while a habits page streams in — keeps navigation feeling native. */
export default function HabitsLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-4 lg:mx-auto lg:max-w-3xl" aria-busy>
      <div className="flex flex-col gap-2">
        <div className="h-3 w-32 rounded-full bg-h-surface2" />
        <div className="h-7 w-56 rounded-lg bg-h-surface2" />
      </div>
      <div className="h-card h-28" />
      <div className="h-card h-24" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-card h-[72px]" />
        ))}
      </div>
    </div>
  );
}
