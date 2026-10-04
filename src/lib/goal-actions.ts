"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertOwnProfile, getOwnProfileId, requireAuth } from "@/lib/auth";
import { getProfilesInHousehold } from "@/lib/db/repo";
import { addDays, todayIso } from "@/lib/date";
import {
  GOAL_HABIT_KINDS,
  GOAL_STATUSES,
  GOAL_TRACKING,
  GOAL_VISIBILITY,
} from "@/lib/db/schema";
import { HABIT_COLOR_KEYS } from "@/lib/habits";
import { HABIT_ICON_KEYS } from "@/lib/habit-icons";
import { GOAL_TEMPLATES } from "@/lib/goals";
import { createHabit, getHabit } from "@/lib/db/repo-habits";
import {
  addMilestone,
  addNote,
  addProgress,
  createGoal,
  deleteGoal,
  deleteMilestone,
  deleteNote,
  deleteProgress,
  deleteReview,
  getGoal,
  getMilestone,
  getNote,
  getProgressEntry,
  linkHabit,
  setGoalPinned,
  setGoalStatus,
  setGoalVisibility,
  setMilestoneDone,
  unlinkHabit,
  updateGoal,
  updateMilestone,
  upsertReview,
  setHabitGoal,
  type GoalRow,
} from "@/lib/db/repo-goals";

export type GoalActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const colorSchema = z.enum(HABIT_COLOR_KEYS as [string, ...string[]]);
const iconSchema = z.enum(HABIT_ICON_KEYS as [string, ...string[]]);

function refresh() {
  revalidatePath("/goals", "layout");
  revalidatePath("/habits", "layout");
}

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message ?? "Invalid input." };
  return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
}

async function requireOwnProfileId(): Promise<number> {
  const id = await getOwnProfileId();
  if (id === null) throw new Error("No profile for this account.");
  return id;
}

/** A goal the caller owns. */
async function ownGoal(id: number): Promise<GoalRow> {
  const goal = await getGoal(id);
  if (!goal) throw new Error("Goal not found.");
  await assertOwnProfile(goal.profileId);
  return goal;
}

/**
 * A goal the caller may contribute to: their own, or one a household member has shared. Anything else
 * (another household, or someone's private goal) is treated as not existing.
 */
async function contributableGoal(id: number): Promise<{ goal: GoalRow; profileId: number }> {
  const goal = await getGoal(id);
  if (!goal) throw new Error("Goal not found.");
  const profileId = await requireOwnProfileId();
  if (goal.profileId === profileId) return { goal, profileId };
  const session = await requireAuth();
  const household = await getProfilesInHousehold(session.householdId);
  if (goal.visibility !== "shared" || !household.some((p) => p.id === goal.profileId)) throw new Error("Goal not found.");
  return { goal, profileId };
}

// --- Goals -----------------------------------------------------------------------------------

const goalSchema = z
  .object({
    title: z.string().trim().min(1, "Give the goal a title.").max(120),
    why: z.string().trim().max(2000).nullable().optional(),
    area: z.string().trim().min(1, "Pick a life area.").max(30),
    icon: iconSchema,
    color: colorSchema,
    priority: z.number().int().min(0).max(99).nullable().optional(),
    startDate: isoDate,
    targetDate: isoDate.nullable().optional(),
    visibility: z.enum(GOAL_VISIBILITY).default("private"),
    tracking: z.enum(GOAL_TRACKING).default("milestones"),
    targetValue: z.number().positive().max(1_000_000_000).nullable().optional(),
    targetUnit: z.string().trim().max(20).nullable().optional(),
    startValue: z.number().min(0).max(1_000_000_000).default(0),
    habitKind: z.enum(GOAL_HABIT_KINDS).default("checkins"),
    habitTarget: z.number().int().positive().max(100000).nullable().optional(),
    quote: z.string().trim().max(240).nullable().optional(),
    // A small data: URL from the vision-board image picker. undefined = unchanged, null = remove.
    imageData: z.string().max(450_000).nullable().optional(),
    milestones: z.array(z.string().trim().min(1).max(160)).max(30).optional(),
  })
  .superRefine((v, ctx) => {
    const issue = (message: string, path: string) => ctx.addIssue({ code: "custom", message, path: [path] });
    if (v.targetDate && v.targetDate < v.startDate) issue("The target date can't be before the start date.", "targetDate");
    if (v.tracking === "measure" && (v.targetValue ?? 0) <= v.startValue) issue("The target must be above the starting amount.", "targetValue");
    if (v.tracking === "habits" && !v.habitTarget) issue("Set how many check-ins or days to reach.", "habitTarget");
    if (v.imageData && !v.imageData.startsWith("data:image/")) issue("That isn't a valid image.", "imageData");
  });

