"use client";

import { useState } from "react";
import { CircleHelp, Check } from "lucide-react";
import { Sheet } from "@/components/habits/sheet";
import { WORLD_POOL, WORLD_POPULATION, formatRank, formatTopPercent, type StandingInput } from "@/lib/world-rank";
import { cn } from "@/lib/utils";

type Part = { key: string; label: string; max: number; points: number; hint: string };
type Rung = { name: string; top: number; rank: number; days: number | null };

/** "How is this calculated?": the pool, the four parts of the score, and the tier ladder. */
export function WorldRankGuide({
  parts,
  ladder,
  tier,
  className,
}: {
  /** The score breakdown for the habit being shown, so the guide uses your own numbers. */
  parts: Part[];
  ladder: Rung[];
  /** The tier you are in now, highlighted in the ladder. */
  tier?: string;
  input?: StandingInput;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const total = parts.reduce((n, p) => n + p.points, 0);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-white/30", className)}
      >
        <CircleHelp className="h-3.5 w-3.5" />
        How is this calculated?
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="How your world standing works" className="sm:max-w-lg">
        <div className="flex flex-col gap-5 pb-2 pt-1">
          <section className="rounded-2xl bg-h-brand-soft p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-h-brand">The idea</p>
            <p className="mt-1 text-sm leading-relaxed">
              Out of about {(WORLD_POPULATION / 1e9).toFixed(1)} billion people, roughly {(WORLD_POOL / 1e9).toFixed(0)} billion could be building habits. Almost everyone starts and almost everyone fades, so
              staying consistent is rare. Each of your habits earns a <b>score out of 1000</b>, and the score is turned into a &ldquo;Top X%&rdquo; of those {(WORLD_POOL / 1e9).toFixed(0)} billion.
            </p>
            <p className="mt-2 text-[11px] leading-snug text-h-muted">
              It is an estimate from habit-formation research, not a live leaderboard: no one has data on the whole world. Treat it as a fun, honest yardstick of how consistent you are.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-extrabold">Your score, part by part</h3>
              <span className="text-xs font-extrabold tabular-nums text-h-brand">{Math.round(total)} / 1000</span>
            </div>
            {parts.map((p) => (
              <div key={p.key}>
                <div className="flex items-baseline justify-between text-xs font-bold">
                  <span>{p.label}</span>
                  <span className="tabular-nums text-h-muted">
                    {Math.round(p.points)} / {p.max}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-h-surface2">
                  <div className="h-full rounded-full bg-h-brand" style={{ width: `${Math.min(100, (p.points / p.max) * 100)}%` }} />
                </div>
                <p className="mt-1 text-[11px] leading-snug text-h-muted">{p.hint}</p>
              </div>
            ))}
          </section>

          <section>
            <h3 className="text-sm font-extrabold">The ladder</h3>
            <p className="mb-2 text-[11px] text-h-muted">Days shown assume one habit done every single day, with no misses.</p>
            <ul className="flex flex-col divide-y divide-h-border overflow-hidden rounded-2xl border border-h-border">
              {ladder.map((r) => {
                const here = r.name === tier;
                return (
                  <li key={r.name} className={cn("flex items-center gap-3 px-3 py-2.5", here && "bg-h-brand-soft")}>
                    <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold", here ? "bg-h-brand text-h-brand-fg" : "bg-h-surface2 text-h-muted")}>
                      {here ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : ladder.indexOf(r) + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-extrabold leading-tight">{r.name}</p>
                      <p className="text-[11px] text-h-muted">
                        {r.top >= 100 ? "Where everyone starts: Top 100%" : `Top ${formatTopPercent(r.top)} · about ${formatRank(r.rank)}`}
                      </p>
                    </div>
                    <span className="shrink-0 text-right text-[11px] font-bold tabular-nums text-h-muted">
                      {r.top >= 100 ? "Start" : r.days === null ? "years" : r.days >= 365 ? `~${(r.days / 365).toFixed(1)} yrs` : `~${r.days} days`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </Sheet>
    </>
  );
}
