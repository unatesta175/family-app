import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { timeBlocks, timeDayMap, timeRoutines, timeSettings } from "@/lib/db/schema";
import type { TimeCategoryKey } from "@/lib/db/schema";

export type RoutineRow = typeof timeRoutines.$inferSelect;
export type BlockRow = typeof timeBlocks.$inferSelect;

// --- Routines --------------------------------------------------------------------------------

export async function getRoutines(profileId: number): Promise<RoutineRow[]> {
  return db.select().from(timeRoutines).where(eq(timeRoutines.profileId, profileId)).orderBy(asc(timeRoutines.sortOrder), asc(timeRoutines.id));
}

export async function getRoutine(id: number): Promise<RoutineRow | null> {
  const [row] = await db.select().from(timeRoutines).where(eq(timeRoutines.id, id));
  return row ?? null;
}

export async function createRoutine(profileId: number, name: string): Promise<RoutineRow> {
  const [max] = await db
    .select({ max: sql<number>`coalesce(max(${timeRoutines.sortOrder}), -1)` })
    .from(timeRoutines)
    .where(eq(timeRoutines.profileId, profileId));
  const [row] = await db
    .insert(timeRoutines)
    .values({ profileId, name, sortOrder: (max?.max ?? -1) + 1 })
    .returning();
  return row;
}

export async function renameRoutine(id: number, name: string) {
  await db.update(timeRoutines).set({ name }).where(eq(timeRoutines.id, id));
}

export async function deleteRoutine(id: number) {
  await db.delete(timeRoutines).where(eq(timeRoutines.id, id));
}

// --- Blocks ----------------------------------------------------------------------------------

export async function getBlocksForRoutines(routineIds: number[]): Promise<BlockRow[]> {
  if (routineIds.length === 0) return [];
  return db.select().from(timeBlocks).where(inArray(timeBlocks.routineId, routineIds)).orderBy(asc(timeBlocks.startMin), asc(timeBlocks.id));
}

export async function getBlock(id: number): Promise<BlockRow | null> {
  const [row] = await db.select().from(timeBlocks).where(eq(timeBlocks.id, id));
  return row ?? null;
}

export type BlockInput = { startMin: number; endMin: number; category: TimeCategoryKey; label: string | null };

export async function addBlock(routineId: number, input: BlockInput) {
  await db.insert(timeBlocks).values({ routineId, ...input });
}

export async function updateBlock(id: number, input: BlockInput) {
  await db.update(timeBlocks).set(input).where(eq(timeBlocks.id, id));
}

export async function deleteBlock(id: number) {
  await db.delete(timeBlocks).where(eq(timeBlocks.id, id));
}

// --- Day map ---------------------------------------------------------------------------------

/** routineId for each weekday (index 0 = Sunday), null where a day has none. */
export async function getDayMap(profileId: number): Promise<(number | null)[]> {
  const rows = await db.select().from(timeDayMap).where(eq(timeDayMap.profileId, profileId));
  const map: (number | null)[] = Array(7).fill(null);
  for (const r of rows) if (r.weekday >= 0 && r.weekday <= 6) map[r.weekday] = r.routineId;
  return map;
}

export async function setDayRoutine(profileId: number, weekday: number, routineId: number | null) {
  await db
    .insert(timeDayMap)
    .values({ profileId, weekday, routineId })
    .onConflictDoUpdate({ target: [timeDayMap.profileId, timeDayMap.weekday], set: { routineId } });
}

// --- Settings --------------------------------------------------------------------------------

export async function getTimeSettings(profileId: number) {
  const [row] = await db.select().from(timeSettings).where(eq(timeSettings.profileId, profileId));
  return row ?? { profileId, birthDate: null as string | null, lifespanYears: 80 };
}

export async function upsertTimeSettings(profileId: number, birthDate: string | null, lifespanYears: number) {
  await db
    .insert(timeSettings)
    .values({ profileId, birthDate, lifespanYears })
    .onConflictDoUpdate({ target: [timeSettings.profileId], set: { birthDate, lifespanYears } });
}

export async function routineHasProfile(routineId: number, profileId: number) {
  const [row] = await db
    .select({ id: timeRoutines.id })
    .from(timeRoutines)
    .where(and(eq(timeRoutines.id, routineId), eq(timeRoutines.profileId, profileId)));
  return !!row;
}
