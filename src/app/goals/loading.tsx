/** Instant skeleton while a goals page streams in. */
export default function GoalsLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-4 md:mx-auto md:max-w-3xl" aria-busy>
      <div className="flex flex-col gap-2">
        <div className="h-3 w-24 rounded-full bg-h-surface2" />
        <div className="h-7 w-48 rounded-lg bg-h-surface2" />
      </div>
      <div className="h-card h-24" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-card h-36" />
        ))}
      </div>
    </div>
  );
}
