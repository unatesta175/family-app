"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertOwnProfile, getOwnProfileId } from "@/lib/auth";
import { todayIso } from "@/lib/date";
import { HABIT_KINDS, HABIT_SCHEDULES, TASK_PRIORITIES, TASK_RECURRENCES } from "@/lib/db/schema";
import { HABIT_COLOR_KEYS, serializeWeekdays } from "@/lib/habits";
import { HABIT_ICON_KEYS } from "@/lib/habit-icons";
import {
  applyStarterPack,
  clearHabitLog,
  createCategory,
  createHabit,
  createTask,
  deleteCategory,
  deleteHabit,
  deleteTask,
  getAllLogsForHabit,
  getCategory,
  getHabit,
  getTask,
  setHabitArchived,
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
  status: z.enum(["done", "slipped", "skipped", "clear"]),
  value: z.number().int().min(0).max(100_000).optional(),
});

/** Set (or clear) a habit's entry for one date. Counter habits pass `value` for partial progress. */
export async function logHabitAction(input: z.input<typeof logSchema>) {
  const parsed = logSchema.parse(input);
  const habit = await ownHabit(parsed.habitId);
  if (parsed.date > todayIso()) throw new Error("You can't log a future date.");

  if (parsed.status === "clear" || (parsed.status === "done" && parsed.value === 0)) {
    await clearHabitLog(habit.id, parsed.date);
  } else if (parsed.status === "done") {
    await upsertHabitLog(habit.id, parsed.date, "done", parsed.value ?? habit.dailyTarget);
  } else {
    await upsertHabitLog(habit.id, parsed.date, parsed.status, 0);
  }
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
    await upsertHabitLog(habit.id, parsed.date, existing.status, existing.value, parsed.note.trim() || null);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// --- Habits ----------------------------------------------------------------------------------

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
    weeklyTarget: z.number().int().min(1).max(7),
    dailyTarget: z.number().int().min(1).max(1000),
    unit: z.string().trim().max(20).optional().nullable(),
    startDate: isoDateSchema,
  })
  .refine((v) => v.schedule !== "weekdays" || v.weekdays.length > 0, {
    message: "Pick at least one day of the week.",
    path: ["weekdays"],
  });

export type HabitFormInput = z.input<typeof habitSchema>;

async function habitInput(raw: HabitFormInput, profileId: number) {
  const v = habitSchema.parse(raw);
  if (v.categoryId !== null) {
    const cat = await getCategory(v.categoryId);
    if (!cat || cat.profileId !== profileId) throw new Error("Unknown category.");
  }
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
    dailyTarget: v.dailyTarget,
    unit: v.unit?.trim() || null,
    startDate: v.startDate,
  };
}

export async function createHabitAction(raw: HabitFormInput): Promise<ActionResult<{ id: number }>> {
  try {
    const profileId = await requireOwnProfileId();
    const habit = await createHabit(profileId, await habitInput(raw, profileId));
    refresh();
    return { ok: true, data: { id: habit.id } };
  } catch (err) {
    return fail(err);
  }
}

export async function updateHabitAction(id: number, raw: HabitFormInput): Promise<ActionResult> {
  try {
    const habit = await ownHabit(id);
    await updateHabit(id, await habitInput(raw, habit.profileId));
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
    title: z.string().trim().min(1, "Give the task a title.").max(120),
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
