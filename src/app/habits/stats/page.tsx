import Link from "next/link";
import { Flame, Target, TrendingUp, Trophy, ListChecks, CheckCircle2 } from "lucide-react";
import { loadHabitData } from "@/lib/habit-data";
import { buildBoardHabits, buildBoardTasks } from "@/lib/habit-board";
import { STREAK_UNIT_SHORT, colorHex, completionRate, computeStreak, tint, totalDone } from "@/lib/habits";
import { dailyTrend, heatmapWeeks } from "@/lib/habit-stats";
import { addDays, todayIso } from "@/lib/date";
import { habitIcon } from "@/lib/habit-icons";
import { Heatmap } from "@/components/habits/heatmap";
import { TrendChart } from "@/components/habits/charts";
import { TodayBoard } from "@/components/habits/today-board";
import { Ring } from "@/components/habits/ring";
import { cn } from "@/lib/utils";

const RANGES = [7, 30, 90] as const;

function avg(nums: (number | null)[]): number | null {
  const vals = nums.filter((n): n is number => n !== null);
  return vals.length === 0 ? null : Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export default async function HabitsStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rawRange } = await searchParams;
  const range = (RANGES as readonly number[]).includes(Number(rawRange)) ? Number(rawRange) : 30;
  const today = todayIso();
  const from = addDays(today, -(range - 1));

  const { profile, readOnly, habits, categories, logsByHabit, tasks, completions } = await loadHabitData();

  const perHabit = habits.map((h) => {
    const logs = logsByHabit[h.id] ?? {};
    const streak = computeStreak(h, logs, today);
    return {
      habit: h,
      rate: completionRate(h, logs, from, today, today),
      streak,
      total: totalDone(h, logs),
      inRange: Object.entries(logs).filter(
        ([d, l]) => d >= from && d <= today && l.status === "done" && l.value >= h.dailyTarget
      ).length,
      heat: heatmapWeeks(h, logs, 13, today),
    };
  });

  const overall = avg(perHabit.map((p) => p.rate));
  const buildRate = avg(perHabit.filter((p) => p.habit.kind === "build").map((p) => p.rate));
  const breakRate = avg(perHabit.filter((p) => p.habit.kind === "break").map((p) => p.rate));
  const totalCheckIns = perHabit.reduce((sum, p) => sum + p.inRange, 0);
  const bestCurrent = perHabit.reduce((m, p) => (p.streak.current > (m?.streak.current ?? 0) ? p : m), null as (typeof perHabit)[number] | null);
  const bestEver = perHabit.reduce((m, p) => (p.streak.best > (m?.streak.best ?? 0) ? p : m), null as (typeof perHabit)[number] | null);

  const trend = dailyTrend(habits, logsByHabit, from, today, today);

  const byCategory = categories
    .map((c) => {
      const members = perHabit.filter((p) => p.habit.categoryId === c.id);
      return { cat: c, count: members.length, rate: avg(members.map((m) => m.rate)) };
    })
    .filter((c) => c.count > 0);

  // Tasks completed in range (one-off by completion date, recurring by tick date).
  let tasksDone = 0;
  for (const t of tasks) {
    if (t.recurrence === "none") {
      if (t.completedAt && t.completedAt >= from && t.completedAt <= today) tasksDone += 1;
    } else {
      for (const d of completions[t.id] ?? []) if (d >= from && d <= today) tasksDone += 1;
    }
  }
  const tasksOpen = tasks.filter((t) => t.recurrence === "none" && !t.completedAt).length;

  // Still pending today (habits + tasks), with quick-complete controls.
  const boardHabits = buildBoardHabits(habits, categories, logsByHabit, today, today).filter(
    (h) => h.state === "pending" || h.state === "partial" || (h.state === "flex" && !h.periodMet)
  );
  const boardTasks = buildBoardTasks(tasks, categories, completions, today, today).filter((t) => !t.done);

  const ranked = perHabit.filter((p) => p.rate !== null).sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));
  const needsWork = [...ranked].reverse().filter((p) => (p.rate ?? 0) < 60).slice(0, 3);

  return (
    <div className="flex flex-col gap-5 md:mx-auto md:max-w-3xl">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-h-muted">{profile?.name}</p>
          <h1 className="text-2xl font-extrabold tracking-tight">Statistics</h1>
        </div>
        <div className="flex gap-1 rounded-xl bg-h-surface2 p-1">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/habits/stats?range=${r}`}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                r === range ? "bg-h-surface text-h-fg shadow-sm" : "text-h-muted hover:text-h-fg"
              )}
            >
              {r}d
            </Link>
          ))}
        </div>
      </div>

      {habits.length === 0 ? (
        <p className="h-card p-6 text-center text-sm text-h-muted">
          No habits to analyse yet. Add some from the Today tab.
        </p>
      ) : (
        <>
          {/* Pending today */}
          <section className="flex flex-col gap-2">
            <h3 className="px-1 text-xs font-extrabold uppercase tracking-wider text-h-muted">Pending today</h3>
            {boardHabits.length + boardTasks.length === 0 ? (
              <div className="h-card flex items-center gap-3 p-4">
                <CheckCircle2 className="h-5 w-5 text-h-good" />
                <p className="text-sm font-bold">Nothing pending — every habit and task for today is handled.</p>
              </div>
            ) : (
              <TodayBoard date={today} today={today} readOnly={readOnly} habits={boardHabits} tasks={boardTasks} compact />
            )}
          </section>

          {/* Headline numbers */}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <div className="h-card col-span-2 flex items-center gap-4 p-4 md:col-span-1 md:flex-col md:items-start">
              <Ring pct={overall ?? 0} size={72} stroke={8}>
                <span className="text-base font-extrabold tabular-nums">{overall ?? 0}%</span>
              </Ring>
              <div>
                <p className="text-sm font-extrabold">Completion</p>
                <p className="text-[11px] text-h-muted">Average across habits, last {range} days</p>
              </div>
            </div>
            <Tile icon={Flame} tone="var(--h-break)" value={bestCurrent?.streak.current ?? 0} unit={bestCurrent ? STREAK_UNIT_SHORT[bestCurrent.streak.unit] : "d"} label="Longest running streak" sub={bestCurrent?.habit.name} />
            <Tile icon={Trophy} tone="#f59e0b" value={bestEver?.streak.best ?? 0} unit={bestEver ? STREAK_UNIT_SHORT[bestEver.streak.unit] : "d"} label="Best streak ever" sub={bestEver?.habit.name} />
            <Tile icon={Target} tone="var(--h-brand)" value={totalCheckIns} label={`Check-ins (${range}d)`} sub={`${tasksDone} task${tasksDone === 1 ? "" : "s"} done · ${tasksOpen} open`} />
          </div>

          {/* Trend */}
          <section className="h-card p-4">
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-h-brand" />
              <h3 className="text-sm font-extrabold">Daily completion</h3>
            </div>
            <TrendChart points={trend} />
          </section>

          {/* Build vs break + categories */}
          <div className="grid gap-2 sm:grid-cols-2">
            <section className="h-card flex flex-col gap-3 p-4">
              <h3 className="text-sm font-extrabold">Build vs. break</h3>
              <RateBar label="Build habits" rate={buildRate} color="var(--h-brand)" />
              <RateBar label="Break habits" rate={breakRate} color="var(--h-break)" />
            </section>
            <section className="h-card flex flex-col gap-3 p-4">
              <h3 className="text-sm font-extrabold">By category</h3>
              {byCategory.length === 0 ? (
                <p className="text-xs text-h-muted">Assign categories to your habits to compare them here.</p>
              ) : (
                byCategory.map(({ cat, rate }) => (
                  <RateBar key={cat.id} label={cat.name} rate={rate} color={colorHex(cat.color)} />
                ))
              )}
            </section>
          </div>

          {needsWork.length > 0 && (
            <section className="h-card border-h-break/30 bg-h-break-soft/50 p-4">
              <h3 className="text-sm font-extrabold">Needs attention</h3>
              <p className="mb-2 text-xs text-h-muted">Habits under 60% this period.</p>
              <div className="flex flex-wrap gap-1.5">
                {needsWork.map((p) => (
                  <Link
                    key={p.habit.id}
                    href={`/habits/${p.habit.id}`}
                    className="rounded-full bg-h-surface px-3 py-1.5 text-xs font-bold shadow-sm"
                  >
                    {p.habit.name} · {p.rate}%
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Per-habit */}
          <section className="flex flex-col gap-2">
            <h3 className="px-1 text-xs font-extrabold uppercase tracking-wider text-h-muted">Every habit</h3>
            {perHabit.map((p) => {
              const hex = colorHex(p.habit.color);
              const Icon = habitIcon(p.habit.icon);
              return (
                <Link key={p.habit.id} href={`/habits/${p.habit.id}`} className="h-card flex flex-col gap-3 p-4 transition-colors hover:bg-h-surface2/40">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: tint(hex, 0.14), color: hex }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold">{p.habit.name}</p>
                      <p className="text-[11px] font-medium text-h-muted">
                        {p.habit.kind === "break" ? "Break" : "Build"} · {p.inRange} check-ins in {range}d · {p.total} total
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-extrabold leading-none tabular-nums" style={{ color: hex }}>
                        {p.rate === null ? "–" : `${p.rate}%`}
                      </p>
                      <p className="mt-1 flex items-center justify-end gap-0.5 text-[11px] font-bold text-h-break">
                        <Flame className="h-3 w-3" />
                        {p.streak.current}
                        {STREAK_UNIT_SHORT[p.streak.unit]}
                        <span className="font-medium text-h-muted"> · best {p.streak.best}</span>
                      </p>
                    </div>
                  </div>
                  <div className="scrollbar-hide overflow-x-auto">
                    <Heatmap weeks={p.heat} color={p.habit.color} cell={11} />
                  </div>
                </Link>
              );
            })}
          </section>

          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-h-muted">
            <ListChecks className="h-3 w-3" />
            Rates skip rest days and never count today against you until it is done.
          </p>
        </>
      )}
    </div>
  );
}

function Tile({
  icon: Icon,
  tone,
  value,
  unit,
  label,
  sub,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  tone: string;
  value: number;
  unit?: string;
  label: string;
  sub?: string;
}) {
  return (
    <div className="h-card flex flex-col justify-between gap-2 p-4">
      <Icon className="h-5 w-5" style={{ color: tone }} />
      <div>
        <p className="text-2xl font-extrabold leading-none tabular-nums">
          {value}
          {unit && <span className="ml-0.5 text-sm font-bold text-h-muted">{unit}</span>}
        </p>
        <p className="mt-1 text-[11px] font-semibold text-h-muted">{label}</p>
        {sub && <p className="truncate text-[11px] font-bold">{sub}</p>}
      </div>
    </div>
  );
}

function RateBar({ label, rate, color }: { label: string; rate: number | null; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-bold">
        <span className="truncate">{label}</span>
        <span className="tabular-nums text-h-muted">{rate === null ? "–" : `${rate}%`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-h-surface2">
        <div className="h-full rounded-full transition-all" style={{ width: `${rate ?? 0}%`, background: color }} />
      </div>
    </div>
  );
}
