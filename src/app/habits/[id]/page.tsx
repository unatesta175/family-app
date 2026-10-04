import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart3, Blocks, CalendarDays } from "lucide-react";
import { requireAuth, getOwnProfileId } from "@/lib/auth";
import { getProfile, getProfilesInHousehold } from "@/lib/db/repo";
import { getAllLogsForHabit, getCategories, getHabit, getHabitNotesInRange } from "@/lib/db/repo-habits";
import { addDays, addMonths, parseIso, todayIso } from "@/lib/date";
import {
  colorHex,
  completionRate,
  computeStreak,
  dayState,
  formatAmount,
  goalProgress,
  GOAL_PERIOD_LABEL,
  parseChecklist,
  parseGoals,
  scheduleLabel,
  targetLabel,
  tint,
} from "@/lib/habits";
import { habitToFormValues } from "@/lib/habit-form-values";
import { loadSelectableGoals } from "@/lib/goal-data";
import { getGoalChipsForHabits } from "@/lib/db/repo-goals";
import { heatmapWeeks } from "@/lib/habit-stats";
import { buildStatDays, habitScore } from "@/lib/habit-insights";
import { HabitIcon } from "@/components/habits/habit-icon";
import { HabitCalendar, type CalendarDay } from "@/components/habits/habit-calendar";
import { HabitDetailActions } from "@/components/habits/habit-detail-actions";
import { HabitStatistics } from "@/components/habits/habit-statistics";
import { HabitTowerPanel } from "@/components/habit-tower/tower-panel";
import { cn } from "@/lib/utils";

export default async function HabitDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string; tab?: string }>;
}) {
  const { id: rawId } = await params;
  const { month: rawMonth, tab: rawTab } = await searchParams;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const tab = rawTab === "stats" ? "stats" : rawTab === "tower" ? "tower" : "calendar";

  const session = await requireAuth();
  const habit = await getHabit(id);
  if (!habit) notFound();

  // Any household member may view a habit; only its owner may edit it.
  const household = await getProfilesInHousehold(session.householdId);
  if (!household.some((p) => p.id === habit.profileId)) notFound();
  const ownProfileId = await getOwnProfileId();
  const readOnly = ownProfileId !== habit.profileId;

  const today = todayIso();

  const [owner, logs, categories, notes] = await Promise.all([
    getProfile(habit.profileId),
    getAllLogsForHabit(habit.id),
    getCategories(habit.profileId),
    getHabitNotesInRange(habit.id, "0000-01-01", "9999-12-31"),
  ]);

  const hex = colorHex(habit.color);
  const lifeGoal = (await getGoalChipsForHabits([habit.id])).get(habit.id) ?? null;
  const selectableGoals = readOnly ? [] : await loadSelectableGoals();
  const category = categories.find((c) => c.id === habit.categoryId);

  const tabs = [
    { key: "calendar", label: "Calendar", icon: CalendarDays, href: `/habits/${habit.id}` },
    { key: "stats", label: "Statistics", icon: BarChart3, href: `/habits/${habit.id}?tab=stats` },
    { key: "tower", label: "Tower", icon: Blocks, href: `/habits/${habit.id}?tab=tower` },
  ] as const;

  return (
    <div className="flex flex-col gap-5 md:mx-auto md:max-w-3xl">
      <Link href="/habits/manage" className="flex w-fit items-center gap-1 text-xs font-bold text-h-muted hover:text-h-fg">
        <ArrowLeft className="h-3.5 w-3.5" />
        All habits
      </Link>

      <div className="flex items-start gap-4">
        <span
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl"
          style={{ background: tint(hex, 0.15), color: hex }}
        >
          <HabitIcon name={habit.icon} className="h-8 w-8" />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight">{habit.name}</h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs font-medium text-h-muted">
            <span className={habit.kind === "break" ? "font-bold text-h-break" : "font-bold text-h-brand"}>
              {habit.kind === "break" ? "Break habit" : "Build habit"}
            </span>
            <span>{scheduleLabel(habit)}</span>
            {targetLabel(habit) && <span>{targetLabel(habit)} / day</span>}
            {category && <span>{category.name}</span>}
            {habit.priority > 0 && <span className="font-bold">Priority {habit.priority}</span>}
            {lifeGoal && (
              <Link href={`/goals/${lifeGoal.goalId}`} className="font-bold text-h-brand hover:underline">
                Contributes to: {lifeGoal.title}
              </Link>
            )}
            <span>{owner?.name}</span>
            {habit.archivedAt && <span className="font-bold text-h-bad">Archived</span>}
          </p>
          {habit.description && <p className="mt-1 text-sm text-h-muted">{habit.description}</p>}
        </div>
      </div>

      {!readOnly && (
        <HabitDetailActions
          archived={habit.archivedAt !== null}
          categories={categories.map((c) => ({ id: c.id, name: c.name, color: c.color, icon: c.icon }))}
          habit={{ ...habitToFormValues(habit, lifeGoal?.goalId ?? null), id: habit.id }}
          circleSize={household.length}
          goals={selectableGoals}
        />
      )}

      <nav className="flex gap-1 rounded-xl bg-h-surface2 p-1" aria-label="Habit sections">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all",
              tab === t.key ? "bg-h-surface text-h-fg shadow-sm" : "text-h-muted hover:text-h-fg"
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "stats" ? (
        <StatsTab habit={habit} logs={logs} today={today} />
      ) : tab === "tower" ? (
        <HabitTowerPanel name={habit.name} color={habit.color} days={buildStatDays(habit, logs, today)} startDate={habit.startDate} today={today} evalType={habit.evalType} unit={habit.unit} />
      ) : (
        <CalendarTab habit={habit} logs={logs} notes={notes} today={today} rawMonth={rawMonth} readOnly={readOnly} hex={hex} />
      )}
    </div>
  );
}

