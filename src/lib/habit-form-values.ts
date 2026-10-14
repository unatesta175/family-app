import { todayIso } from "@/lib/date";
import {
  parseChecklist,
  parseGoals,
  parseMonthDays,
  parseWeekdays,
  parseYearDays,
  type ChecklistItem,
  type HabitGoal,
} from "@/lib/habits";
import type { HabitEvalType, HabitKind, HabitSchedule, PeriodUnit, TargetOp } from "@/lib/db/schema";

/** Everything the habit form edits. Plain data, so server pages can hand it to the client form. */
export type HabitFormValues = {
  id?: number;
  name: string;
  description: string | null;
  categoryId: number | null;
  kind: HabitKind;
  icon: string;
  color: string;

  // How a day is evaluated.
  evalType: HabitEvalType;
  targetOp: TargetOp;
  /** Amount for numeric habits, seconds for timers. */
  dailyTarget: number;
  unit: string | null;
  checklist: ChecklistItem[];
  goals: HabitGoal[];

  // How often.
  schedule: HabitSchedule;
  weekdays: number[];
  monthDays: number[];
  yearDays: string[]; // "MM-DD"
  periodUnit: PeriodUnit;
  weeklyTarget: number; // days per period for "some days per period"
  repeatEvery: number;
  alternate: boolean;
  flexible: boolean;

  startDate: string;
  endDate: string | null;
  /** 1 is the highest priority; 0 means none. */
  priority: number;
  /** The life goal (Goals module) this habit contributes to, if any. */
  goalId: number | null;
  /** Kept off every household-visible surface: only its own owner sees its name, logs or progress. */
  private: boolean;
  /** Hidden from the owner's own display until revealed via the header eye toggle. */
  hidden: boolean;
};

export function emptyHabit(): HabitFormValues {
  return {
    name: "",
    description: null,
    categoryId: null,
    kind: "build",
    icon: "target",
    color: "indigo",
    evalType: "yes_no",
    targetOp: "at_least",
    dailyTarget: 1,
    unit: null,
    checklist: [],
    goals: [],
    schedule: "daily",
    weekdays: [1, 2, 3, 4, 5],
    monthDays: [],
    yearDays: [],
    periodUnit: "week",
    weeklyTarget: 3,
    repeatEvery: 2,
    alternate: false,
    flexible: false,
    startDate: todayIso(),
    endDate: null,
    priority: 0,
    goalId: null,
    private: false,
    hidden: false,
  };
}

/** A blank habit pre-set to a timer (so it can be credited from a Focus session), e.g. when creating
 * one on the go from the Focus module's "Focusing on" picker. Matches `quickCreateTimerHabitAction`'s
 * defaults (25 min / daily) so the two creation paths produce the same kind of habit. */
export function emptyTimerHabit(): HabitFormValues {
  return { ...emptyHabit(), evalType: "timer", dailyTarget: 1500 };
}

/** The columns of a habit row that the form edits (a structural subset of the DB row). */
export type HabitFormSource = {
  id: number;
  name: string;
  description: string | null;
  categoryId: number | null;
  kind: HabitKind;
  icon: string;
  color: string;
  evalType: HabitEvalType;
  targetOp: TargetOp;
  dailyTarget: number;
  unit: string | null;
  checklist: string;
  goals: string;
  schedule: HabitSchedule;
  weekdays: string;
  monthDays: string;
  yearDays: string;
  periodUnit: PeriodUnit;
  weeklyTarget: number;
  repeatEvery: number;
  alternate: boolean;
  flexible: boolean;
  startDate: string;
  endDate: string | null;
  priority: number;
  private: boolean;
  hidden: boolean;
};

export function habitToFormValues(h: HabitFormSource, goalId: number | null = null): HabitFormValues {
  return {
    id: h.id,
    name: h.name,
    description: h.description,
    categoryId: h.categoryId,
    kind: h.kind,
    icon: h.icon,
    color: h.color,
    evalType: h.evalType,
    targetOp: h.targetOp,
    dailyTarget: h.dailyTarget,
    unit: h.unit,
    checklist: parseChecklist(h.checklist),
    goals: parseGoals(h.goals),
    schedule: h.schedule,
    weekdays: parseWeekdays(h.weekdays),
    monthDays: parseMonthDays(h.monthDays),
    yearDays: parseYearDays(h.yearDays),
    periodUnit: h.periodUnit,
    weeklyTarget: h.weeklyTarget,
    repeatEvery: h.repeatEvery,
    alternate: h.alternate,
    flexible: h.flexible,
    startDate: h.startDate,
    endDate: h.endDate,
    priority: h.priority,
    goalId,
    private: h.private,
    hidden: h.hidden,
  };
}
