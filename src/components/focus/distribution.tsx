import { formatFocus } from "@/lib/focus";

export type DistBar = { label: string; seconds: number; title: string; showLabel?: boolean };

/** Rounds a maximum up to a tidy axis ceiling and works out four even gridlines. */
function axis(maxMinutes: number): { max: number; step: number; unit: "m" | "h" } {
  if (maxMinutes <= 0) return { max: 60, step: 15, unit: "m" };
  if (maxMinutes >= 180) {
    const hours = Math.ceil(maxMinutes / 60);
    const step = Math.max(1, Math.ceil(hours / 4));
    return { max: step * 4 * 60, step: step * 60, unit: "h" };
  }
  const step = [5, 10, 15, 20, 30, 45].find((s) => s * 4 >= maxMinutes) ?? 60;
  return { max: step * 4, step, unit: "m" };
}

/**
 * "Focused time distribution": light green bars on faint gridlines with an axis in minutes (or hours
 * for long stretches), and the total above. Pure markup, drawn on the server.
 */
export function Distribution({ title, bars }: { title: string; bars: DistBar[] }) {
  const total = bars.reduce((n, b) => n + b.seconds, 0);
  const maxMin = Math.max(0, ...bars.map((b) => b.seconds / 60));
  const ax = axis(maxMin);
  const lines = [4, 3, 2, 1, 0].map((k) => (k * ax.step) / (ax.unit === "h" ? 60 : 1));

  return (
    <section className="rounded-3xl border border-h-border bg-h-surface p-5 shadow-sm">
      <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
      <p className="mt-0.5 text-sm text-h-muted">
        Total focused time: <b className="text-h-brand">{formatFocus(total)}</b>
      </p>
      <div className="mt-4 flex gap-2">
        <div className="flex h-44 flex-col justify-between text-right text-[10px] font-semibold tabular-nums text-h-muted">
          {lines.map((l) => (
            <span key={l}>{l === 0 ? (ax.unit === "h" ? "0 h" : "0 m") : l}</span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="absolute inset-0 flex h-44 flex-col justify-between" aria-hidden>
            {lines.map((l) => (
              <span key={l} className="h-px w-full bg-h-border/70" />
            ))}
          </div>
          <div className="relative flex h-44 items-end gap-[3px]">
            {bars.map((b, i) => (
              <div key={i} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${b.title}: ${formatFocus(b.seconds)}`}>
                {b.seconds > 0 ? (
                  <div className="w-full rounded-t-md bg-gradient-to-t from-h-brand to-[#7fe0ae]" style={{ height: `${Math.max(3, Math.min(100, (b.seconds / 60 / ax.max) * 100))}%` }} />
                ) : (
                  <div className="h-[3px] w-full rounded-full bg-h-brand/35" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-[3px] text-[10px] font-semibold text-h-muted">
            {bars.map((b, i) => (
              <span key={i} className="min-w-0 flex-1 truncate text-center">
                {b.showLabel === false ? "" : b.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