type HabitRow = NonNullable<Awaited<ReturnType<typeof getHabit>>>;
type Logs = Awaited<ReturnType<typeof getAllLogsForHabit>>;

function StatsTab({ habit, logs, today }: { habit: HabitRow; logs: Logs; today: string }) {
  const score = habitScore(habit, logs, today);
  const monthAgo = addDays(today, -30);
  const scoreDelta = habit.startDate <= monthAgo ? score - habitScore(habit, logs, today, monthAgo) : null;

  return (
    <HabitStatistics
      kind={habit.kind}
      color={habit.color}
      evalType={habit.evalType}
      unit={habit.unit}
      startDate={habit.startDate}
      today={today}
      days={buildStatDays(habit, logs, today)}
      score={score}
      scoreDelta={scoreDelta}
      streak={computeStreak(habit, logs, today)}
      rate30={completionRate(habit, logs, addDays(today, -29), today, today)}
      rateAll={completionRate(habit, logs, habit.startDate, today, today)}
      heat={heatmapWeeks(habit, logs, 26, today)}
    />
  );
}

function CalendarTab({
  habit,
  logs,
  notes,
  today,
  rawMonth,
  readOnly,
  hex,
}: {
  habit: HabitRow;
  logs: Logs;
  notes: Awaited<ReturnType<typeof getHabitNotesInRange>>;
  today: string;
  rawMonth: string | undefined;
  readOnly: boolean;
  hex: string;
}) {
  const monthStart = rawMonth && /^\d{4}-\d{2}$/.test(rawMonth) ? `${rawMonth}-01` : `${today.slice(0, 7)}-01`;
  const monthEnd = addDays(addMonths(monthStart, 1), -1);
  const noteByDate = new Map(notes.filter((n) => n.note).map((n) => [n.date, n.note as string]));

  const days: CalendarDay[] = [];
  for (let d = monthStart; d <= monthEnd; d = addDays(d, 1)) {
    days.push({
      date: d,
      state: dayState(habit, logs, d, today),
      value: logs[d]?.status === "done" ? logs[d].value : 0,
      checked: logs[d]?.status === "done" ? (logs[d].checked ?? []) : [],
      note: noteByDate.get(d) ?? null,
    });
  }

  const currentMonth = `${today.slice(0, 7)}-01`;
  const monthLabel = parseIso(monthStart).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const prevHref = `/habits/${habit.id}?month=${addMonths(monthStart, -1).slice(0, 7)}`;
  const nextHref = monthStart < currentMonth ? `/habits/${habit.id}?month=${addMonths(monthStart, 1).slice(0, 7)}` : null;

  const recentNotes = notes.filter((n) => n.note).slice(0, 5);

  const goalRows = parseGoals(habit.goals).map((g) => {
    const { current, met } = goalProgress(habit, logs, g, today);
    const sym = g.op === "at_least" ? "≥" : g.op === "at_most" ? "≤" : "=";
    return {
      label: `${GOAL_PERIOD_LABEL[g.period]} goal`,
      current: formatAmount(habit, current),
      target: `${sym} ${formatAmount(habit, g.value)}`,
      pct: g.value > 0 ? Math.min(100, Math.round((current / g.value) * 100)) : 0,
      met,
    };
  });

  return (
    <>
      {goalRows.length > 0 && (
        <section className="h-card flex flex-col gap-3 p-4">
          <h3 className="text-sm font-extrabold">Goals</h3>
          {goalRows.map((g) => (
            <div key={g.label} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-bold">{g.label}</span>
                <span className="font-semibold tabular-nums text-h-muted">
                  {g.current} <span className="opacity-60">/ {g.target}</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-h-surface2">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${g.pct}%`, background: g.met ? "var(--h-good)" : hex }}
                />
              </div>
            </div>
          ))}
        </section>
      )}

      <HabitCalendar
        habitId={habit.id}
        kind={habit.kind}
        color={habit.color}
        evalType={habit.evalType}
        targetOp={habit.targetOp}
        dailyTarget={habit.dailyTarget}
        unit={habit.unit}
        checklist={parseChecklist(habit.checklist)}
        monthLabel={monthLabel}
        prevHref={prevHref}
        nextHref={nextHref}
        leadingBlanks={parseIso(monthStart).getDay()}
        days={days}
        today={today}
        readOnly={readOnly}
      />

      {recentNotes.length > 0 && (
        <section className="h-card p-4">
          <h3 className="mb-2 text-sm font-extrabold">Recent notes</h3>
          <ul className="flex flex-col gap-2">
            {recentNotes.map((n) => (
              <li key={n.date} className="text-sm">
                <span className="mr-2 text-[11px] font-bold text-h-muted">
                  {parseIso(n.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                {n.note}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
