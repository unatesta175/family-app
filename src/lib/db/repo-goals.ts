import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  goalHabits,
  goalMilestones,
  goalNotes,
  goalProgress,
  goalReviews,
  goals,
  habits,
  profiles,
} from "@/lib/db/schema";
import type { GoalHabitKind, GoalStatus, GoalTracking, GoalVisibility } from "@/lib/db/schema";

export type GoalRow = typeof goals.$inferSelect;
export type MilestoneRow = typeof goalMilestones.$inferSelect;
export type ProgressRow = typeof goalProgress.$inferSelect;
export type NoteRow = typeof goalNotes.$inferSelect;
export type ReviewRow = typeof goalReviews.$inferSelect;

export type GoalInput = {
  title: string;
  why: string | null;
  area: string;
  icon: string;
  color: string;
  priority: number;
  startDate: string;
  targetDate: string | null;
  visibility: GoalVisibility;
  tracking: GoalTracking;
  targetValue: number | null;
  targetUnit: string | null;
  startValue: number;
  habitKind: GoalHabitKind;
  habitTarget: number | null;
  quote: string | null;
  imageData?: string | null; // undefined = leave unchanged
};

const now = () => sql`(current_timestamp)`;

// --- Goals -----------------------------------------------------------------------------------

/** Goals owned by any of the given profiles (callers filter by visibility). */
export async function getGoalsByProfiles(profileIds: number[]): Promise<GoalRow[]> {
  if (profileIds.length === 0) return [];
  return db
    .select()
    .from(goals)
    .where(inArray(goals.profileId, profileIds))
    .orderBy(desc(goals.pinned), sql`CASE WHEN ${goals.priority} > 0 THEN ${goals.priority} ELSE 1000000 END`, asc(goals.id));
}

export async function getGoal(id: number): Promise<GoalRow | null> {
  const [row] = await db.select().from(goals).where(eq(goals.id, id));
  return row ?? null;
}

export async function createGoal(profileId: number, input: GoalInput): Promise<GoalRow> {
  const [row] = await db
    .insert(goals)
    .values({ profileId, ...input, imageData: input.imageData ?? null })
    .returning();
  return row;
}

export async function updateGoal(id: number, input: GoalInput) {
  const { imageData, ...rest } = input;
  await db
    .update(goals)
    .set({ ...rest, ...(imageData !== undefined ? { imageData } : {}), updatedAt: now() })
    .where(eq(goals.id, id));
}

export async function deleteGoal(id: number) {
  await db.delete(goals).where(eq(goals.id, id));
}

export async function setGoalStatus(id: number, status: GoalStatus, achievedAt: string | null) {
  await db.update(goals).set({ status, achievedAt, updatedAt: now() }).where(eq(goals.id, id));
}

export async function setGoalPinned(id: number, pinned: boolean) {
  await db.update(goals).set({ pinned, updatedAt: now() }).where(eq(goals.id, id));
}

export async function setGoalVisibility(id: number, visibility: GoalVisibility) {
  await db.update(goals).set({ visibility, updatedAt: now() }).where(eq(goals.id, id));
}

// --- Milestones ------------------------------------------------------------------------------

export async function getMilestones(goalIds: number[]): Promise<MilestoneRow[]> {
  if (goalIds.length === 0) return [];
  return db
    .select()
    .from(goalMilestones)
    .where(inArray(goalMilestones.goalId, goalIds))
    .orderBy(asc(goalMilestones.sortOrder), asc(goalMilestones.id));
}

export async function getMilestone(id: number) {
  const [row] = await db.select().from(goalMilestones).where(eq(goalMilestones.id, id));
  return row ?? null;
}

export async function addMilestone(goalId: number, title: string, dueDate: string | null) {
  const [max] = await db
    .select({ max: sql<number>`coalesce(max(${goalMilestones.sortOrder}), -1)` })
    .from(goalMilestones)
    .where(eq(goalMilestones.goalId, goalId));
  const [row] = await db
    .insert(goalMilestones)
    .values({ goalId, title, dueDate, sortOrder: (max?.max ?? -1) + 1 })
    .returning();
  return row;
}

export async function updateMilestone(id: number, title: string, dueDate: string | null) {
  await db.update(goalMilestones).set({ title, dueDate }).where(eq(goalMilestones.id, id));
}

export async function setMilestoneDone(id: number, doneAt: string | null) {
  await db.update(goalMilestones).set({ doneAt }).where(eq(goalMilestones.id, id));
}

export async function deleteMilestone(id: number) {
  await db.delete(goalMilestones).where(eq(goalMilestones.id, id));
}

/** Open milestones of the given active goals due on or before `date`, plus ones finished on `date`. */
export async function getMilestonesForToday(goalIds: number[], date: string) {
  if (goalIds.length === 0) return [];
  const rows = await db
    .select({ milestone: goalMilestones, goalTitle: goals.title, goalColor: goals.color })
    .from(goalMilestones)
    .innerJoin(goals, eq(goalMilestones.goalId, goals.id))
    .where(and(inArray(goalMilestones.goalId, goalIds), eq(goals.status, "active")))
    .orderBy(asc(goalMilestones.dueDate));
  return rows.filter(
    (r) =>
      (r.milestone.doneAt === date) ||
      (r.milestone.doneAt === null && r.milestone.dueDate !== null && r.milestone.dueDate <= date)
  );
}

