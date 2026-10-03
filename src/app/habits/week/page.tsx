import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { loadHabitData } from "@/lib/habit-data";
import {
  PERIOD_DAYS,
  computeStreak,
  dayState,
  isPeriodHabit,
  parseChecklist,
  periodDoneCount,
  weekDates,
  weekDoneCount,
} from "@/lib/habits";
import { addDays, parseIso, todayIso } from "@/lib/date";
import { WeekGrid, type WeekRow } from "@/components/habits/week-grid";
import { Ring } from "@/components/habits/ring";

const LEGEND = [
  { label: "Done", cls: "bg-h-brand" },
  { label: "Slipped", cls: "bg-h-bad" },
  { label: "Missed", cls: "border border-dashed border-h-bad/50 bg-h-bad/10" },
  { label: "Skipped", cls: "bg-h-surface2" },
] as const;

export default async function HabitsWeekPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: rawDate } = await searchParams;
  const today = todayIso();
  const anchor = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : today;
  const dates = weekDates(anchor);
  const isCurrentWeek = dates.includes(today);

  const { profile, readOnly, habits, logsByHabit } = await loadHabitData();

  const rows: WeekRow[] = habits.map((h) => {
    const logs = logsByHabit[h.id] ?? {};
    return {
      id: h.id,
      name: h.name,
      kind: h.kind,
      color: h.color,
      icon: h.icon,
      evalType: h.evalType,
      targetOp: h.targetOp,
      dailyTarget: h.dailyTarget,
      unit: h.unit,
      checklist: parseChecklist(h.checklist),
      isPeriod: isPeriodHabit(h),
      periodUnit: h.periodUnit,
      periodTarget: h.weeklyTarget,
      periodDone: isPeriodHabit(h) ? periodDoneCount(h, logs, anchor) : 0,
      cells: dates.map((d) => ({
        date: d,
        state: dayState(h, logs, d, today),
        value: logs[d]?.status === "done" ? logs[d].value : 0,
        checked: logs[d]?.status === "done" ? (logs[d].checked ?? []) : [],
      })),
    };
  });

  // Week-level score: average of each habit's progress towards what was expected this week.
  let achieved = 0;
  let expected = 0;
  for (const h of habits) {
    const logs = logsByHabit[h.id] ?? {};
    if (isPeriodHabit(h)) {
      // A month/year target is spread evenly over its weeks so the weekly score stays comparable.
      const weekTarget = Math.max(1, Math.ceil((h.weeklyTarget * 7) / PERIOD_DAYS[h.periodUnit]));
      achieved += Math.min(weekTarget, weekDoneCount(h, logs, anchor));
      expected += weekTarget;
    } else {
      for (const d of dates) {
        if (d > today) continue;
        const s = dayState(h, logs, d, today);
        if (s === "off" || s === "skipped" || s === "upcoming" || s === "flex" || s === "prestart") continue;
        expected += 1;
        if (s === "done") achieved += 1;
      }
    }
  }
  const weekPct = expected === 0 ? 0 : Math.round((achieved / expected) * 100);

  const bestStreak = habits.reduce((max, h) => Math.max(max, computeStreak(h, logsByHabit[h.id] ?? {}, today).current), 0);
  const fmt = (iso: string) => parseIso(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="flex flex-col gap-5 md:mx-auto md:max-w-3xl">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-h-muted">{profile?.name}</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Weekly view</h1>
      </div>

      <div className="h-card flex items-center justify-between gap-2 p-2">
        <Link
          href={`/habits/week?date=${addDays(dates[0], -7)}`}
          aria-label="Previous week"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-h-muted hover:bg-h-surface2"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="text-center">
          <p className="text-sm font-extrabold">
            {fmt(dates[0])} – {fmt(dates[6])}
          </p>
          {isCurrentWeek ? (
            <p className="text-[11px] font-bold text-h-brand">This week</p>
          ) : (
            <Link href="/habits/week" className="text-[11px] font-bold text-h-brand">
              Jump to this week
            </Link>
          )}
        </div>
        <Link
          href={`/habits/week?date=${addDays(dates[0], 7)}`}
          aria-label="Next week"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-h-muted hover:bg-h-surface2"
        >
          <ChevronRight className="h-5 w-5" />
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="h-card p-6 text-center text-sm text-h-muted">
          No habits yet. Add some from the Today tab to see them here.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="h-card flex items-center gap-3 p-3">
              <Ring pct={weekPct} size={52} stroke={6}>
                <span className="text-[11px] font-extrabold tabular-nums">{weekPct}%</span>
              </Ring>
              <div>
                <p className="text-sm font-extrabold leading-tight">Week score</p>
                <p className="text-[11px] text-h-muted">
                  {achieved}/{expected} check-ins
                </p>
              </div>
            </div>
            <div className="h-card flex flex-col justify-center p-3">
              <p className="text-2xl font-extrabold leading-none tabular-nums">{bestStreak}</p>
              <p className="mt-1 text-[11px] font-medium text-h-muted">Longest current streak</p>
            </div>
          </div>

          <WeekGrid rows={rows} dates={dates} today={today} readOnly={readOnly} />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-[11px] font-medium text-h-muted">
            {LEGEND.map((l) => (
              <span key={l.label} className="flex items-center gap-1.5">
                <span className={`h-3 w-3 rounded ${l.cls}`} />
                {l.label}
              </span>
            ))}
            {!readOnly && <span>· Tap a day to cycle done → missed → pending. Numbers, timers and checklists open a dialog. Break habits cycle clean → slipped → cleared.</span>}
          </div>
        </>
      )}
    </div>
  );
}
