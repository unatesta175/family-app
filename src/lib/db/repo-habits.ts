import "server-only";
import { and, asc, eq, inArray, isNull, gte, lte, sql, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  profiles,
  habitCategories,
  habits,
  habitLogs,
  habitTasks,
  habitTaskCompletions,
} from "@/lib/db/schema";
import type {
  HabitKind,
  HabitSchedule,
  HabitLogStatus,
  TaskPriority,
  TaskRecurrence,
} from "@/lib/db/schema";
import { STARTER_CATEGORIES, STARTER_HABITS } from "@/lib/habit-starter";
import { todayIso } from "@/lib/date";
import type { HabitLogMap } from "@/lib/habits";

export type HabitRow = typeof habits.$inferSelect;
export type CategoryRow = typeof habitCategories.$inferSelect;
export type TaskRow = typeof habitTasks.$inferSelect;

// --- Categories ------------------------------------------------------------------------------

export async function getCategories(profileId: number): Promise<CategoryRow[]> {
  return db
    .select()
    .from(habitCategories)
    .where(eq(habitCategories.profileId, profileId))
    .orderBy(asc(habitCategories.sortOrder), asc(habitCategories.id));
}

export async function getCategory(id: number) {
  const [row] = await db.select().from(habitCategories).where(eq(habitCategories.id, id));
  return row ?? null;
}

export async function createCategory(
  profileId: number,
  input: { name: string; color: string; icon: string }
): Promise<CategoryRow> {
  const [maxRow] = await db
    .select({ max: sql<number>`coalesce(max(${habitCategories.sortOrder}), -1)` })
    .from(habitCategories)
    .where(eq(habitCategories.profileId, profileId));
  const [row] = await db
    .insert(habitCategories)
    .values({ profileId, ...input, sortOrder: (maxRow?.max ?? -1) + 1 })
    .returning();
  return row;
}

export async function updateCategory(id: number, input: { name: string; color: string; icon: string }) {
  await db.update(habitCategories).set(input).where(eq(habitCategories.id, id));
}

export async function deleteCategory(id: number) {
  await db.delete(habitCategories).where(eq(habitCategories.id, id));
}

// --- Habits ----------------------------------------------------------------------------------

export type HabitInput = {
  name: string;
  description: string | null;
  categoryId: number | null;
  kind: HabitKind;
  icon: string;
  color: string;
  schedule: HabitSchedule;
  weekdays: string;
  weeklyTarget: number;
  dailyTarget: number;
  unit: string | null;
  startDate: string;
};

export async function getHabits(profileId: number, opts: { includeArchived?: boolean } = {}) {
  const where = opts.includeArchived
    ? eq(habits.profileId, profileId)
    : and(eq(habits.profileId, profileId), isNull(habits.archivedAt));
  return db.select().from(habits).where(where).orderBy(asc(habits.sortOrder), asc(habits.id));
}

export async function getHabit(id: number) {
  const [row] = await db.select().from(habits).where(eq(habits.id, id));
  return row ?? null;
}

export async function createHabit(profileId: number, input: HabitInput): Promise<HabitRow> {
  const [maxRow] = await db
    .select({ max: sql<number>`coalesce(max(${habits.sortOrder}), -1)` })
    .from(habits)
    .where(eq(habits.profileId, profileId));
  const [row] = await db
    .insert(habits)
    .values({ profileId, ...input, sortOrder: (maxRow?.max ?? -1) + 1 })
    .returning();
  return row;
}

export async function updateHabit(id: number, input: HabitInput) {
  await db.update(habits).set(input).where(eq(habits.id, id));
}

export async function setHabitArchived(id: number, archived: boolean) {
  await db
    .update(habits)
    .set({ archivedAt: archived ? new Date().toISOString() : null })
    .where(eq(habits.id, id));
}

export async function deleteHabit(id: number) {
  await db.delete(habits).where(eq(habits.id, id));
}

// --- Habit logs ------------------------------------------------------------------------------