export type GoalFormInput = z.input<typeof goalSchema>;

function goalInput(raw: GoalFormInput) {
  const v = goalSchema.parse(raw);
  return {
    input: {
      title: v.title,
      why: v.why?.trim() || null,
      area: v.area,
      icon: v.icon,
      color: v.color,
      priority: v.priority ?? 0,
      startDate: v.startDate,
      targetDate: v.targetDate || null,
      visibility: v.visibility,
      tracking: v.tracking,
      targetValue: v.tracking === "measure" ? (v.targetValue ?? null) : null,
      targetUnit: v.tracking === "measure" ? v.targetUnit?.trim() || null : null,
      startValue: v.tracking === "measure" ? v.startValue : 0,
      habitKind: v.habitKind,
      habitTarget: v.tracking === "habits" ? (v.habitTarget ?? null) : null,
      quote: v.quote?.trim() || null,
      imageData: v.imageData,
    },
    milestones: v.milestones ?? [],
  };
}

export async function createGoalAction(raw: GoalFormInput): Promise<GoalActionResult<{ id: number }>> {
  try {
    const profileId = await requireOwnProfileId();
    const { input, milestones } = goalInput(raw);
    const goal = await createGoal(profileId, input);
    for (const title of milestones) await addMilestone(goal.id, title, null);
    refresh();
    return { ok: true, data: { id: goal.id } };
  } catch (err) {
    return fail(err);
  }
}

