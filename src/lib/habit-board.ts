import {
  computeStreak,
  dayState,
  isDueOn,
  recurrenceLabel,
  recurringTaskOccursOn,
  scheduleLabel,
  weekDoneCount,
  type DayState,
  type HabitLogMap,
} from "@/lib/habits";
import type { CategoryRow, HabitRow, TaskRow } from "@/lib/db/repo-habits";
import type { HabitKind, HabitSchedule, TaskPriority } from "@/lib/db/schema";

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
  dailyTarget: number;
  unit: string | null;
  value: number;
  state: DayState;
  streak: number;
  streakUnit: "day" | "week";
  weekDone: number;
  weeklyTarget: number;
  weekMet: boolean;
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
  overdue: boolean;
  dueDate: string | null;
};

export function buildBoardHabits(
  habits: HabitRow[],
  categories: CategoryRow[],
  logsByHabit: Record<number, HabitLogMap>,
  date: string,
  today: string
): BoardHabit[] {
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const out: BoardHabit[] = [];

  for (const h of habits) {
    if (!isDueOn(h, date)) continue;
    const logs = logsByHabit[h.id] ?? {};
    const log = logs[date];
    const streak = computeStreak(h, logs, today);
    const weekDone = h.schedule === "weekly_count" ? weekDoneCount(h, logs, date) : 0;
    out.push({
      id: h.id,
      name: h.name,
      kind: h.kind,
      icon: h.icon,
      color: h.color,
      categoryName: h.categoryId ? (catName.get(h.categoryId) ?? null) : null,
      schedule: h.schedule,
      scheduleLabel: scheduleLabel(h),
      dailyTarget: h.dailyTarget,
      unit: h.unit,
      value: log?.status === "done" ? log.value : 0,
      state: dayState(h, log, date, today),
      streak: streak.current,
      streakUnit: streak.unit,
      weekDone,
      weeklyTarget: h.weeklyTarget,
      weekMet: h.schedule === "weekly_count" && weekDone >= h.weeklyTarget,
    });
  }
  return out;
}

export function buildBoardTasks(
  tasks: TaskRow[],
  categories: CategoryRow[],
  completions: Record<number, Set<string>>,
  date: string,
  today: string
): BoardTask[] {
  const cats = new Map(categories.map((c) => [c.id, c]));
  const out: BoardTask[] = [];

  for (const t of tasks) {
    let show = false;
    let done = false;
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
      overdue,
      dueDate: t.dueDate,
    });
  }

  const rank = { high: 0, medium: 1, low: 2 } as const;
  return out.sort((a, b) => Number(a.done) - Number(b.done) || rank[a.priority] - rank[b.priority]);
}