/** All logs for a profile's habits inside [from, to], grouped habitId -> date -> log. */
export async function getHabitLogsInRange(
  profileId: number,
  from: string,
  to: string
): Promise<Record<number, HabitLogMap>> {
  const rows = await db
    .select({
      habitId: habitLogs.habitId,
      date: habitLogs.date,
      status: habitLogs.status,
      value: habitLogs.value,
    })
    .from(habitLogs)
    .innerJoin(habits, eq(habitLogs.habitId, habits.id))
    .where(and(eq(habits.profileId, profileId), gte(habitLogs.date, from), lte(habitLogs.date, to)));

  const out: Record<number, HabitLogMap> = {};
  for (const r of rows) {
    (out[r.habitId] ??= {})[r.date] = { status: r.status, value: r.value };
  }
  return out;
}

/** Every log a single habit has ever received (used for streaks and its detail page). */
export async function getAllLogsForHabit(habitId: number): Promise<HabitLogMap> {
  const rows = await db.select().from(habitLogs).where(eq(habitLogs.habitId, habitId));
  const out: HabitLogMap = {};
  for (const r of rows) out[r.date] = { status: r.status, value: r.value };
  return out;
}

export async function getHabitNotesInRange(habitId: number, from: string, to: string) {
  return db
    .select({ date: habitLogs.date, note: habitLogs.note, status: habitLogs.status })
    .from(habitLogs)
    .where(and(eq(habitLogs.habitId, habitId), gte(habitLogs.date, from), lte(habitLogs.date, to)))
    .orderBy(desc(habitLogs.date));
}

export async function upsertHabitLog(
  habitId: number,
  date: string,
  status: HabitLogStatus,
  value: number,
  note?: string | null
) {
  await db
    .insert(habitLogs)
    .values({ habitId, date, status, value, note: note ?? null })
    .onConflictDoUpdate({
      target: [habitLogs.habitId, habitLogs.date],
      set: {
        status,
        value,
        ...(note !== undefined ? { note } : {}),
        loggedAt: sql`(current_timestamp)`,
      },
    });
}

export async function clearHabitLog(habitId: number, date: string) {
  await db.delete(habitLogs).where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date)));
}

// --- Tasks -----------------------------------------------------------------------------------

export type TaskInput = {
  title: string;
  notes: string | null;
  categoryId: number | null;
  priority: TaskPriority;
  recurrence: TaskRecurrence;
  weekdays: string;
  dueDate: string | null;
};

export async function getTasks(profileId: number): Promise<TaskRow[]> {
  return db
    .select()
    .from(habitTasks)
    .where(and(eq(habitTasks.profileId, profileId), isNull(habitTasks.archivedAt)))
    .orderBy(asc(habitTasks.id));
}

export async function getTask(id: number) {
  const [row] = await db.select().from(habitTasks).where(eq(habitTasks.id, id));
  return row ?? null;
}

export async function createTask(profileId: number, input: TaskInput) {
  const [row] = await db.insert(habitTasks).values({ profileId, ...input }).returning();
  return row;
}

export async function updateTask(id: number, input: TaskInput) {
  await db.update(habitTasks).set(input).where(eq(habitTasks.id, id));
}

export async function deleteTask(id: number) {
  await db.delete(habitTasks).where(eq(habitTasks.id, id));
}

export async function setSingleTaskCompleted(id: number, completedOn: string | null) {
  await db.update(habitTasks).set({ completedAt: completedOn }).where(eq(habitTasks.id, id));
}

/** Completion dates for a profile's recurring tasks in [from, to]: taskId -> Set of dates. */
export async function getTaskCompletionsInRange(
  profileId: number,
  from: string,
  to: string
): Promise<Record<number, Set<string>>> {
  const rows = await db
    .select({ taskId: habitTaskCompletions.taskId, date: habitTaskCompletions.date })
    .from(habitTaskCompletions)
    .innerJoin(habitTasks, eq(habitTaskCompletions.taskId, habitTasks.id))
    .where(
      and(
        eq(habitTasks.profileId, profileId),
        gte(habitTaskCompletions.date, from),
        lte(habitTaskCompletions.date, to)
      )
    );
  const out: Record<number, Set<string>> = {};
  for (const r of rows) (out[r.taskId] ??= new Set()).add(r.date);
  return out;
}

