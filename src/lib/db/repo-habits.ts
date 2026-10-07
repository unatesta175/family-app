import "server-only";
import { and, asc, eq, inArray, isNull, isNotNull, gte, lte, sql, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  profiles,
  habitCategories,
  habits,
  habitLogs,
  prayerLogs,
  habitTasks,
  habitTaskCompletions,
} from "@/lib/db/schema";
import type {
  Status,
  HabitEvalType,
  HabitKind,
  HabitSchedule,
  HabitLogStatus,
  PeriodUnit,
  TargetOp,
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
  endDate?: string | null;
  evalType?: HabitEvalType;
  targetOp?: TargetOp;
  flexible?: boolean;
  repeatEvery?: number;
  alternate?: boolean;
  monthDays?: string;
  yearDays?: string;
  periodUnit?: PeriodUnit;
  priority?: number;
  checklist?: string; // JSON
  goals?: string; // JSON
};

export async function getHabits(profileId: number, opts: { includeArchived?: boolean } = {}) {
  const where = opts.includeArchived
    ? eq(habits.profileId, profileId)
    : and(eq(habits.profileId, profileId), isNull(habits.archivedAt));
  // Priority 1 is the highest; habits without one (0) come after, in their own order.
  return db
    .select()
    .from(habits)
    .where(where)
    .orderBy(sql`CASE WHEN ${habits.priority} > 0 THEN ${habits.priority} ELSE 1000000 END`, asc(habits.sortOrder), asc(habits.id));
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

export async function setHabitStartDate(id: number, startDate: string) {
  await db.update(habits).set({ startDate }).where(eq(habits.id, id));
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

function toLog(r: { status: HabitLogStatus; value: number; detail: string | null }) {
  const log: { status: HabitLogStatus; value: number; checked?: string[] } = { status: r.status, value: r.value };
  if (r.detail) {
    try {
      const v: unknown = JSON.parse(r.detail);
      if (Array.isArray(v)) log.checked = v.filter((x): x is string => typeof x === "string");
    } catch {
      /* ignore malformed detail */
    }
  }
  return log;
}

// --- Prayer habits ----------------------------------------------------------------------------
// Every profile has the five daily prayers as habits. They are read-only here: each day comes straight
// from the Prayer module's log (see prayerToLog), so the two can never disagree and every habit
// screen (streaks, statistics, calendar, world standing) works for them with no extra code.

export const PRAYER_HABITS = [
  { key: "fajr", name: "Fajr", icon: "sunrise" },
  { key: "dhuhr", name: "Dhuhr", icon: "sun" },
  { key: "asr", name: "Asr", icon: "sun" },
  { key: "maghrib", name: "Maghrib", icon: "sunrise" },
  { key: "isha", name: "Isha", icon: "moon" },
] as const;

/** A habit's `systemKey` for a prayer, e.g. "prayer:fajr". */
export const prayerSystemKey = (prayer: string) => `prayer:${prayer}`;

/** How a prayer's status shows up as a habit day: prayed = done, excused = skipped, missed = missed. */
function prayerToLog(status: Status): { status: HabitLogStatus; value: number } | null {
  switch (status) {
    case "on_time_jamaah":
    case "on_time":
    case "jamaah":
    case "late":
    case "qada":
      return { status: "done", value: 1 };
    case "excused":
      return { status: "skipped", value: 0 };
    case "missed":
      return { status: "missed", value: 0 };
    default:
      return null; // not_yet
  }
}

/** Makes sure the profile has its five prayer habits (and a "Prayer" category for them). */
export async function ensurePrayerHabits(profileId: number): Promise<void> {
  const existing = await db
    .select({ key: habits.systemKey })
    .from(habits)
    .where(and(eq(habits.profileId, profileId), isNotNull(habits.systemKey)));
  const have = new Set(existing.map((e) => e.key));
  const missing = PRAYER_HABITS.filter((p) => !have.has(prayerSystemKey(p.key)));
  if (missing.length === 0) return;

  const cats = await getCategories(profileId);
  const cat = cats.find((c) => c.name.toLowerCase() === "prayer") ?? (await createCategory(profileId, { name: "Prayer", color: "emerald", icon: "moon" }));
  // The habit starts on the day of the earliest prayer on record, so no old day is left out.
  const [first] = await db.select({ d: sql<string | null>`min(${prayerLogs.date})` }).from(prayerLogs).where(eq(prayerLogs.profileId, profileId));
  const startDate = first?.d ?? todayIso();

  const [maxRow] = await db
    .select({ max: sql<number>`coalesce(max(${habits.sortOrder}), -1)` })
    .from(habits)
    .where(eq(habits.profileId, profileId));
  let order = (maxRow?.max ?? -1) + 1;
  for (const p of missing) {
    await db
      .insert(habits)
      .values({
        profileId,
        categoryId: cat.id,
        name: p.name,
        description: "Tracked in the Prayer module. Log it there and it shows up here.",
        kind: "build",
        icon: p.icon,
        color: "emerald",
        schedule: "daily",
        startDate,
        systemKey: prayerSystemKey(p.key),
        sortOrder: order++,
      })
      .onConflictDoNothing();
  }
}

/** Prayer-derived logs for the profile's prayer habits: habitId -> date -> log. */
async function prayerHabitLogs(profileId: number, from: string, to: string): Promise<Record<number, HabitLogMap>> {
  const sys = await db
    .select({ id: habits.id, key: habits.systemKey })
    .from(habits)
    .where(and(eq(habits.profileId, profileId), isNotNull(habits.systemKey)));
  const byPrayer = new Map<string, number>();
  for (const h of sys) if (h.key?.startsWith("prayer:")) byPrayer.set(h.key.slice(7), h.id);
  if (byPrayer.size === 0) return {};

  const rows = await db
    .select({ date: prayerLogs.date, prayer: prayerLogs.prayer, status: prayerLogs.status })
    .from(prayerLogs)
    .where(and(eq(prayerLogs.profileId, profileId), gte(prayerLogs.date, from), lte(prayerLogs.date, to)));
  const out: Record<number, HabitLogMap> = {};
  for (const r of rows) {
    const id = byPrayer.get(r.prayer);
    const log = prayerToLog(r.status);
    if (id !== undefined && log) (out[id] ??= {})[r.date] = log;
  }
  return out;
}

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
      detail: habitLogs.detail,
    })
    .from(habitLogs)
    .innerJoin(habits, eq(habitLogs.habitId, habits.id))
    .where(and(eq(habits.profileId, profileId), gte(habitLogs.date, from), lte(habitLogs.date, to)));

  const out: Record<number, HabitLogMap> = {};
  for (const r of rows) {
    (out[r.habitId] ??= {})[r.date] = toLog(r);
  }
  // The prayer habits read their days from the Prayer module.
  Object.assign(out, await prayerHabitLogs(profileId, from, to));
  return out;
}

