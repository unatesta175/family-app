import "server-only";
import { and, desc, eq, gte, lte, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { focusSessions, habitLogs } from "@/lib/db/schema";
import { upsertHabitLog } from "@/lib/db/repo-habits";
import { isoDate } from "@/lib/date";
import { getHabit } from "@/lib/db/repo-habits";
import { timeline, type FocusMode, type FocusSpecies, type SessionLite } from "@/lib/focus";

export type FocusSessionRow = typeof focusSessions.$inferSelect;

export function toLite(r: FocusSessionRow): SessionLite {
  return { id: r.id, date: r.date, startedAt: r.startedAt, habitId: r.habitId, species: r.species, status: r.status, plannedSeconds: r.plannedSeconds, focusedSeconds: r.focusedSeconds };
}

export async function getFocusSession(id: number) {
  const [row] = await db.select().from(focusSessions).where(eq(focusSessions.id, id));
  return row ?? null;
}

export async function getActiveFocusSession(profileId: number) {
  const [row] = await db
    .select()
    .from(focusSessions)
    .where(and(eq(focusSessions.profileId, profileId), eq(focusSessions.status, "active")))
    .orderBy(desc(focusSessions.startedAt))
    .limit(1);
  return row ?? null;
}

export async function createFocusSession(input: {
  profileId: number;
  habitId: number | null;
  date: string;
  startedAt: number;
  plannedSeconds: number;
  mode: FocusMode;
  species: FocusSpecies;
}) {
  const [row] = await db.insert(focusSessions).values({ ...input, status: "active" }).returning();
  return row;
}

export async function deleteFocusSession(id: number) {
  await db.delete(focusSessions).where(eq(focusSessions.id, id));
}

/** Sessions that started on a day in [from, to] (inclusive), oldest first. */
export async function getFocusSessionsInRange(profileId: number, from: string, to: string): Promise<FocusSessionRow[]> {
  return db
    .select()
    .from(focusSessions)
    .where(and(eq(focusSessions.profileId, profileId), gte(focusSessions.date, from), lte(focusSessions.date, to)))
    .orderBy(focusSessions.startedAt);
}

/**
 * Finishes a session as a grown tree and, when it was for a timer habit, adds the focused time to
 * that habit's day (so a 25 minute session is 25 more minutes on the habit).
 */
export async function completeFocusSession(row: FocusSessionRow) {
  await db
    .update(focusSessions)
    .set({ status: "completed", focusedSeconds: row.plannedSeconds, endedAt: Date.now() })
    .where(and(eq(focusSessions.id, row.id), eq(focusSessions.status, "active")));
  if (row.habitId === null) return;
  const habit = await getHabit(row.habitId);
  if (!habit || habit.evalType !== "timer" || habit.systemKey) return;
  // The Habits module counts days in the server's own zone, so the time goes onto the day it calls that.
  const habitDay = isoDate(new Date(row.startedAt));
  const [log] = await db.select().from(habitLogs).where(and(eq(habitLogs.habitId, habit.id), eq(habitLogs.date, habitDay)));
  const before = log && log.status === "done" ? log.value : 0;
  await upsertHabitLog(habit.id, habitDay, "done", before + row.plannedSeconds);
}

/** A session given up part way: the tree withers and the time put in is still kept. */
export async function witherFocusSession(id: number, focusedSeconds: number) {
  await db
    .update(focusSessions)
    .set({ status: "withered", focusedSeconds: Math.max(0, Math.round(focusedSeconds)), endedAt: Date.now() })
    .where(and(eq(focusSessions.id, id), eq(focusSessions.status, "active")));
}

/** The session that ended most recently, if it ended within `withinMs` (to show its end screen again after a reload). */
export async function getRecentEndedSession(profileId: number, withinMs: number): Promise<FocusSessionRow | null> {
  const [row] = await db
    .select()
    .from(focusSessions)
    .where(and(eq(focusSessions.profileId, profileId), ne(focusSessions.status, "active")))
    .orderBy(desc(focusSessions.endedAt))
    .limit(1);
  return row && row.endedAt !== null && Date.now() - row.endedAt <= withinMs ? row : null;
}

/**
 * If the profile's active session has run its whole course (say the tab was closed), finish it now.
 * Returns the session still running, or null.
 */
export async function settleActiveSession(profileId: number): Promise<FocusSessionRow | null> {
  const active = await getActiveFocusSession(profileId);
  if (!active) return null;
  const tl = timeline(active.startedAt, active.plannedSeconds, active.mode, Date.now());
  if (tl.done) {
    await completeFocusSession(active);
    return null;
  }
  return active;
}
