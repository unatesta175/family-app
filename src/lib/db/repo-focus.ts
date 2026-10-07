import "server-only";
import { and, desc, eq, gte, isNull, lte, ne } from "drizzle-orm";
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
  // Only the call that actually ends the session credits the habit, so two calls at once can't count it twice.
  const ended = await db
    .update(focusSessions)
    .set({ status: "completed", focusedSeconds: row.plannedSeconds, endedAt: Date.now() })
    .where(and(eq(focusSessions.id, row.id), eq(focusSessions.status, "active")))
    .returning({ id: focusSessions.id });
  if (ended.length === 0) return;
  await creditHabit(row, row.habitId);
}

/**
 * A finished session that was started without a habit can be counted towards one afterwards: the
 * session is linked to it and its minutes go onto the habit's day, exactly once.
 */
export async function attachHabitToSession(row: FocusSessionRow, habitId: number): Promise<boolean> {
  const linked = await db
    .update(focusSessions)
    .set({ habitId })
    .where(and(eq(focusSessions.id, row.id), eq(focusSessions.status, "completed"), isNull(focusSessions.habitId)))
    .returning({ id: focusSessions.id });
  if (linked.length === 0) return false;
  await creditHabit(row, habitId);
  return true;
}

/** Adds a finished session's focused time to a timer habit's day. */
async function creditHabit(row: FocusSessionRow, habitId: number | null) {
  if (habitId === null) return;
  const habit = await getHabit(habitId);
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
