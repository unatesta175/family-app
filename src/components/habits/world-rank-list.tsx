import Link from "next/link";
import { HabitIcon } from "@/components/habits/habit-icon";
import { WorldRankGuide } from "@/components/habits/world-rank-guide";
import { colorHex, tint } from "@/lib/habits";
import { WORLD_POOL, formatRank, formatTopPercent, scoreBreakdown, tierLadder, type Standing, type StandingInput } from "@/lib/world-rank";

export type RankRow = { id: number; name: string; icon: string; color: string; kind: "build" | "break"; standing: Standing; input: StandingInput };

/** Every habit's own world standing, best first. */
export function WorldRankList({ rows }: { rows: RankRow[] }) {
  const sorted = [...rows].sort((a, b) => a.standing.topPercent - b.standing.topPercent || a.name.localeCompare(b.name));
  const ladder = tierLadder();
  const best = sorted.find((r) => r.standing.ranked);
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-h-muted">World standing by habit</h3>
        {best && <WorldRankGuide parts={scoreBreakdown(best.input)} ladder={ladder} tier={best.standing.tier} className="!bg-h-brand-soft !text-h-brand hover:!bg-h-brand-soft/70" />}
      </div>
      <p className="px-1 text-[11px] text-h-muted">
        How each habit ranks among about {(WORLD_POOL / 1e9).toFixed(1)} billion people. An estimate, not a live leaderboard.
      </p>
      <ul className="flex flex-col gap-2">
        {sorted.map((r) => {
          const hex = colorHex(r.color);
          return (
            <li key={r.id}>
              <Link href={`/habits/${r.id}`} className="h-card flex items-center gap-3 p-3 transition-shadow hover:shadow-md">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: tint(hex, 0.15), color: hex }}>
                  <HabitIcon name={r.icon} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold leading-tight">{r.name}</p>
                  {r.standing.ranked ? (
                    <>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-h-surface2">
                        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500" style={{ width: `${Math.max(3, Math.min(100, r.standing.score / 10))}%` }} />
                      </div>
                      <p className="mt-1 text-[11px] text-h-muted">about {formatRank(r.standing.rank)} of {(WORLD_POOL / 1e9).toFixed(1)} billion</p>
                    </>
                  ) : (
                    <p className="mt-0.5 text-[11px] text-h-muted">Top 100%: where everyone starts</p>
                  )}
                </div>
                {r.standing.ranked && (
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-extrabold leading-none tabular-nums">Top {formatTopPercent(r.standing.topPercent)}</p>
                    <p className="mt-1 inline-block rounded-full bg-h-brand-soft px-2 py-0.5 text-[10px] font-extrabold text-h-brand">{r.standing.tier}</p>
                  </div>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
