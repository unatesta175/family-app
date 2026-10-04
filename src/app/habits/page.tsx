import Link from "next/link";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { loadHabitData } from "@/lib/habit-data";
import { buildBoardHabits, buildBoardTasks } from "@/lib/habit-board";
import { loadGoalsData } from "@/lib/goal-data";
import { getGoalChipsForHabits } from "@/lib/db/repo-goals";
import { GoalsFocus } from "@/components/goals/goals-focus";
import { TodayMilestones, type TodayMilestone } from "@/components/goals/today-milestones";
import { computeStreak, dayCompletion, weekDates, WEEKDAY_SHORT, type StreakResult } from "@/lib/habits";
import { getProfilesInHousehold } from "@/lib/db/repo";
import { getHabits, getHabitLogsInRange } from "@/lib/db/repo-habits";
import { requireAuth } from "@/lib/auth";
import { addDays, parseIso, todayIso } from "@/lib/date";
import { TodayBoard } from "@/components/habits/today-board";
import { FamilyStrip, type FamilyMember } from "@/components/habits/family-strip";
import { StarterPackCard } from "@/components/habits/starter-pack-card";
import { Ring } from "@/components/habits/ring";
import { cn } from "@/lib/utils";

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 20) return "Good evening";
  return "Good night";
}

