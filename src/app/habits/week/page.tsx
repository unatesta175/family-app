import Link from "next/link";
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Grid3x3 } from "lucide-react";
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
  STATUS_COLOR,
} from "@/lib/habits";
import { addDays, addMonths, parseIso, todayIso } from "@/lib/date";
import { WeekGrid, type WeekRow } from "@/components/habits/week-grid";
import { Ring } from "@/components/habits/ring";
import { MonthMatrix } from "@/components/habits/month-matrix";
import { HabitHeatCard } from "@/components/habits/habit-heat-card";
import { heatmapWeeks } from "@/lib/habit-stats";
import { habitStandingInput, standingFor } from "@/lib/world-rank";
import { cn } from "@/lib/utils";

const HEAT_WEEKS = 26;

const LEGEND = [
  { label: "Done", color: STATUS_COLOR.done },
  { label: "Partial", color: STATUS_COLOR.partial },
  { label: "Slipped", color: STATUS_COLOR.slipped },
  { label: "Missed", color: STATUS_COLOR.missed },
  { label: "Skipped", color: STATUS_COLOR.skipped },
  { label: "Pending", color: STATUS_COLOR.pending },
] as const;

export default async function HabitsWeekPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string; month?: string }>;
}) {
  const { date: rawDate, view: rawView, month: rawMonth } = await searchParams;
  const view: "week" | "month" | "heatmap" = rawView === "heatmap" ? "heatmap" : rawView === "month" ? "month" : "week";
  const heat = view === "heatmap";
  const monthView = view === "month";
  const today = todayIso();
  const anchor = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : today;
  const dates = weekDates(anchor);
  const isCurrentWeek = dates.includes(today);

  const { profile, readOnly, habits, logsByHabit, categories } = await loadHabitData();
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  // Each habit's own estimated world standing, shown in the week, month and heatmap views.
  const ranks = new Map(
    habits.map((h) => {
      const s = standingFor(habitStandingInput(h, logsByHabit[h.id] ?? {}, today));
      return [h.id, { top: s.topPercent, tier: s.tier }] as const;
    })
  );
  const buildRow = (h: (typeof habits)[number], dates: string[]): WeekRow => {
    const logs = logsByHabit[h.id] ?? {};
    return {
      id: h.id,
      rank: ranks.get(h.id),
      name: h.name,
      kind: h.kind,
      color: h.color,
      icon: h.icon,
      categoryName: h.categoryId ? (categoryName.get(h.categoryId) ?? null) : null,
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
        logged: !!logs[d],
      })),
    };
  };

  const rows: WeekRow[] = habits.map((h) => buildRow(h, dates));

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
  // Month view: one row per habit, one column per day.
  const monthKey = rawMonth && /^d{4}-(0[1-9]|1[0-2])$/.test(rawMonth) ? rawMonth : today.slice(0, 7);
  const monthFirst = `${monthKey}-01`;
  const monthDays = new Date(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5)), 0).getDate();
  const monthDates = Array.from({ length: monthDays }, (_, i) => `${monthKey}-${String(i + 1).padStart(2, "0")}`);
  const matrixRows: WeekRow[] = monthView ? habits.map((h) => buildRow(h, monthDates)) : [];
  const monthLabel = parseIso(monthFirst).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const fmt = (iso: string) => parseIso(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className={cn("flex min-w-0 max-w-full flex-col gap-5 overflow-x-clip md:mx-auto", monthView ? "md:max-w-none lg:h-[calc(100dvh-8.5rem)] lg:gap-3" : "md:max-w-3xl")}>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-h-muted">{profile?.name}</p>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h1 className="text-2xl font-extrabold tracking-tight">Progress</h1>
          {monthView && (
            <div className="flex items-center gap-1 rounded-full border border-h-border bg-h-surface p-0.5 shadow-sm">
              <Link href={`/habits/week?view=month&month=${addMonths(monthFirst, -1).slice(0, 7)}`} aria-label="Previous month" className="flex h-8 w-8 items-center justify-center rounded-full text-h-muted hover:bg-h-surface2">
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <div className="min-w-32 text-center leading-tight">
                <p className="text-sm font-extrabold">{monthLabel}</p>
                {monthKey !== today.slice(0, 7) && (
                  <Link href="/habits/week?view=month" className="text-[10px] font-bold text-h-brand">
                    Jump to this month
                  </Link>
                )}
              </div>
              <Link href={`/habits/week?view=month&month=${addMonths(monthFirst, 1).slice(0, 7)}`} aria-label="Next month" className="flex h-8 w-8 items-center justify-center rounded-full text-h-muted hover:bg-h-surface2">
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}
          <div role="tablist" aria-label="Display" className="flex rounded-full border border-h-border bg-h-surface p-0.5 shadow-sm">
            {(
              [
                { key: "week", label: "Week", icon: CalendarDays, href: "/habits/week" },
                { key: "month", label: "Month", icon: CalendarRange, href: "/habits/week?view=month" },
                { key: "heatmap", label: "Heatmap", icon: Grid3x3, href: "/habits/week?view=heatmap" },
              ] as const
            ).map((v) => {
              const active = v.key === view;
              return (
                <Link
                  key={v.key}
                  role="tab"
                  aria-selected={active}
                  href={v.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                    active ? "bg-h-brand text-h-brand-fg shadow-sm" : "text-h-muted hover:text-h-fg"
                  )}
                >
                  <v.icon className="h-3.5 w-3.5" />
                  {v.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {view === "week" && (
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
      )}

      {rows.length === 0 ? (
        <p className="h-card p-6 text-center text-sm text-h-muted">
          No habits yet. Add some from the Today tab to see them here.
        </p>
      ) : monthView ? (
        <>
          <MonthMatrix month={monthKey} days={monthDays} today={today} rows={matrixRows} readOnly={readOnly} />
        </>
      ) : heat ? (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
            {habits.map((h) => {
              const logs = logsByHabit[h.id] ?? {};
              return (
                <HabitHeatCard
                  key={h.id}
                  id={h.id}
                  name={h.name}
                  icon={h.icon}
                  color={h.color}
                  kind={h.kind}
                  weeks={heatmapWeeks(h, logs, HEAT_WEEKS, today)}
                  streak={computeStreak(h, logs, today)}
                  rank={ranks.get(h.id)}
                  today={today}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-[11px] font-medium text-h-muted">
            {LEGEND.map((l) => (
              <span key={l.label} className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded" style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
            <span>· Last {HEAT_WEEKS} weeks, newest on the right. Tap a card for its details.</span>
          </div>
        </>
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
                <span className="h-3 w-3 rounded" style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
            {!readOnly && <span>· Tap a day to cycle done → slipped → missed → skipped → pending. Numbers, timers and checklists open a dialog.</span>}
          </div>
        </>
      )}
    </div>
  );
}
