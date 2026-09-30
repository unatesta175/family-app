import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Flame, Trophy, Percent, CheckCheck } from "lucide-react";
import { requireAuth, getOwnProfileId } from "@/lib/auth";
import { getProfile, getProfilesInHousehold } from "@/lib/db/repo";
import { getAllLogsForHabit, getCategories, getHabit, getHabitNotesInRange } from "@/lib/db/repo-habits";
import { addDays, addMonths, parseIso, todayIso } from "@/lib/date";
import { colorHex, completionRate, computeStreak, dayState, scheduleLabel, tint, totalDone } from "@/lib/habits";
import { heatmapWeeks, weeklyBars } from "@/lib/habit-stats";
import { HabitIcon } from "@/components/habits/habit-icon";
import { HabitCalendar, type CalendarDay } from "@/components/habits/habit-calendar";
import { HabitDetailActions } from "@/components/habits/habit-detail-actions";
import { Heatmap } from "@/components/habits/heatmap";
import { WeeklyBars } from "@/components/habits/charts";

export default async function HabitDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { id: rawId } = await params;
  const { month: rawMonth } = await searchParams;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const session = await requireAuth();
  const habit = await getHabit(id);
  if (!habit) notFound();

  // Any household member may view a habit; only its owner may edit it.
  const household = await getProfilesInHousehold(session.householdId);
  if (!household.some((p) => p.id === habit.profileId)) notFound();
  const ownProfileId = await getOwnProfileId();
  const readOnly = ownProfileId !== habit.profileId;

  const today = todayIso();
  const monthAnchor = rawMonth && /^\d{4}-\d{2}$/.test(rawMonth) ? `${rawMonth}-01` : `${today.slice(0, 7)}-01`;
  const monthStart = monthAnchor;
  const monthEnd = addDays(addMonths(monthStart, 1), -1);

  const [owner, logs, categories, notes] = await Promise.all([
    getProfile(habit.profileId),
    getAllLogsForHabit(habit.id),
    getCategories(habit.profileId),
    getHabitNotesInRange(habit.id, "0000-01-01", "9999-12-31"),
  ]);

  const hex = colorHex(habit.color);
  const category = categories.find((c) => c.id === habit.categoryId);
  const streak = computeStreak(habit, logs, today);
  const rate30 = completionRate(habit, logs, addDays(today, -29), today, today);
  const rateAll = completionRate(habit, logs, habit.startDate, today, today);
  const noteByDate = new Map(notes.filter((n) => n.note).map((n) => [n.date, n.note as string]));

  const days: CalendarDay[] = [];
  for (let d = monthStart; d <= monthEnd; d = addDays(d, 1)) {
    days.push({
      date: d,
      state: dayState(habit, logs[d], d, today),
      value: logs[d]?.status === "done" ? logs[d].value : 0,
      note: noteByDate.get(d) ?? null,
    });
  }

  const currentMonth = `${today.slice(0, 7)}-01`;
  const monthLabel = parseIso(monthStart).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const prevHref = `/habits/${habit.id}?month=${addMonths(monthStart, -1).slice(0, 7)}`;
  const nextHref = monthStart < currentMonth ? `/habits/${habit.id}?month=${addMonths(monthStart, 1).slice(0, 7)}` : null;

  const recentNotes = notes.filter((n) => n.note).slice(0, 5);

  return (
    <div className="flex flex-col gap-5 lg:mx-auto lg:max-w-3xl">
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
            {category && <span>{category.name}</span>}
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
          habit={{
            id: habit.id,
            name: habit.name,
            description: habit.description,
            categoryId: habit.categoryId,
            kind: habit.kind,
            icon: habit.icon,
            color: habit.color,
            schedule: habit.schedule,
            weekdays: habit.weekdays,
            weeklyTarget: habit.weeklyTarget,
            dailyTarget: habit.dailyTarget,
            unit: habit.unit,
            startDate: habit.startDate,
          }}
        />
      )}

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Stat icon={Flame} tone="var(--h-break)" value={`${streak.current}${streak.unit === "week" ? "w" : "d"}`} label="Current streak" />
        <Stat icon={Trophy} tone="#f59e0b" value={`${streak.best}${streak.unit === "week" ? "w" : "d"}`} label="Best streak" />
        <Stat icon={Percent} tone={hex} value={rate30 === null ? "–" : `${rate30}%`} label="Last 30 days" sub={rateAll === null ? undefined : `${rateAll}% all time`} />
        <Stat icon={CheckCheck} tone="var(--h-good)" value={String(totalDone(habit, logs))} label="Total check-ins" />
      </div>

      <HabitCalendar
        habitId={habit.id}
        kind={habit.kind}
        color={habit.color}
        dailyTarget={habit.dailyTarget}
        unit={habit.unit}
        monthLabel={monthLabel}
        prevHref={prevHref}
        nextHref={nextHref}
        leadingBlanks={parseIso(monthStart).getDay()}
        days={days}
        today={today}
        readOnly={readOnly}
      />

      <section className="h-card p-4">
        <h3 className="mb-3 text-sm font-extrabold">Last 26 weeks</h3>
        <div className="scrollbar-hide overflow-x-auto">
          <Heatmap weeks={heatmapWeeks(habit, logs, 26, today)} color={habit.color} cell={12} />
        </div>
      </section>

      <section className="h-card p-4">
        <h3 className="mb-1 text-sm font-extrabold">Weekly completion</h3>
        <WeeklyBars bars={weeklyBars(habit, logs, 12, today)} color={hex} />
      </section>

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
    </div>
  );
}

function Stat({
  icon: Icon,
  tone,
  value,
  label,
  sub,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  tone: string;
  value: string;
  label: string;
  sub?: string;
}) {
  return (
    <div className="h-card flex flex-col gap-2 p-4">
      <Icon className="h-5 w-5" style={{ color: tone }} />
      <div>
        <p className="text-2xl font-extrabold leading-none tabular-nums">{value}</p>
        <p className="mt-1 text-[11px] font-semibold text-h-muted">{label}</p>
        {sub && <p className="text-[11px] font-bold">{sub}</p>}
      </div>
    </div>
  );
}