export default async function HabitsTodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await requireAuth();
  const { date: rawDate } = await searchParams;
  const today = todayIso();
  const date = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : today;

  const { profileId, profile, readOnly, habits, categories, logsByHabit, tasks, completions } =
    await loadHabitData();

  const goalChips = await getGoalChipsForHabits(habits.map((h) => h.id));
  const boardHabits = buildBoardHabits(habits, categories, logsByHabit, date, today, goalChips);

  // Goals: the focus card, and milestones that are due today. Only for your own habit page.
  const goalsData = readOnly ? null : await loadGoalsData();
  const milestoneRows: TodayMilestone[] =
    goalsData && date === today
      ? goalsData.views
          .filter((v) => v.mine && v.goal.status === "active")
          .flatMap((v) =>
            v.milestones
              .filter((m) => m.doneAt === date || (!m.doneAt && m.dueDate !== null && m.dueDate <= date))
              .map((m) => ({
                id: m.id,
                title: m.title,
                goalId: v.goal.id,
                goalTitle: v.goal.title,
                color: v.goal.color,
                overdue: !m.doneAt && m.dueDate !== null && m.dueDate < date,
                done: !!m.doneAt,
              }))
          )
      : [];
  const boardTasks = buildBoardTasks(tasks, categories, completions, date, today);

  // Summary numbers for the selected day.
  const habitDay = dayCompletion(habits, logsByHabit, date, today);
  const tasksDone = boardTasks.filter((t) => t.done).length;
  const done = habitDay.done + tasksDone;
  const due = habitDay.due + boardTasks.length;
  const pct = due === 0 ? 0 : Math.round((done / due) * 100);

  // Best running streak, for the highlight chip.
  let best: { name: string; streak: number; unit: StreakResult["unit"] } | null = null;
  for (const h of habits) {
    const s = computeStreak(h, logsByHabit[h.id] ?? {}, today);
    if (s.current > 0 && (!best || s.current > best.streak)) best = { name: h.name, streak: s.current, unit: s.unit };
  }

  // Week strip.
  const week = weekDates(date);
  const weekCells = week.map((d) => ({ d, ...dayCompletion(habits, logsByHabit, d, today) }));

  // Household members' progress for the same day.
  const householdProfiles = await getProfilesInHousehold(session.householdId);
  const family: FamilyMember[] = await Promise.all(
    householdProfiles.map(async (p) => {
      if (p.id === profileId) {
        return {
          id: p.id,
          name: p.name,
          done: habitDay.done,
          due: habitDay.due,
          bestStreak: best?.streak ?? 0,
          bestStreakName: best?.name ?? null,
        };
      }
      const [theirHabits, theirLogs] = await Promise.all([
        getHabits(p.id),
        getHabitLogsInRange(p.id, "0000-01-01", "9999-12-31"),
      ]);
      const c = dayCompletion(theirHabits, theirLogs, date, today);
      let top: { name: string; streak: number } | null = null;
      for (const h of theirHabits) {
        const s = computeStreak(h, theirLogs[h.id] ?? {}, today).current;
        if (s > 0 && (!top || s > top.streak)) top = { name: h.name, streak: s };
      }
      return {
        id: p.id,
        name: p.name,
        done: c.done,
        due: c.due,
        bestStreak: top?.streak ?? 0,
        bestStreakName: top?.name ?? null,
      };
    })
  );

  const isToday = date === today;
  const dateLabel = parseIso(date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const empty = habits.length === 0 && tasks.length === 0;

  return (
    <div className="flex flex-col gap-5 md:mx-auto md:max-w-3xl">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-h-muted">{dateLabel}</p>
        <h1 className="text-2xl font-extrabold tracking-tight">
          {isToday ? `${greeting(new Date().getHours())}, ${profile?.name ?? ""}` : `${profile?.name ?? ""}'s day`}
        </h1>
      </div>

      {/* Week strip */}
      <div className="h-card p-3">
        <div className="mb-2 flex items-center justify-between">
          <Link
            href={`/habits?date=${addDays(date, -7)}`}
            aria-label="Previous week"
            className="flex h-8 w-8 items-center justify-center rounded-full text-h-muted hover:bg-h-surface2"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          {!isToday ? (
            <Link href="/habits" className="rounded-full bg-h-brand-soft px-3 py-1 text-xs font-bold text-h-brand">
              Back to today
            </Link>
          ) : (
            <span className="text-xs font-bold text-h-muted">This week</span>
          )}
          <Link
            href={`/habits?date=${addDays(date, 7)}`}
            aria-label="Next week"
            className="flex h-8 w-8 items-center justify-center rounded-full text-h-muted hover:bg-h-surface2"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weekCells.map(({ d, done: dd, due: du }) => {
            const selected = d === date;
            const dayPct = du === 0 ? 0 : (dd / du) * 100;
            const dt = parseIso(d);
            return (
              <Link
                key={d}
                href={d === today ? "/habits" : `/habits?date=${d}`}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl py-1.5 transition-colors",
                  selected ? "bg-h-brand text-h-brand-fg" : "hover:bg-h-surface2"
                )}
              >
                <span className={cn("text-[10px] font-bold uppercase", selected ? "opacity-80" : "text-h-muted")}>
                  {WEEKDAY_SHORT[dt.getDay()]}
                </span>
                <Ring
                  pct={d > today ? 0 : dayPct}
                  size={30}
                  stroke={3.5}
                  color={selected ? "var(--h-brand-fg)" : dayPct >= 100 ? "var(--h-good)" : "var(--h-brand)"}
                  track={selected ? "rgb(255 255 255 / 0.25)" : "var(--h-surface-2)"}
                >
                  <span className="text-[11px] font-extrabold">{dt.getDate()}</span>
                </Ring>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      {!empty && (
        <div className="h-card flex items-center gap-4 bg-gradient-to-br from-h-brand-soft/70 to-h-surface p-4">
          <Ring pct={pct} size={88} stroke={9}>
            <div className="text-center">
              <p className="text-xl font-extrabold leading-none tabular-nums">{pct}%</p>
            </div>
          </Ring>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold">
              {due === 0
                ? "Nothing scheduled"
                : done >= due
                  ? "All done!"
                  : `${due - done} left ${isToday ? "today" : "that day"}`}
            </p>
            <p className="text-xs text-h-muted">
              {done} of {due} completed
              {boardTasks.length > 0 && ` · ${boardTasks.length} task${boardTasks.length === 1 ? "" : "s"}`}
            </p>
            {best && (
              <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-h-break-soft px-2.5 py-1 text-[11px] font-bold text-h-break">
                <Flame className="h-3 w-3" />
                {best.streak}-{best.unit} streak · {best.name}
              </p>
            )}
          </div>
        </div>
      )}

      {goalsData && <GoalsFocus views={goalsData.views} />}

      {empty ? (
        readOnly ? (
          <p className="h-card p-6 text-center text-sm text-h-muted">
            {profile?.name} hasn&apos;t set up any habits yet.
          </p>
        ) : (
          <StarterPackCard />
        )
      ) : (
        <TodayBoard
          key={`${profileId}-${date}`}
          date={date}
          today={today}
          readOnly={readOnly}
          habits={boardHabits}
          tasks={boardTasks}
        />
      )}

      {milestoneRows.length > 0 && <TodayMilestones items={milestoneRows} canEdit={!readOnly} />}

      <FamilyStrip members={family} activeId={profileId} />
    </div>
  );
}
