"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertOwnProfile, getOwnProfileId, requireAuth } from "@/lib/auth";
import { getProfilesInHousehold } from "@/lib/db/repo";
import { addDays, todayIso } from "@/lib/date";
import {
  GOAL_PERIODS,
  HABIT_EVAL_TYPES,
  HABIT_KINDS,
  HABIT_SCHEDULES,
  PERIOD_UNITS,
  TARGET_OPS,
  TASK_PRIORITIES,
  TASK_RECURRENCES,
} from "@/lib/db/schema";
import {
  HABIT_COLOR_KEYS,
  PERIOD_MAX,
  parseChecklist,
  serializeMonthDays,
  serializeWeekdays,
  serializeYearDays,
  startDateFor,
} from "@/lib/habits";
import { HABIT_ICON_KEYS } from "@/lib/habit-icons";
import {
  applyStarterPack,
  clearHabitLog,
  clearHabitLogsInRange,
  createCategory,
  createHabit,
  createTask,
  deleteCategory,
  deleteHabit,
  deleteTask,
  getAllLogsForHabit,
  getCategories,
  getCategory,
  getHabits,
  getHabit,
  getTask,
  setHabitArchived,
  setHabitStartDate,
  setRecurringTaskDone,
  setSingleTaskCompleted,
  updateCategory,
  updateHabit,
  updateTask,
  upsertHabitLog,
} from "@/lib/db/repo-habits";

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

const MAX_BACKFILL_DAYS = 730;

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const colorSchema = z.enum(HABIT_COLOR_KEYS as [string, ...string[]]);
const iconSchema = z.enum(HABIT_ICON_KEYS as [string, ...string[]]);

function refresh() {
  revalidatePath("/habits", "layout");
}

async function ownHabit(habitId: number) {
  const habit = await getHabit(habitId);
  if (!habit) throw new Error("Habit not found.");
  await assertOwnProfile(habit.profileId);
  return habit;
}

async function ownTask(taskId: number) {
  const task = await getTask(taskId);
  if (!task) throw new Error("Task not found.");
  await assertOwnProfile(task.profileId);
  return task;
}

async function requireOwnProfileId(): Promise<number> {
  const id = await getOwnProfileId();
  if (id === null) throw new Error("No profile for this account.");
  return id;
}

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message ?? "Invalid input." };
  if (err instanceof Error && /UNIQUE/i.test(err.message)) {
    return { ok: false, error: "You already have a category with that name." };
  }
  return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
}

// --- Logging ---------------------------------------------------------------------------------

const logSchema = z.object({
  habitId: z.number().int().positive(),
  date: isoDateSchema,
  status: z.enum(["done", "slipped", "skipped", "missed", "clear"]),
  value: z.number().min(0).max(1_000_000_000).optional(),
  checked: z.array(z.string().max(40)).max(50).optional(),
});

/**
 * Set (or clear) a habit's entry for one date. Numeric/timer habits pass `value` (an amount / seconds),
 * checklist habits pass the ids of the ticked items in `checked`.
 */
export async function logHabitAction(input: z.input<typeof logSchema>) {
  const parsed = logSchema.parse(input);
  const habit = await ownHabit(parsed.habitId);
  if (parsed.date > todayIso()) throw new Error("You can't log a future date.");

  // An entry before the habit's start date pulls the start back to that day, so the day (and every day
  // after it) counts towards streaks, rates and the calendar.
  if (parsed.status !== "clear" && parsed.date < habit.startDate) {
    if (parsed.date < addDays(todayIso(), -MAX_BACKFILL_DAYS)) {
      throw new Error("You can only log up to two years back.");
    }
    await setHabitStartDate(habit.id, startDateFor(habit, parsed.date));
  }

  if (parsed.status === "clear") {
    await clearHabitLog(habit.id, parsed.date);
  } else if (parsed.status === "done") {
    if (habit.kind === "break" || habit.evalType === "yes_no") {
      await upsertHabitLog(habit.id, parsed.date, "done", 1);
    } else if (habit.evalType === "checklist") {
      const valid = new Set(parseChecklist(habit.checklist).map((i) => i.id));
      const checked = [...new Set(parsed.checked ?? [])].filter((id) => valid.has(id));
      if (checked.length === 0) await clearHabitLog(habit.id, parsed.date);
      else await upsertHabitLog(habit.id, parsed.date, "done", checked.length, undefined, checked);
    } else {
      const raw = parsed.value ?? habit.dailyTarget;
      const value = habit.evalType === "timer" ? Math.round(raw) : Math.round(raw * 100) / 100;
      // Zero means "nothing logged" — except for "less than" goals, where 0 is a perfect day.
      if (value === 0 && habit.targetOp !== "at_most") await clearHabitLog(habit.id, parsed.date);
      else await upsertHabitLog(habit.id, parsed.date, "done", value);
    }
  } else {
    await upsertHabitLog(habit.id, parsed.date, parsed.status, 0);
  }
  refresh();
}