export async function setRecurringTaskDone(taskId: number, date: string, done: boolean) {
  if (done) {
    await db.insert(habitTaskCompletions).values({ taskId, date }).onConflictDoNothing();
  } else {
    await db
      .delete(habitTaskCompletions)
      .where(and(eq(habitTaskCompletions.taskId, taskId), eq(habitTaskCompletions.date, date)));
  }
}

// --- Starter habits --------------------------------------------------------------------------

/** Adds any starter categories/habits the profile doesn't already have (matched by name). */
export async function applyStarterPack(profileId: number): Promise<number> {
  const today = todayIso();
  const existingCats = await getCategories(profileId);
  const existingHabits = await getHabits(profileId, { includeArchived: true });
  const catIdByKey = new Map<string, number>();

  for (const cat of STARTER_CATEGORIES) {
    const found = existingCats.find((c) => c.name.toLowerCase() === cat.name.toLowerCase());
    if (found) {
      catIdByKey.set(cat.key, found.id);
    } else {
      const created = await createCategory(profileId, { name: cat.name, color: cat.color, icon: cat.icon });
      catIdByKey.set(cat.key, created.id);
    }
  }

  let added = 0;
  for (const h of STARTER_HABITS) {
    if (existingHabits.some((e) => e.name.toLowerCase() === h.name.toLowerCase())) continue;
    await createHabit(profileId, {
      name: h.name,
      description: h.description,
      categoryId: catIdByKey.get(h.category) ?? null,
      kind: h.kind,
      icon: h.icon,
      color: h.color,
      schedule: h.schedule,
      weekdays: "0,1,2,3,4,5,6",
      weeklyTarget: h.weeklyTarget ?? 3,
      dailyTarget: h.dailyTarget ?? 1,
      unit: h.unit ?? null,
      startDate: today,
    });
    added += 1;
  }
  return added;
}

const SEED_FLAG = "habits_starter_seed_v1";

/**
 * One-time first-deploy seed: gives the family's first two members (Ilyas and Anis) the starter
 * habits so the module isn't empty. Guarded by a flag row so it never re-runs — after that,
 * everything is normal user data they can freely edit or delete.
 */
export async function seedStarterHabitsOnce() {
  const flagRes = await db.$client.execute({ sql: "SELECT value FROM app_meta WHERE key = ?", args: [SEED_FLAG] });
  if (flagRes.rows.length > 0) return;

  const seedNames = ["ilyas", "anis"];
  const allProfiles = await db.select().from(profiles);
  const targets = allProfiles.filter((p) => seedNames.includes(p.name.trim().toLowerCase()));

  // If nobody matches yet (fresh install), leave the flag unset so a later boot can seed them.
  if (targets.length === 0) return;

  for (const p of targets) {
    const existing = await db.select({ id: habits.id }).from(habits).where(eq(habits.profileId, p.id)).limit(1);
    if (existing.length > 0) continue;
    const added = await applyStarterPack(p.id);
    console.log(`[habits] seeded ${added} starter habits for profile "${p.name}"`);
  }
  await db.$client.execute({ sql: "INSERT OR IGNORE INTO app_meta (key, value) VALUES (?, ?)", args: [SEED_FLAG, "1"] });
}

/** Active habits for several profiles at once (used by the household "family" strip). */
export async function getHabitsForProfiles(profileIds: number[]) {
  if (profileIds.length === 0) return [];
  return db
    .select()
    .from(habits)
    .where(and(inArray(habits.profileId, profileIds), isNull(habits.archivedAt)))
    .orderBy(asc(habits.sortOrder), asc(habits.id));
}