// --- Progress entries ------------------------------------------------------------------------

export async function getProgress(goalIds: number[]): Promise<ProgressRow[]> {
  if (goalIds.length === 0) return [];
  return db
    .select()
    .from(goalProgress)
    .where(inArray(goalProgress.goalId, goalIds))
    .orderBy(desc(goalProgress.date), desc(goalProgress.id));
}

export async function getProgressEntry(id: number) {
  const [row] = await db.select().from(goalProgress).where(eq(goalProgress.id, id));
  return row ?? null;
}

export async function addProgress(goalId: number, profileId: number, value: number, note: string | null, date: string) {
  await db.insert(goalProgress).values({ goalId, profileId, value, note, date });
}

export async function deleteProgress(id: number) {
  await db.delete(goalProgress).where(eq(goalProgress.id, id));
}

// --- Linked habits ---------------------------------------------------------------------------

export async function getLinks(goalIds: number[]) {
  if (goalIds.length === 0) return [];
  return db.select().from(goalHabits).where(inArray(goalHabits.goalId, goalIds));
}

export async function linkHabit(goalId: number, habitId: number) {
  await db.insert(goalHabits).values({ goalId, habitId }).onConflictDoNothing();
}

export async function unlinkHabit(goalId: number, habitId: number) {
  await db.delete(goalHabits).where(and(eq(goalHabits.goalId, goalId), eq(goalHabits.habitId, habitId)));
}

export async function getHabitsByIds(ids: number[]) {
  if (ids.length === 0) return [];
  return db.select().from(habits).where(inArray(habits.id, ids));
}

/** Goals each of these habits is linked to (for the chip on a habit). */
export async function getGoalChipsForHabits(habitIds: number[]) {
  if (habitIds.length === 0) return new Map<number, { goalId: number; title: string; color: string }>();
  const rows = await db
    .select({ habitId: goalHabits.habitId, goalId: goals.id, title: goals.title, color: goals.color, status: goals.status })
    .from(goalHabits)
    .innerJoin(goals, eq(goalHabits.goalId, goals.id))
    .where(inArray(goalHabits.habitId, habitIds));
  const out = new Map<number, { goalId: number; title: string; color: string }>();
  for (const r of rows) if (r.status !== "dropped" && !out.has(r.habitId)) out.set(r.habitId, { goalId: r.goalId, title: r.title, color: r.color });
  return out;
}

/** The goal ids a single habit is linked to. */
export async function getGoalIdsForHabit(habitId: number): Promise<number[]> {
  const rows = await db.select({ goalId: goalHabits.goalId }).from(goalHabits).where(eq(goalHabits.habitId, habitId));
  return rows.map((r) => r.goalId);
}

// --- Journal ---------------------------------------------------------------------------------

export async function getNotes(goalId: number): Promise<NoteRow[]> {
  return db.select().from(goalNotes).where(eq(goalNotes.goalId, goalId)).orderBy(desc(goalNotes.createdAt), desc(goalNotes.id));
}

export async function getNote(id: number) {
  const [row] = await db.select().from(goalNotes).where(eq(goalNotes.id, id));
  return row ?? null;
}

export async function addNote(goalId: number, profileId: number, body: string, mood: number | null) {
  await db.insert(goalNotes).values({ goalId, profileId, body, mood });
}

export async function deleteNote(id: number) {
  await db.delete(goalNotes).where(eq(goalNotes.id, id));
}

export async function getNotesForGoals(goalIds: number[]): Promise<NoteRow[]> {
  if (goalIds.length === 0) return [];
  return db.select().from(goalNotes).where(inArray(goalNotes.goalId, goalIds)).orderBy(desc(goalNotes.createdAt));
}

// --- Weekly reviews --------------------------------------------------------------------------

export async function getReviews(profileId: number): Promise<ReviewRow[]> {
  return db.select().from(goalReviews).where(eq(goalReviews.profileId, profileId)).orderBy(desc(goalReviews.weekStart));
}

export async function upsertReview(
  profileId: number,
  weekStart: string,
  data: { moved: string | null; stalled: string | null; change: string | null }
) {
  await db
    .insert(goalReviews)
    .values({ profileId, weekStart, ...data })
    .onConflictDoUpdate({ target: [goalReviews.profileId, goalReviews.weekStart], set: data });
}

export async function deleteReview(profileId: number, weekStart: string) {
  await db.delete(goalReviews).where(and(eq(goalReviews.profileId, profileId), eq(goalReviews.weekStart, weekStart)));
}

// --- Misc ------------------------------------------------------------------------------------

export async function getProfileNames(ids: number[]): Promise<Map<number, string>> {
  if (ids.length === 0) return new Map();
  const rows = await db.select({ id: profiles.id, name: profiles.name }).from(profiles).where(inArray(profiles.id, ids));
  return new Map(rows.map((r) => [r.id, r.name]));
}


/** Points a habit at one goal, replacing any existing link (null = unlink). */
export async function setHabitGoal(habitId: number, goalId: number | null) {
  await db.delete(goalHabits).where(eq(goalHabits.habitId, habitId));
  if (goalId !== null) await db.insert(goalHabits).values({ goalId, habitId }).onConflictDoNothing();
}
