"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { Clock, Layers, Pencil, Plus, Settings2, Sparkles, Users } from "lucide-react";
import { applyPresetAction, createStarterAction, setDayRoutineAction } from "@/lib/time-actions";
import {
  CATEGORY_BY_KEY,
  DAY_PRESETS,
  WEEKDAY_NAMES,
  WEEKDAY_SHORT,
  WEEK_ORDER,
  blockMinutes,
  dialSegments,
  formatDuration,
  summarizeDay,
  summarizeWeek,
  toClock12,
  unplannedGaps,
  yearsLeft,
  type Block,
  type DaySummary,
  type TimeCategory,
} from "@/lib/time-planner";
import type { PlannerData } from "@/lib/time-data";
import { AnalogClock } from "@/components/goals/analog-clock";
import { RoutineManager } from "@/components/goals/routine-manager";
import { TimeBlockSheet } from "@/components/goals/time-block-sheet";
import { TimeSettings, TimeTotals } from "@/components/goals/time-totals";
import { HabitIcon } from "@/components/habits/habit-icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/habits/ui/select";
import { cn } from "@/lib/utils";

/** Minutes since midnight right now. Null on the server so the first paint matches. */
function useNowMinutes(): number | null {
  return useSyncExternalStore(
    (notify) => {
      const id = window.setInterval(notify, 30_000);
      return () => window.clearInterval(id);
    },
    () => {
      const d = new Date();
      return d.getHours() * 60 + d.getMinutes();
    },
    () => null
  );
}

type SheetState = { block: Block | null; initial?: { category?: TimeCategory; start?: number; end?: number } } | null;

