import {
  GOAL_PERIOD_LABEL,
  carriedFromDate,
  computeStreak,
  dayState,
  formatAmount,
  goalProgress,
  isPeriodHabit,
  parseChecklist,
  parseGoals,
  periodDoneCount,
  priorityRank,
  recurrenceLabel,
  recurringTaskOccursOn,
  scheduleLabel,
  targetLabel,
  type DayState,
  type HabitLogMap,
} from "@/lib/habits";
import type { CategoryRow, HabitRow, TaskRow } from "@/lib/db/repo-habits";
import type { HabitEvalType, HabitKind, HabitSchedule, PeriodUnit, TargetOp, TaskPriority } from "@/lib/db/schema";

/** Serialisable rows the Today board renders. Built on the server, consumed by a client component. */
export type BoardHabit = {
  id: number;
  name: string;
  kind: HabitKind;
  icon: string;
  color: string;
  categoryName: string | null;
  schedule: HabitSchedule;
  scheduleLabel: string;
  evalType: HabitEvalType;
  targetOp: TargetOp;
  /** Daily goal: amount (numeric), seconds (timer), item count (checklist). */
  dailyTarget: number;
  unit: string | null;
  targetLabel: string | null;
  /** Today's progress: amount, seconds, or number of ticked checklist items. */
  value: number;
  state: DayState;
  streak: number;
  streakUnit: "day" | "week" | "month" | "year";
  periodUnit: PeriodUnit;
  /** "Some days per period" habits: days done this period / needed. */
  periodDone: number;
  periodTarget: number;
  periodMet: boolean;
  checklist: { id: string; title: string; checked: boolean }[];
  goals: BoardGoal[];
  priority: number;
  startDate: string;
  flexible: boolean;
  /** A flexible habit that's still open from an earlier day: the day it was scheduled. */
  carriedFrom: string | null;
  /** The life goal (Goals module) this habit contributes to, if any. */
  lifeGoal: { id: number; title: string; color: string } | null;
  /** An entry exists for this day (a past day with none just looks "missed"). */
  logged: boolean;
};

export type BoardGoal = {
  label: string; // "Weekly"
  current: string; // "12 pages"
  target: string; // "≥ 50 pages"
  pct: number;
  met: boolean;
};

export type BoardTask = {
  id: number;
  title: string;
  notes: string | null;
  priority: TaskPriority;
  categoryName: string | null;
  categoryColor: string | null;
  recurring: boolean;
  recurrenceLabel: string;
  done: boolean;
  /** A recurring task set aside for this one day. */
  skipped: boolean;
  overdue: boolean;
  dueDate: string | null;
};

export function buildBoardHabits(
  habits: HabitRow[],
  categories: CategoryRow[],
  logsByHabit: Record<number, HabitLogMap>,
  date: string,
  today: string,
  goalChips?: Map<number, { goalId: number; title: string; color: string }>
): BoardHabit[] {
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const out: BoardHabit[] = [];

  for (const h of habits) {
    const logs = logsByHabit[h.id] ?? {};
    const state = dayState(h, logs, date, today);
    if (state === "off") continue;
    const log = logs[date];
    const streak = computeStreak(h, logs, today);
    const periodDone = isPeriodHabit(h) ? periodDoneCount(h, logs, date) : 0;
    const checklist = parseChecklist(h.checklist);
    const checkedIds = new Set(log?.status === "done" ? (log.checked ?? []) : []);
    const goals: BoardGoal[] = parseGoals(h.goals).map((g) => {
      const { current, met } = goalProgress(h, logs, g, date);
      const sym = g.op === "at_least" ? "≥" : g.op === "at_most" ? "≤" : "=";
      return {
        label: GOAL_PERIOD_LABEL[g.period],
        current: formatAmount(h, current),
        target: `${sym} ${formatAmount(h, g.value)}`,
        pct: g.value > 0 ? Math.min(100, Math.round((current / g.value) * 100)) : 0,
        met,
      };
    });
    out.push({
      id: h.id,
      name: h.name,
      kind: h.kind,
      icon: h.icon,
      color: h.color,
      categoryName: h.categoryId ? (catName.get(h.categoryId) ?? null) : null,
      schedule: h.schedule,
      scheduleLabel: scheduleLabel(h),
      evalType: h.evalType,
      targetOp: h.targetOp,
      dailyTarget: h.dailyTarget,
      unit: h.unit,
      targetLabel: targetLabel(h),
      value: log?.status === "done" ? log.value : 0,
      state,
      streak: streak.current,
      streakUnit: streak.unit,
      periodUnit: h.periodUnit,
      periodDone,
      periodTarget: h.weeklyTarget,
      periodMet: isPeriodHabit(h) && periodDone >= h.weeklyTarget,
      checklist: checklist.map((i) => ({ id: i.id, title: i.title, checked: checkedIds.has(i.id) })),
      goals,
      priority: h.priority,
      startDate: h.startDate,
      flexible: h.flexible,
      logged: !!log,
      lifeGoal: goalChips?.get(h.id) ? { id: goalChips.get(h.id)!.goalId, title: goalChips.get(h.id)!.title, color: goalChips.get(h.id)!.color } : null,
      carriedFrom: state === "pending" || state === "flex" ? carriedFromDate(h, date) : null,
    });
  }
  // Highest priority first (1 is highest); habits without one keep their usual order after them.
  return out.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
}

export function buildBoardTasks(
  tasks: TaskRow[],
  categories: CategoryRow[],
  completions: Record<number, Set<string>>,
  date: string,
  today: string,
  skips: Record<number, Set<string>> = {}
): BoardTask[] {
  const cats = new Map(categories.map((c) => [c.id, c]));
  const out: BoardTask[] = [];

  for (const t of tasks) {
    let show = false;
    let done = false;
    let skipped = false;
    let overdue = false;

    if (t.recurrence === "none") {
      done = t.completedAt === date;
      if (done) {
        show = true;
      } else if (!t.completedAt) {
        if (t.dueDate === date) show = true;
        else if (date === today && (t.dueDate === null || t.dueDate < today)) {
          show = true;
          overdue = t.dueDate !== null && t.dueDate < today;
        }
      }
    } else if (recurringTaskOccursOn(t, date)) {
      show = true;
      done = completions[t.id]?.has(date) ?? false;
      skipped = !done && (skips[t.id]?.has(date) ?? false);
    }

    if (!show) continue;
    const cat = t.categoryId ? cats.get(t.categoryId) : undefined;
    out.push({
      id: t.id,
      title: t.title,
      notes: t.notes,
      priority: t.priority,
      categoryName: cat?.name ?? null,
      categoryColor: cat?.color ?? null,
      recurring: t.recurrence !== "none",
      recurrenceLabel: recurrenceLabel(t),
      done,
      skipped,
      overdue,
      dueDate: t.dueDate,
    });
  }

  const rank = { high: 0, medium: 1, low: 2 } as const;
  return out.sort((a, b) => Number(a.done || a.skipped) - Number(b.done || b.skipped) || rank[a.priority] - rank[b.priority]);
}