/** Every log a single habit has ever received (used for streaks and its detail page). */
export async function getAllLogsForHabit(habitId: number): Promise<HabitLogMap> {
  const habit = await getHabit(habitId);
  if (habit?.systemKey?.startsWith("prayer:")) {
    return (await prayerHabitLogs(habit.profileId, "0000-01-01", "9999-12-31"))[habit.id] ?? {};
  }
  const rows = await db.select().from(habitLogs).where(eq(habitLogs.habitId, habitId));
  const out: HabitLogMap = {};
  for (const r of rows) out[r.date] = toLog(r);
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
  note?: string | null,
  checked?: string[] | null
) {
  const detail = checked ? JSON.stringify(checked) : null;
  await db
    .insert(habitLogs)
    .values({ habitId, date, status, value, detail, note: note ?? null })
    .onConflictDoUpdate({
      target: [habitLogs.habitId, habitLogs.date],
      set: {
        status,
        value,
        detail,
        ...(note !== undefined ? { note } : {}),
        loggedAt: sql`(current_timestamp)`,
      },
    });
}

export async function clearHabitLog(habitId: number, date: string) {
  await db.delete(habitLogs).where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date)));
}

/** Removes every entry for a habit inside [from, to] (inclusive) — "reset progress". */
export async function clearHabitLogsInRange(habitId: number, from: string, to: string) {
  await db
    .delete(habitLogs)
    .where(and(eq(habitLogs.habitId, habitId), gte(habitLogs.date, from), lte(habitLogs.date, to)));
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

/** Dates a profile's recurring tasks were completed (`done`) or set aside (`skipped`) in [from, to]. */
async function getTaskDatesInRange(
  profileId: number,
  from: string,
  to: string,
  status: "done" | "skipped"
): Promise<Record<number, Set<string>>> {
  const rows = await db
    .select({ taskId: habitTaskCompletions.taskId, date: habitTaskCompletions.date })
    .from(habitTaskCompletions)
    .innerJoin(habitTasks, eq(habitTaskCompletions.taskId, habitTasks.id))
    .where(
      and(
        eq(habitTasks.profileId, profileId),
        eq(habitTaskCompletions.status, status),
        gte(habitTaskCompletions.date, from),
        lte(habitTaskCompletions.date, to)
      )
    );
  const out: Record<number, Set<string>> = {};
  for (const r of rows) (out[r.taskId] ??= new Set()).add(r.date);
  return out;
}

/** Completion dates for a profile's recurring tasks in [from, to]: taskId -> Set of dates. */
export const getTaskCompletionsInRange = (profileId: number, from: string, to: string) => getTaskDatesInRange(profileId, from, to, "done");

/** Days a profile skipped a recurring task in [from, to]: taskId -> Set of dates. */
export const getTaskSkipsInRange = (profileId: number, from: string, to: string) => getTaskDatesInRange(profileId, from, to, "skipped");

export async function setRecurringTaskDone(taskId: number, date: string, done: boolean) {
  if (done) {
    // Completing a day that was skipped turns the skip into a completion.
    await db
      .insert(habitTaskCompletions)
      .values({ taskId, date, status: "done" })
      .onConflictDoUpdate({ target: [habitTaskCompletions.taskId, habitTaskCompletions.date], set: { status: "done" } });
  } else {
    await db
      .delete(habitTaskCompletions)
      .where(and(eq(habitTaskCompletions.taskId, taskId), eq(habitTaskCompletions.date, date)));
  }
}

/** Skip (or un-skip) one day of a recurring task. A skip is a completion row with status "skipped". */
export async function setRecurringTaskSkipped(taskId: number, date: string, skipped: boolean) {
  if (skipped) {
    await db
      .insert(habitTaskCompletions)
      .values({ taskId, date, status: "skipped" })
      .onConflictDoUpdate({ target: [habitTaskCompletions.taskId, habitTaskCompletions.date], set: { status: "skipped" } });
  } else {
    await db
      .delete(habitTaskCompletions)
      .where(and(eq(habitTaskCompletions.taskId, taskId), eq(habitTaskCompletions.date, date), eq(habitTaskCompletions.status, "skipped")));
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

const CATEGORY_SYNC_FLAG = "habit_categories_sync_v1";

/** Where habits (and tasks) from a removed multi-word category move to. */
const CATEGORY_REMAP: Record<string, string> = {
  "health & fitness": "Health",
  "digital detox": "Quit a bad habit",
  "mindful spending": "Finance",
};

/**
 * One-time: gives every profile the standard category list (STARTER_CATEGORIES) and removes the
 * older multi-word categories. Habits/tasks in a removed category are moved to its closest
 * replacement first so nothing ends up uncategorised. Guarded by a flag row, so after this runs
 * the categories are ordinary user data again.
 */
export async function syncHabitCategoriesOnce() {
  const flagRes = await db.$client.execute({ sql: "SELECT value FROM app_meta WHERE key = ?", args: [CATEGORY_SYNC_FLAG] });
  if (flagRes.rows.length > 0) return;

  const keep = new Set(STARTER_CATEGORIES.map((c) => c.name.toLowerCase()));
  const allProfiles = await db.select({ id: profiles.id }).from(profiles);

  for (const p of allProfiles) {
    // Push anything the user already had behind the standard list.
    await db.$client.execute({
      sql: "UPDATE habit_categories SET sort_order = sort_order + 100 WHERE profile_id = ?",
      args: [p.id],
    });

    for (const [i, cat] of STARTER_CATEGORIES.entries()) {
      await db.$client.execute({
        sql: `INSERT INTO habit_categories (profile_id, name, color, icon, sort_order)
              SELECT ?, ?, ?, ?, ? WHERE NOT EXISTS
                (SELECT 1 FROM habit_categories WHERE profile_id = ? AND lower(name) = lower(?))`,
        args: [p.id, cat.name, cat.color, cat.icon, i, p.id, cat.name],
      });
    }

    const cats = (await db.$client.execute({
      sql: "SELECT id, name FROM habit_categories WHERE profile_id = ?",
      args: [p.id],
    })).rows as unknown as { id: number; name: string }[];

    for (const c of cats) {
      const name = String(c.name).trim();
      if (!/\s/.test(name) || keep.has(name.toLowerCase())) continue; // single word, or in the new list
      const target = cats.find((t) => t.name.toLowerCase() === (CATEGORY_REMAP[name.toLowerCase()] ?? "").toLowerCase());
      for (const table of ["habits", "habit_tasks"]) {
        await db.$client.execute({
          sql: `UPDATE ${table} SET category_id = ? WHERE category_id = ?`,
          args: [target ? Number(target.id) : null, Number(c.id)],
        });
      }
      await db.$client.execute({ sql: "DELETE FROM habit_categories WHERE id = ?", args: [Number(c.id)] });
      console.log(`[habits] removed category "${name}" for profile ${p.id}`);
    }
  }

  await db.$client.execute({ sql: "INSERT OR IGNORE INTO app_meta (key, value) VALUES (?, ?)", args: [CATEGORY_SYNC_FLAG, "1"] });
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