/** The Time page: a 24-hour clock of your day, free time, and totals at every scale. */
export function TimePlanner({ data }: { data: PlannerData }) {
  const { routines, dayMap, today } = data;
  const todayWeekday = new Date(`${today}T12:00:00`).getDay();
  const now = useNowMinutes();
  const [selDay, setSelDay] = useState<number>(todayWeekday);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [managing, setManaging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const routineById = useMemo(() => new Map(routines.map((r) => [r.id, r])), [routines]);
  const summaries = useMemo(
    () => Array.from({ length: 7 }, (_, w): DaySummary | null => (dayMap[w] !== null && routineById.get(dayMap[w]!) ? summarizeDay(routineById.get(dayMap[w]!)!.blocks) : null)),
    [dayMap, routineById]
  );
  const week = useMemo(() => summarizeWeek(summaries), [summaries]);

  const routine = dayMap[selDay] !== null ? (routineById.get(dayMap[selDay]!) ?? null) : null;
  const blocks = useMemo(() => (routine ? [...routine.blocks].sort((a, b) => a.start - b.start) : []), [routine]);
  const summary = summaries[selDay];
  const gaps = useMemo(() => unplannedGaps(blocks), [blocks]);
  const sharedWith = WEEK_ORDER.filter((w) => w !== selDay && routine && dayMap[w] === routine.id);
  const left = yearsLeft(data.birthDate, data.lifespanYears, today);
  const free = summary ? summary.free : 1440;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something went wrong.");
    });
  }

  // ---- First visit -----------------------------------------------------------------------
  if (routines.length === 0) {
    return (
      <div className="flex flex-col gap-5 md:mx-auto md:max-w-2xl">
        <Header onManage={null} />
        <div className="h-card flex flex-col items-center gap-4 p-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-h-brand-soft text-h-brand">
            <Clock className="h-8 w-8" />
          </span>
          <div>
            <p className="text-lg font-extrabold">Where does your day go?</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-h-muted">
              Put your usual day on a 24-hour clock: sleep, prayer, meals, bathing, chores, work and more. You will see exactly when you are free and how many hours that is, plus what each activity adds up to over a week, a year and a lifetime.
            </p>
          </div>
          <div className="flex w-full max-w-sm flex-col gap-2">
            <button type="button" disabled={pending} onClick={() => run(createStarterAction)} className="flex items-center justify-center gap-2 rounded-xl bg-h-brand py-3 text-sm font-extrabold text-h-brand-fg disabled:opacity-60">
              <Sparkles className="h-4 w-4" />
              Start with a sample week
            </button>
            <p className="text-[11px] text-h-muted">Weekday, Friday and Weekend routines filled with a typical day. Edit everything to match yours.</p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {DAY_PRESETS.map((p) => (
                <button key={p.key} type="button" disabled={pending} onClick={() => run(() => applyPresetAction(p.key))} className="rounded-xl border border-h-border bg-h-surface px-3 py-2 text-xs font-bold hover:bg-h-surface2 disabled:opacity-60">
                  Empty: {p.label}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-xs font-semibold text-h-bad">{error}</p>}
        </div>
      </div>
    );
  }

  const freeLabel = formatDuration(free);

  return (
    <div className="flex flex-col gap-5 md:mx-auto md:max-w-5xl">
      <Header onManage={() => setManaging(true)} />

      {/* Day picker */}
      <div className="grid grid-cols-7 gap-1.5" role="tablist" aria-label="Day of the week">
        {WEEK_ORDER.map((w) => {
          const active = selDay === w;
          const r = dayMap[w] !== null ? routineById.get(dayMap[w]!) : null;
          const s = summaries[w];
          return (
            <button
              key={w}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelDay(w)}
              title={WEEKDAY_NAMES[w]}
              className={cn(
                "relative flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2 text-center transition-colors",
                active ? "border-h-brand bg-h-brand-soft" : "border-h-border bg-h-surface hover:bg-h-surface2"
              )}
            >
              <span className={cn("text-[11px] font-extrabold uppercase", active ? "text-h-brand" : "text-h-muted")}>{WEEKDAY_SHORT[w]}</span>
              <span className="line-clamp-1 w-full break-all text-[10px] font-semibold leading-tight">{r ? r.name : "None"}</span>
              <span className="text-[10px] font-bold tabular-nums text-h-muted">{s ? `${Math.round((s.free / 60) * 10) / 10}h free` : "–"}</span>
              {w === todayWeekday && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-h-brand" aria-label="Today" />}
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* The clock */}
        <section className="h-card flex flex-col gap-4 p-4" aria-label="Daily clock">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-extrabold tracking-tight">{WEEKDAY_NAMES[selDay]}</h2>
            {selDay === todayWeekday && now !== null && <span className="rounded-full bg-h-brand-soft px-2.5 py-1 text-[11px] font-bold text-h-brand">Now {toClock12(now)}</span>}
          </div>

          <AnalogClock segments={dialSegments(blocks)} nowMinutes={selDay === todayWeekday ? now : null} selectedId={sheet?.block?.id ?? null} onSelect={(id) => { const b = blocks.find((x) => x.id === id); if (b) setSheet({ block: b }); }}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-h-muted">Free</span>
            <span className="text-3xl font-extrabold leading-none tabular-nums">{freeLabel}</span>
            <span className="mt-1 text-[10px] font-semibold text-h-muted">of 24h</span>
          </AnalogClock>

          <Legend blocks={blocks} />
        </section>

        <div className="flex flex-col gap-5">
          {/* Which routine this day follows */}
          <section className="h-card flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold tracking-tight">{WEEKDAY_NAMES[selDay]} follows</h2>
              <button type="button" onClick={() => setManaging(true)} className="flex items-center gap-1 text-[11px] font-bold text-h-brand">
                <Layers className="h-3.5 w-3.5" />
                Manage routines
              </button>
            </div>
            <Select value={dayMap[selDay] === null ? "none" : String(dayMap[selDay])} onValueChange={(v) => run(() => setDayRoutineAction({ weekday: selDay, routineId: v === "none" ? null : Number(v) }))}>
              <SelectTrigger aria-label={`Routine for ${WEEKDAY_NAMES[selDay]}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No routine</SelectItem>
                {routines.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {sharedWith.length > 0 && (
              <p className="flex items-start gap-1.5 text-[11px] leading-snug text-h-muted">
                <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Also used on {sharedWith.map((w) => WEEKDAY_SHORT[w]).join(", ")}. Changing its activities changes those days too.
              </p>
            )}
            {error && <p className="text-xs font-semibold text-h-bad">{error}</p>}
          </section>

          {/* Activities */}
          <section className="h-card flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold tracking-tight">
                Activities <span className="ml-1 rounded-full bg-h-surface2 px-2 py-0.5 text-[10px]">{blocks.length}</span>
              </h2>
              {routine && (
                <button type="button" onClick={() => setSheet({ block: null, initial: gaps[0] ? { start: gaps[0].start, end: Math.min(gaps[0].end, gaps[0].start + 60) } : undefined })} className="flex items-center gap-1 rounded-xl bg-h-brand px-3 py-1.5 text-xs font-extrabold text-h-brand-fg">
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Add
                </button>
              )}
            </div>

            {!routine ? (
              <p className="py-4 text-center text-sm text-h-muted">Choose a routine for this day, or create one in Manage routines.</p>
            ) : blocks.length === 0 ? (
              <p className="py-4 text-center text-sm text-h-muted">Nothing here yet. Add what you do, from sleep to prayer to work.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-h-border">
                {blocks.map((b) => {
                  const meta = CATEGORY_BY_KEY[b.category];
                  return (
                    <li key={b.id}>
                      <button type="button" onClick={() => setSheet({ block: b })} className="group flex w-full items-center gap-3 py-2.5 text-left">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `${meta.color}26`, color: meta.color }}>
                          <HabitIcon name={meta.icon} className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold leading-tight">{b.label || meta.label}</span>
                          <span className="block text-[11px] font-medium text-h-muted">
                            {toClock12(b.start)} – {toClock12(b.end % 1440)}
                            {b.label && ` · ${meta.label}`}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs font-extrabold tabular-nums text-h-muted">{formatDuration(blockMinutes(b))}</span>
                        <Pencil className="h-3.5 w-3.5 shrink-0 text-h-muted opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Free time */}
          {routine && summary && (
            <section className="h-card flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-extrabold tracking-tight">Free time</h2>
                <button type="button" onClick={() => setSheet({ block: null, initial: { category: "free", start: gaps[0]?.start, end: gaps[0] ? Math.min(gaps[0].end, gaps[0].start + 60) : undefined } })} className="flex items-center gap-1 text-[11px] font-bold text-h-brand">
                  <Plus className="h-3.5 w-3.5" />
                  Add free-time activity
                </button>
              </div>
              <div className="flex items-end gap-3">
                <p className="text-3xl font-extrabold leading-none tabular-nums" style={{ color: CATEGORY_BY_KEY.free.color }}>{formatDuration(summary.free)}</p>
                <p className="pb-0.5 text-xs text-h-muted">free each {WEEKDAY_NAMES[selDay]} ({Math.round((summary.free / 1440) * 100)}% of the day)</p>
              </div>
              {gaps.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-h-muted">Open windows</p>
                  <ul className="flex flex-wrap gap-1.5">
                    {gaps.map((g) => (
                      <li key={`${g.start}-${g.end}`}>
                        <button type="button" onClick={() => setSheet({ block: null, initial: { category: "free", start: g.start, end: g.end } })} className="rounded-lg border border-dashed border-h-border px-2.5 py-1 text-[11px] font-bold text-h-muted hover:border-h-brand hover:text-h-brand">
                          {toClock12(g.start)} – {toClock12(g.end % 1440)} · {formatDuration(g.end - g.start)}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-h-muted">Tap a window to plan what you do in it.</p>
                </div>
              ) : (
                <p className="text-[11px] text-h-muted">Every minute of this day is planned.</p>
              )}
              {Object.keys(summary.freeActivities).length > 0 && (
                <ul className="flex flex-col gap-1.5">
                  {Object.entries(summary.freeActivities)
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, m]) => (
                      <li key={name} className="flex items-center gap-2 text-sm">
                        <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_BY_KEY.free.color }} />
                        <span className="flex-1 truncate font-semibold">{name}</span>
                        <span className="text-xs font-extrabold tabular-nums text-h-muted">{formatDuration(m)}</span>
                      </li>
                    ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>

      <TimeTotals summary={week} lifespanYears={data.lifespanYears} yearsLeft={left} />
      <TimeSettings birthDate={data.birthDate} birthSource={data.birthSource} profileBirthDate={data.profileBirthDate} lifespanYears={data.lifespanYears} />

      {sheet && routine && (
        <TimeBlockSheet
          key={sheet.block?.id ?? `new-${sheet.initial?.start ?? "x"}-${sheet.initial?.category ?? "x"}`}
          routineId={routine.id}
          routineName={routine.name}
          block={sheet.block}
          gaps={gaps}
          initial={sheet.initial}
          onClose={() => setSheet(null)}
        />
      )}
      {managing && <RoutineManager routines={routines} dayMap={dayMap} onClose={() => setManaging(false)} />}
    </div>
  );
}

function Header({ onManage }: { onManage: (() => void) | null }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-h-muted">Know where your hours go</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Daily clock</h1>
      </div>
      {onManage && (
        <button type="button" onClick={onManage} className="flex items-center gap-1.5 rounded-xl border border-h-border bg-h-surface px-3 py-2 text-xs font-bold text-h-muted hover:text-h-fg">
          <Settings2 className="h-3.5 w-3.5" />
          Routines
        </button>
      )}
    </div>
  );
}

/** Which categories appear on the dial, with their time. */
function Legend({ blocks }: { blocks: Block[] }) {
  const totals = new Map<TimeCategory, number>();
  for (const b of blocks) totals.set(b.category, (totals.get(b.category) ?? 0) + blockMinutes(b));
  if (totals.size === 0) return <p className="text-center text-xs text-h-muted">The clock fills in as you add activities.</p>;
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-h-border pt-3 sm:grid-cols-3">
      {[...totals.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([key, m]) => (
          <li key={key} className="flex items-center gap-2 text-[11px] font-semibold text-h-muted">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CATEGORY_BY_KEY[key].color }} />
            <span className="min-w-0 flex-1 truncate">{CATEGORY_BY_KEY[key].label}</span>
            <span className="font-extrabold tabular-nums text-h-fg">{formatDuration(m)}</span>
          </li>
        ))}
    </ul>
  );
}
