import "server-only";
import { requireAuth, getOwnProfileId } from "@/lib/auth";
import { getProfilesInHousehold } from "@/lib/db/repo";
import { getAllLogsForHabit } from "@/lib/db/repo-habits";
import {
  getGoalsByProfiles,
  getHabitsByIds,
  getLinks,
  getMilestones,
  getProgress,
  type GoalRow,
  type MilestoneRow,
  type ProgressRow,
} from "@/lib/db/repo-goals";
import { todayIso } from "@/lib/date";
import { computeStreak, isComplete } from "@/lib/habits";
import {
  activityDates,
  effortStreakWeeks,
  forecast,
  goalProgressOf,
  lastActivity,
  nudgesFor,
  type Forecast,
  type GoalMetrics,
  type GoalProgressInfo,
  type Nudge,
} from "@/lib/goals";

export type LinkedHabit = {
  habitId: number;
  name: string;
  icon: string;
  color: string;
  ownerId: number;
  ownerName: string;
  mine: boolean;
  streak: number;
  checkins: number;
};

export type Contribution = { profileId: number; name: string; mine: boolean; amount: number; checkins: number };

export type GoalView = {
  goal: GoalRow;
  ownerName: string;
  mine: boolean;
  milestones: MilestoneRow[];
  progress: (ProgressRow & { who: string })[];
  habits: LinkedHabit[];
  info: GoalProgressInfo;
  forecast: Forecast;
  activity: string[];
  lastActivity: string | null;
  effortWeeks: number;
  nudges: Nudge[];
  /** Per-person totals, for goals shared with the family. */
  contributions: Contribution[];
};

export type GoalsData = {
  today: string;
  viewerId: number;
  household: { id: number; name: string }[];
  views: GoalView[];
};

/** Streak in days, whatever unit the habit's streak is measured in. */
const UNIT_DAYS = { day: 1, week: 7, month: 30, year: 365 } as const;

/**
 * Every goal the signed-in user can see (their own, plus goals family members have shared), each with
 * its progress, forecast, linked habits, activity and nudges worked out.
 */
export async function loadGoalsData(): Promise<GoalsData> {
  const session = await requireAuth();
  const viewerId = await getOwnProfileId();
  const profiles = await getProfilesInHousehold(session.householdId);
  const names = new Map(profiles.map((p) => [p.id, p.name]));
  const today = todayIso();
  if (viewerId === null) return { today, viewerId: -1, household: [], views: [] };

  const all = await getGoalsByProfiles(profiles.map((p) => p.id));
  const visible = all.filter((g) => g.profileId === viewerId || g.visibility === "shared");
  const ids = visible.map((g) => g.id);

  const [milestones, progress, links] = await Promise.all([getMilestones(ids), getProgress(ids), getLinks(ids)]);
  const habitRows = await getHabitsByIds([...new Set(links.map((l) => l.habitId))]);
  const habitById = new Map(habitRows.map((h) => [h.id, h]));
  const logsByHabit = new Map(await Promise.all(habitRows.map(async (h) => [h.id, await getAllLogsForHabit(h.id)] as const)));

  const views: GoalView[] = visible.map((goal) => {
    const ms = milestones.filter((m) => m.goalId === goal.id);
    const pr = progress.filter((p) => p.goalId === goal.id).map((p) => ({ ...p, who: names.get(p.profileId) ?? "Someone" }));

    const linked: LinkedHabit[] = [];
    const habitDates: string[] = [];
    let checkinsTotal = 0;
    let bestStreak = 0;
    for (const link of links.filter((l) => l.goalId === goal.id)) {
      const habit = habitById.get(link.habitId);
      if (!habit) continue;
      const logs = logsByHabit.get(habit.id) ?? {};
      let checkins = 0;
      for (const [date, log] of Object.entries(logs)) {
        if (date >= goal.startDate && isComplete(habit, log)) {
          checkins += 1;
          habitDates.push(date);
        }
      }
      const s = computeStreak(habit, logs, today);
      const days = s.current * UNIT_DAYS[s.unit];
      checkinsTotal += checkins;
      bestStreak = Math.max(bestStreak, days);
      linked.push({
        habitId: habit.id,
        name: habit.name,
        icon: habit.icon,
        color: habit.color,
        ownerId: habit.profileId,
        ownerName: names.get(habit.profileId) ?? "Someone",
        mine: habit.profileId === viewerId,
        streak: days,
        checkins,
      });
    }

    const metrics: GoalMetrics = {
      milestones: ms.map((m) => ({ id: m.id, title: m.title, dueDate: m.dueDate, doneAt: m.doneAt })),
      progress: pr.map((p) => ({ value: p.value, date: p.date, profileId: p.profileId })),
      habitCheckins: checkinsTotal,
      habitStreak: bestStreak,
      habitDates,
    };
    const info = goalProgressOf(goal, metrics);
    const activity = activityDates(metrics);

    // Who contributed what (only interesting for goals shared with the family).
    const people = new Map<number, Contribution>();
    const person = (id: number): Contribution => {
      let c = people.get(id);
      if (!c) {
        c = { profileId: id, name: names.get(id) ?? "Someone", mine: id === viewerId, amount: 0, checkins: 0 };
        people.set(id, c);
      }
      return c;
    };
    for (const p of pr) person(p.profileId).amount += p.value;
    for (const l of linked) person(l.ownerId).checkins += l.checkins;

    return {
      goal,
      ownerName: names.get(goal.profileId) ?? "Someone",
      mine: goal.profileId === viewerId,
      milestones: ms,
      progress: pr,
      habits: linked,
      info,
      forecast: forecast(goal, info.pct, today),
      activity,
      lastActivity: lastActivity(activity),
      effortWeeks: effortStreakWeeks(activity, today),
      nudges: goal.profileId === viewerId ? nudgesFor(goal, info, metrics, today) : [],
      contributions: [...people.values()].sort((a, b) => b.amount + b.checkins - (a.amount + a.checkins)),
    };
  });

  return { today, viewerId, household: profiles.map((p) => ({ id: p.id, name: p.name })), views };
}

/** Goals a habit can be pointed at: your own open goals, plus goals family members have shared. */
export async function loadSelectableGoals(): Promise<{ id: number; title: string }[]> {
  const session = await requireAuth();
  const viewerId = await getOwnProfileId();
  if (viewerId === null) return [];
  const profiles = await getProfilesInHousehold(session.householdId);
  const all = await getGoalsByProfiles(profiles.map((p) => p.id));
  return all
    .filter((g) => (g.profileId === viewerId || g.visibility === "shared") && ["active", "idea", "paused"].includes(g.status))
    .map((g) => ({ id: g.id, title: g.title }));
}