export async function updateGoalAction(id: number, raw: GoalFormInput): Promise<GoalActionResult> {
  try {
    await ownGoal(id);
    await updateGoal(id, goalInput(raw).input);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteGoalAction(id: number) {
  await ownGoal(id);
  await deleteGoal(id);
  refresh();
}

/** Changes a goal's status. Achieving it stamps today's date; leaving "achieved" clears it. */
export async function setGoalStatusAction(id: number, status: (typeof GOAL_STATUSES)[number]) {
  z.enum(GOAL_STATUSES).parse(status);
  const goal = await ownGoal(id);
  await setGoalStatus(id, status, status === "achieved" ? (goal.achievedAt ?? todayIso()) : null);
  refresh();
}

export async function setGoalPinnedAction(id: number, pinned: boolean) {
  await ownGoal(id);
  await setGoalPinned(id, pinned);
  refresh();
}

/** Goals are private until the owner shares them with their household. */
export async function setGoalVisibilityAction(id: number, visibility: (typeof GOAL_VISIBILITY)[number]) {
  z.enum(GOAL_VISIBILITY).parse(visibility);
  await ownGoal(id);
  await setGoalVisibility(id, visibility);
  refresh();
}

// --- Milestones ------------------------------------------------------------------------------

export async function addMilestoneAction(input: { goalId: number; title: string; dueDate: string | null }): Promise<GoalActionResult> {
  try {
    const v = z.object({ goalId: z.number().int().positive(), title: z.string().trim().min(1, "Give the milestone a title.").max(160), dueDate: isoDate.nullable() }).parse(input);
    await ownGoal(v.goalId);
    await addMilestone(v.goalId, v.title, v.dueDate);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function updateMilestoneAction(input: { id: number; title: string; dueDate: string | null }): Promise<GoalActionResult> {
  try {
    const v = z.object({ id: z.number().int().positive(), title: z.string().trim().min(1, "Give the milestone a title.").max(160), dueDate: isoDate.nullable() }).parse(input);
    const m = await getMilestone(v.id);
    if (!m) throw new Error("Milestone not found.");
    await ownGoal(m.goalId);
    await updateMilestone(v.id, v.title, v.dueDate);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function toggleMilestoneAction(input: { id: number; done: boolean }) {
  const v = z.object({ id: z.number().int().positive(), done: z.boolean() }).parse(input);
  const m = await getMilestone(v.id);
  if (!m) throw new Error("Milestone not found.");
  await ownGoal(m.goalId);
  await setMilestoneDone(v.id, v.done ? todayIso() : null);
  refresh();
}

export async function deleteMilestoneAction(id: number) {
  const m = await getMilestone(id);
  if (!m) return;
  await ownGoal(m.goalId);
  await deleteMilestone(id);
  refresh();
}

// --- Progress --------------------------------------------------------------------------------

export async function addProgressAction(input: { goalId: number; value: number; note: string | null; date: string }): Promise<GoalActionResult> {
  try {
    const v = z
      .object({
        goalId: z.number().int().positive(),
        value: z.number().positive("Enter an amount above zero.").max(1_000_000_000),
        note: z.string().trim().max(240).nullable(),
        date: isoDate,
      })
      .parse(input);
    if (v.date > todayIso()) throw new Error("You can't log progress in the future.");
    const { goal, profileId } = await contributableGoal(v.goalId);
    if (goal.tracking !== "measure") throw new Error("This goal isn't tracked by a number.");
    await addProgress(goal.id, profileId, v.value, v.note?.trim() || null, v.date);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteProgressAction(id: number) {
  const entry = await getProgressEntry(id);
  if (!entry) return;
  const goal = await getGoal(entry.goalId);
  const me = await requireOwnProfileId();
  // The person who logged it, or the goal's owner, can remove an entry.
  if (entry.profileId !== me && goal?.profileId !== me) throw new Error("You can only remove your own entries.");
  await deleteProgress(id);
  refresh();
}

// --- Linked habits ---------------------------------------------------------------------------

export async function linkHabitAction(input: { goalId: number; habitId: number }): Promise<GoalActionResult> {
  try {
    const v = z.object({ goalId: z.number().int().positive(), habitId: z.number().int().positive() }).parse(input);
    await contributableGoal(v.goalId);
    const habit = await getHabit(v.habitId);
    if (!habit) throw new Error("Habit not found.");
    await assertOwnProfile(habit.profileId); // you can only link your own habits
    await linkHabit(v.goalId, v.habitId);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function unlinkHabitAction(input: { goalId: number; habitId: number }) {
  const v = z.object({ goalId: z.number().int().positive(), habitId: z.number().int().positive() }).parse(input);
  const goal = await getGoal(v.goalId);
  const habit = await getHabit(v.habitId);
  const me = await requireOwnProfileId();
  if (!goal || !habit || (habit.profileId !== me && goal.profileId !== me)) throw new Error("Not allowed.");
  await unlinkHabit(v.goalId, v.habitId);
  refresh();
}

/** Creates a new daily habit for the caller and links it to the goal. */
export async function createLinkedHabitAction(input: { goalId: number; name: string }): Promise<GoalActionResult> {
  try {
    const v = z.object({ goalId: z.number().int().positive(), name: z.string().trim().min(1, "Give the habit a name.").max(60) }).parse(input);
    const { goal, profileId } = await contributableGoal(v.goalId);
    const habit = await createHabit(profileId, {
      name: v.name,
      description: null,
      categoryId: null,
      kind: "build",
      icon: goal.icon,
      color: goal.color,
      schedule: "daily",
      weekdays: "0,1,2,3,4,5,6",
      weeklyTarget: 3,
      dailyTarget: 1,
      unit: null,
      startDate: todayIso(),
    });
    await linkHabit(goal.id, habit.id);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Used by the habit form's "Goal" dropdown: points a habit at one goal (or none). */
export async function setHabitGoalAction(habitId: number, goalId: number | null) {
  const habit = await getHabit(habitId);
  if (!habit) throw new Error("Habit not found.");
  await assertOwnProfile(habit.profileId);
  if (goalId !== null) await contributableGoal(goalId);
  await setHabitGoal(habitId, goalId);
  refresh();
}

// --- Journal ---------------------------------------------------------------------------------

export async function addNoteAction(input: { goalId: number; body: string; mood: number | null }): Promise<GoalActionResult> {
  try {
    const v = z
      .object({ goalId: z.number().int().positive(), body: z.string().trim().min(1, "Write something first.").max(2000), mood: z.number().int().min(1).max(5).nullable() })
      .parse(input);
    const { goal, profileId } = await contributableGoal(v.goalId);
    await addNote(goal.id, profileId, v.body, v.mood);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteNoteAction(id: number) {
  const note = await getNote(id);
  if (!note) return;
  const goal = await getGoal(note.goalId);
  const me = await requireOwnProfileId();
  if (note.profileId !== me && goal?.profileId !== me) throw new Error("You can only remove your own notes.");
  await deleteNote(id);
  refresh();
}

// --- Weekly review ---------------------------------------------------------------------------

export async function saveReviewAction(input: { weekStart: string; moved: string; stalled: string; change: string }): Promise<GoalActionResult> {
  try {
    const v = z
      .object({ weekStart: isoDate, moved: z.string().trim().max(1000), stalled: z.string().trim().max(1000), change: z.string().trim().max(1000) })
      .parse(input);
    if (!v.moved && !v.stalled && !v.change) throw new Error("Write at least one answer.");
    const profileId = await requireOwnProfileId();
    await upsertReview(profileId, v.weekStart, { moved: v.moved || null, stalled: v.stalled || null, change: v.change || null });
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteReviewAction(weekStart: string) {
  const profileId = await requireOwnProfileId();
  await deleteReview(profileId, isoDate.parse(weekStart));
  refresh();
}

// --- Templates -------------------------------------------------------------------------------

/** Creates a goal from a template: its milestones, and (optionally) its suggested habits, linked. */
export async function createFromTemplateAction(input: { key: string; withHabits: boolean }): Promise<GoalActionResult<{ id: number }>> {
  try {
    const profileId = await requireOwnProfileId();
    const t = GOAL_TEMPLATES.find((x) => x.key === input.key);
    if (!t) throw new Error("Unknown template.");
    const today = todayIso();
    const goal = await createGoal(profileId, {
      title: t.title,
      why: t.why,
      area: t.area,
      icon: t.icon,
      color: t.color,
      priority: 0,
      startDate: today,
      targetDate: addDays(today, Math.round(t.months * 30.4)),
      visibility: "private",
      tracking: t.tracking,
      targetValue: t.targetValue ?? null,
      targetUnit: t.targetUnit || null,
      startValue: 0,
      habitKind: t.habitKind ?? "checkins",
      habitTarget: t.habitTarget ?? null,
      quote: null,
    });
    for (const title of t.milestones) await addMilestone(goal.id, title, null);
    if (input.withHabits) {
      for (const h of t.habits) {
        const habit = await createHabit(profileId, {
          name: h.name,
          description: null,
          categoryId: null,
          kind: "build",
          icon: h.icon,
          color: h.color,
          schedule: h.schedule,
          weekdays: "0,1,2,3,4,5,6",
          weeklyTarget: h.weeklyTarget ?? 3,
          dailyTarget: 1,
          unit: null,
          startDate: today,
        });
        await linkHabit(goal.id, habit.id);
      }
    }
    refresh();
    return { ok: true, data: { id: goal.id } };
  } catch (err) {
    return fail(err);
  }
}
