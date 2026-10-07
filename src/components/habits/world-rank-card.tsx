import { Globe2, TrendingUp } from "lucide-react";
import { WorldRankGuide } from "@/components/habits/world-rank-guide";
import { TIERS, WORLD_POOL, formatRank, formatTopPercent, scoreBreakdown, tierLadder, type Standing, type StandingInput } from "@/lib/world-rank";
import { cn } from "@/lib/utils";

/**
 * Where a habit's consistency would put you among the roughly 4 billion people who could be building
 * habits. Modelled, not measured, and it says so on the card (see lib/world-rank.ts).
 */
export function WorldRankCard({ standing, input, title = "World standing" }: { standing: Standing; input: StandingInput; title?: string }) {
  const billions = (WORLD_POOL / 1_000_000_000).toFixed(1);
  return (
    <section className="rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-4 text-white shadow-sm">
      {standing.ranked ? (
        <>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <Globe2 className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">{title}</p>
              <p className="flex flex-wrap items-baseline gap-x-2 leading-tight">
                <span className="text-3xl font-extrabold tabular-nums">Top {formatTopPercent(standing.topPercent)}</span>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-extrabold">{standing.tier}</span>
              </p>
              <p className="text-[11px] font-medium text-white/85">
                about {formatRank(standing.rank)} of {billions} billion people building habits
              </p>
            </div>
          </div>
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white" style={{ width: `${Math.max(3, Math.min(100, standing.score / 10))}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] font-bold text-white/75">
              {TIERS.slice(1).map((t) => (
                <span key={t.name} className={cn(t.name === standing.tier && "text-white")}>
                  {t.name}
                </span>
              ))}
            </div>
          </div>
          {standing.next && (
            <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-black/15 px-3 py-2 text-xs font-semibold leading-snug">
              <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {standing.next.hint}
            </p>
          )}
        </>
      ) : (
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <Globe2 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-extrabold">{title}</p>
            <p className="text-[11px] text-white/85">Everyone starts at the top 100% of about {billions} billion people. Keep showing up and the number falls.</p>
          </div>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-[10px] leading-snug text-white/70">An estimate from habit research, not a live leaderboard.</p>
        <WorldRankGuide parts={scoreBreakdown(input)} ladder={tierLadder()} tier={standing.ranked ? standing.tier : undefined} />
      </div>
    </section>
  );
}