/** Wipes a habit's entries between two dates (inclusive) — used by "Reset progress" on Today / Week. */
export async function resetHabitProgressAction(input: { habitId: number; from: string; to: string }) {
  const parsed = z.object({ habitId: z.number().int().positive(), from: isoDateSchema, to: isoDateSchema }).parse(input);
  if (parsed.from > parsed.to) throw new Error("Invalid date range.");
  const habit = await ownHabit(parsed.habitId);
  await clearHabitLogsInRange(habit.id, parsed.from, parsed.to);
  refresh();
}

export async function saveHabitNoteAction(input: { habitId: number; date: string; note: string }): Promise<ActionResult> {
  try {
    const parsed = z
      .object({ habitId: z.number().int().positive(), date: isoDateSchema, note: z.string().max(500) })
      .parse(input);
    const habit = await ownHabit(parsed.habitId);
    const existing = (await getAllLogsForHabit(habit.id))[parsed.date];
    if (!existing) return { ok: false, error: "Log the habit for that day first, then add a note." };
    await upsertHabitLog(
      habit.id,
      parsed.date,
      existing.status,
      existing.value,
      parsed.note.trim() || null,
      existing.checked ?? null
    );
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// --- Habits ----------------------------------------------------------------------------------

const goalSchema = z.object({
  period: z.enum(GOAL_PERIODS),
  op: z.enum(["at_least", "at_most", "exactly"]),
  value: z.number().positive("Goals need a value above zero.").max(1_000_000_000),
});

const checklistItemSchema = z.object({
  id: z.string().min(1).max(40),
  title: z.string().trim().min(1, "Checklist items can't be empty.").max(80),
});

const habitSchema = z
  .object({
    name: z.string().trim().min(1, "Give the habit a name.").max(60),
    description: z.string().trim().max(200).optional().nullable(),
    categoryId: z.number().int().positive().nullable(),
    kind: z.enum(HABIT_KINDS),
    icon: iconSchema,
    color: colorSchema,
    schedule: z.enum(HABIT_SCHEDULES),
    weekdays: z.array(z.number().int().min(0).max(6)),
    weeklyTarget: z.number().int().min(1).max(366),
    // Amount (numeric), seconds (timer); ignored for yes/no and checklist habits.
    dailyTarget: z.number().min(0).max(1_000_000_000),
    unit: z.string().trim().max(20).optional().nullable(),
    startDate: isoDateSchema,
    endDate: isoDateSchema.nullable().optional(),
    evalType: z.enum(HABIT_EVAL_TYPES).default("yes_no"),
    targetOp: z.enum(TARGET_OPS).default("at_least"),
    checklist: z.array(checklistItemSchema).max(30).default([]),
    goals: z.array(goalSchema).max(5).default([]),
    flexible: z.boolean().default(false),
    repeatEvery: z.number().int().min(1).max(365).default(1),
    alternate: z.boolean().default(false),
    monthDays: z.array(z.number().int().min(1).max(31)).default([]),
    yearDays: z.array(z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/)).default([]),
    periodUnit: z.enum(PERIOD_UNITS).default("week"),
    priority: z.number().int().min(0).max(99).nullable().optional(),
    // Also add the habit for everyone else in the family circle (household).
    forEveryone: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    const issue = (message: string, path: string) => ctx.addIssue({ code: "custom", message, path: [path] });
    if (v.schedule === "weekdays" && v.weekdays.length === 0) issue("Pick at least one day of the week.", "weekdays");
    if (v.schedule === "month_days" && v.monthDays.length === 0) issue("Pick at least one day of the month.", "monthDays");
    if (v.schedule === "year_days" && v.yearDays.length === 0) issue("Add at least one date.", "yearDays");
    if (v.schedule === "weekly_count" && v.weeklyTarget > PERIOD_MAX[v.periodUnit]) {
      issue(`There aren't ${v.weeklyTarget} days in a ${v.periodUnit}.`, "weeklyTarget");
    }
    if (v.endDate && v.endDate < v.startDate) issue("The end date can't be before the start date.", "endDate");
    if (v.kind === "build" && (v.evalType === "numeric" || v.evalType === "timer")) {
      if (v.targetOp !== "any" && v.dailyTarget <= 0) issue("Set a goal above zero.", "dailyTarget");
    }
    if (v.kind === "build" && v.evalType === "checklist" && v.checklist.length === 0) {
      issue("Add at least one checklist item.", "checklist");
    }
    if (new Set(v.goals.map((g) => g.period)).size !== v.goals.length) issue("Each extra goal can only be added once.", "goals");
  });

export type HabitFormInput = z.input<typeof habitSchema>;

async function habitInput(raw: HabitFormInput, profileId: number) {
  const v = habitSchema.parse(raw);
  if (v.categoryId !== null) {
    const cat = await getCategory(v.categoryId);
    if (!cat || cat.profileId !== profileId) throw new Error("Unknown category.");
  }

  // Break habits are always a plain clean/slipped check-in.
  const evalType = v.kind === "break" ? "yes_no" : v.evalType;
  const measured = evalType === "numeric" || evalType === "timer";
  const checklist = evalType === "checklist" ? v.checklist.map((i) => ({ id: i.id, title: i.title })) : [];
  const targetOp = measured ? v.targetOp : "at_least";
  const dailyTarget =
    evalType === "checklist"
      ? checklist.length
      : measured
        ? evalType === "timer"
          ? Math.round(v.dailyTarget)
          : Math.round(v.dailyTarget * 100) / 100
        : 1;
  const repeating = v.schedule === "repeat";

  return {
    name: v.name,
    description: v.description?.trim() || null,
    categoryId: v.categoryId,
    kind: v.kind,
    icon: v.icon,
    color: v.color,
    schedule: v.schedule,
    weekdays: v.schedule === "weekdays" ? serializeWeekdays(v.weekdays) : "0,1,2,3,4,5,6",
    weeklyTarget: v.weeklyTarget,
    dailyTarget,
    unit: evalType === "numeric" ? v.unit?.trim() || null : null,
    startDate: v.startDate,
    endDate: v.endDate || null,
    evalType,
    targetOp,
    // "Flexible" only makes sense where an occurrence lands on specific days.
    flexible: v.flexible && ["weekdays", "month_days", "year_days", "repeat"].includes(v.schedule),
    repeatEvery: repeating ? v.repeatEvery : 1,
    alternate: repeating && v.alternate,
    monthDays: v.schedule === "month_days" ? serializeMonthDays(v.monthDays) : "",
    yearDays: v.schedule === "year_days" ? serializeYearDays(v.yearDays) : "",
    periodUnit: v.periodUnit,
    priority: v.priority ?? 0,
    checklist: JSON.stringify(checklist),
    goals: JSON.stringify(measured ? v.goals : []),
  };
}

/**
 * Adds a copy of a habit to every other member of the caller's household who doesn't already have a
 * habit with the same name (archived ones count, so nothing is duplicated). Categories are matched by
 * name and created for the member when missing. Returns how many members got a new habit.
 */
async function shareWithCircle(ownerProfileId: number, input: Awaited<ReturnType<typeof habitInput>>): Promise<number> {
  const session = await requireAuth();
  const others = (await getProfilesInHousehold(session.householdId)).filter((p) => p.id !== ownerProfileId);
  const ownCategory = input.categoryId !== null ? await getCategory(input.categoryId) : null;
  const wanted = input.name.trim().toLowerCase();

  let shared = 0;
  for (const member of others) {
    const theirs = await getHabits(member.id, { includeArchived: true });
    if (theirs.some((h) => h.name.trim().toLowerCase() === wanted)) continue;

    let categoryId: number | null = null;
    if (ownCategory) {
      const cats = await getCategories(member.id);
      const found = cats.find((c) => c.name.toLowerCase() === ownCategory.name.toLowerCase());
      categoryId = found
        ? found.id
        : (await createCategory(member.id, { name: ownCategory.name, color: ownCategory.color, icon: ownCategory.icon })).id;
    }
    await createHabit(member.id, { ...input, categoryId });
    shared += 1;
  }
  return shared;
}

export async function createHabitAction(raw: HabitFormInput): Promise<ActionResult<{ id: number; shared: number }>> {
  try {
    const profileId = await requireOwnProfileId();
    const input = await habitInput(raw, profileId);
    const habit = await createHabit(profileId, input);
    const shared = raw.forEveryone ? await shareWithCircle(profileId, input) : 0;
    refresh();
    return { ok: true, data: { id: habit.id, shared } };
  } catch (err) {
    return fail(err);
  }
}

export async function updateHabitAction(id: number, raw: HabitFormInput): Promise<ActionResult> {
  try {
    const habit = await ownHabit(id);
    const input = await habitInput(raw, habit.profileId);
    await updateHabit(id, input);
    if (raw.forEveryone) await shareWithCircle(habit.profileId, input);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function archiveHabitAction(id: number, archived: boolean) {
  await ownHabit(id);
  await setHabitArchived(id, archived);
  refresh();
}

export async function deleteHabitAction(id: number) {
  await ownHabit(id);
  await deleteHabit(id);
  refresh();
}

export async function applyStarterPackAction(): Promise<ActionResult<{ added: number }>> {
  try {
    const profileId = await requireOwnProfileId();
    const added = await applyStarterPack(profileId);
    refresh();
    return { ok: true, data: { added } };
  } catch (err) {
    return fail(err);
  }
}

// --- Categories ------------------------------------------------------------------------------

const categorySchema = z.object({
  name: z.string().trim().min(1, "Give the category a name.").max(40),
  color: colorSchema,
  icon: iconSchema,
});

export type CategoryFormInput = z.input<typeof categorySchema>;

export async function createCategoryAction(
  raw: CategoryFormInput
): Promise<ActionResult<{ id: number; name: string; color: string; icon: string }>> {
  try {
    const profileId = await requireOwnProfileId();
    const cat = await createCategory(profileId, categorySchema.parse(raw));
    refresh();
    return { ok: true, data: { id: cat.id, name: cat.name, color: cat.color, icon: cat.icon } };
  } catch (err) {
    return fail(err);
  }
}

export async function updateCategoryAction(id: number, raw: CategoryFormInput): Promise<ActionResult> {
  try {
    const cat = await getCategory(id);
    if (!cat) throw new Error("Category not found.");
    await assertOwnProfile(cat.profileId);
    await updateCategory(id, categorySchema.parse(raw));
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteCategoryAction(id: number) {
  const cat = await getCategory(id);
  if (!cat) return;
  await assertOwnProfile(cat.profileId);
  await deleteCategory(id);
  refresh();
}

// --- Tasks -----------------------------------------------------------------------------------

const taskSchema = z
  .object({
    title: z.string().trim().min(1, "Give the task a title.").max(500),
    notes: z.string().trim().max(500).optional().nullable(),
    categoryId: z.number().int().positive().nullable(),
    priority: z.enum(TASK_PRIORITIES),
    recurrence: z.enum(TASK_RECURRENCES),
    weekdays: z.array(z.number().int().min(0).max(6)),
    dueDate: isoDateSchema.nullable(),
  })
  .refine((v) => v.recurrence === "none" || v.dueDate !== null, {
    message: "Recurring tasks need a start date.",
    path: ["dueDate"],
  })
  .refine((v) => v.recurrence !== "weekly" || v.weekdays.length > 0, {
    message: "Pick at least one day of the week.",
    path: ["weekdays"],
  });

export type TaskFormInput = z.input<typeof taskSchema>;

async function taskInput(raw: TaskFormInput, profileId: number) {
  const v = taskSchema.parse(raw);
  if (v.categoryId !== null) {
    const cat = await getCategory(v.categoryId);
    if (!cat || cat.profileId !== profileId) throw new Error("Unknown category.");
  }
  return {
    title: v.title,
    notes: v.notes?.trim() || null,
    categoryId: v.categoryId,
    priority: v.priority,
    recurrence: v.recurrence,
    weekdays: v.recurrence === "weekly" ? serializeWeekdays(v.weekdays) : "",
    dueDate: v.dueDate,
  };
}

export async function createTaskAction(raw: TaskFormInput): Promise<ActionResult> {
  try {
    const profileId = await requireOwnProfileId();
    await createTask(profileId, await taskInput(raw, profileId));
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function updateTaskAction(id: number, raw: TaskFormInput): Promise<ActionResult> {
  try {
    const task = await ownTask(id);
    await updateTask(id, await taskInput(raw, task.profileId));
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteTaskAction(id: number) {
  await ownTask(id);
  await deleteTask(id);
  refresh();
}

/** Tick/untick a task for `date`. Single tasks store completion on the task; recurring ones per date. */
export async function toggleTaskAction(input: { taskId: number; date: string; done: boolean }) {
  const parsed = z
    .object({ taskId: z.number().int().positive(), date: isoDateSchema, done: z.boolean() })
    .parse(input);
  const task = await ownTask(parsed.taskId);
  if (task.recurrence === "none") {
    await setSingleTaskCompleted(task.id, parsed.done ? parsed.date : null);
  } else {
    await setRecurringTaskDone(task.id, parsed.date, parsed.done);
  }
  refresh();
}
