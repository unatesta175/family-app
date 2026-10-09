import "server-only";
import { and, desc, eq, gte, isNull, lte, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { focusSessions, habitLogs } from "@/lib/db/schema";
import { upsertHabitLog } from "@/lib/db/repo-habits";
import { isoDate } from "@/lib/date";
import { getHabit } from "@/lib/db/repo-habits";
import { POMODORO, pausedMsAt, timeline, type FocusMode, type FocusSpecies, type PomodoroConfig, type SessionLite } from "@/lib/focus";

export type FocusSessionRow = typeof focusSessions.$inferSelect;

/** The Pomodoro rhythm a row ran at, falling back to the classic 25/5/15/4 for single or older rows. */
export function cfgFromRow(r: FocusSessionRow): PomodoroConfig {
  return {
    focus: r.focusBlockSeconds ?? POMODORO.focus,
    short: r.shortBreakSeconds ?? POMODORO.short,
    long: r.longBreakSeconds ?? POMODORO.long,
    every: r.cyclesBeforeLong ?? POMODORO.every,
  };
}

/**
 * The clock the timer should read, with paused time taken out: a session paused for 3 minutes is 3
 * minutes "behind" the wall clock, and a pause still in progress holds the clock still. Pass this to
 * `timeline` in place of the raw now so paused time never counts.
 */
export function effectiveNow(row: Pick<FocusSessionRow, "pausedSeconds" | "pausedAt">, nowMs = Date.now()): number {
  return nowMs - pausedMsAt(row.pausedSeconds, row.pausedAt, nowMs);
}

export function toLite(r: FocusSessionRow): SessionLite {
  return { id: r.id, date: r.date, startedAt: r.startedAt, habitId: r.habitId, species: r.species, status: r.status, plannedSeconds: r.plannedSeconds, focusedSeconds: r.focusedSeconds, mode: r.mode, cfg: cfgFromRow(r) };
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
  cfg?: PomodoroConfig | null;
}) {
  const { cfg, ...rest } = input;
  const [row] = await db
    .insert(focusSessions)
    .values({
      ...rest,
      status: "active",
      focusBlockSeconds: cfg?.focus ?? null,
      shortBreakSeconds: cfg?.short ?? null,
      longBreakSeconds: cfg?.long ?? null,
      cyclesBeforeLong: cfg?.every ?? null,
    })
    .returning();
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
  await creditHabitSeconds(habitId, row.startedAt, row.plannedSeconds);
}

/** Adds some seconds of focus to a timer habit's day (the day the session started on, server zone). */
async function creditHabitSeconds(habitId: number | null, startedAt: number, seconds: number) {
  if (habitId === null || seconds <= 0) return;
  const habit = await getHabit(habitId);
  if (!habit || habit.evalType !== "timer" || habit.systemKey) return;
  const habitDay = isoDate(new Date(startedAt));
  const [log] = await db.select().from(habitLogs).where(and(eq(habitLogs.habitId, habit.id), eq(habitLogs.date, habitDay)));
  const before = log && log.status === "done" ? log.value : 0;
  await upsertHabitLog(habit.id, habitDay, "done", before + seconds);
}

/**
 * Folds extra focus time into an already-finished session — for when you kept working after the timer
 * ended without noticing. The session grows by `extra` seconds (a bigger tree if it crosses a tier),
 * its habit gets those minutes, and `endedAt` moves to now so the overtime counter starts fresh.
 * Returns the updated row, or null if the session was no longer a plain completed one.
 */
export async function extendCompletedSession(row: FocusSessionRow, extra: number): Promise<FocusSessionRow | null> {
  if (extra <= 0) return row;
  const [updated] = await db
    .update(focusSessions)
    .set({ plannedSeconds: row.plannedSeconds + extra, focusedSeconds: row.focusedSeconds + extra, endedAt: Date.now() })
    .where(and(eq(focusSessions.id, row.id), eq(focusSessions.status, "completed"), eq(focusSessions.mode, "single")))
    .returning();
  if (!updated) return null;
  await creditHabitSeconds(row.habitId, row.startedAt, extra);
  return updated;
}

/**
 * Pauses a running session: the clock stops until it's resumed. Returns the moment (epoch ms) the
 * pause began, or null if the session wasn't an active, un-paused one (already paused, ended, or gone).
 */
export async function pauseFocusSession(id: number): Promise<number | null> {
  const at = Date.now();
  const res = await db
    .update(focusSessions)
    .set({ pausedAt: at })
    .where(and(eq(focusSessions.id, id), eq(focusSessions.status, "active"), isNull(focusSessions.pausedAt)))
    .returning({ id: focusSessions.id });
  return res.length > 0 ? at : null;
}

/**
 * Resumes a paused session: the time it sat paused is banked into `pausedSeconds` and `pausedAt` is
 * cleared, so the timer carries on from where it stopped. Returns the new banked paused seconds.
 */
export async function resumeFocusSession(row: FocusSessionRow): Promise<number> {
  if (row.pausedAt === null) return row.pausedSeconds;
  const banked = row.pausedSeconds + Math.max(0, Math.round((Date.now() - row.pausedAt) / 1000));
  await db
    .update(focusSessions)
    .set({ pausedSeconds: banked, pausedAt: null })
    .where(and(eq(focusSessions.id, row.id), eq(focusSessions.status, "active")));
  return banked;
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
  // A paused session's clock is held still, so effectiveNow freezes it and it never auto-completes.
  const tl = timeline(active.startedAt, active.plannedSeconds, active.mode, effectiveNow(active), cfgFromRow(active));
  if (tl.done) {
    await completeFocusSession(active);
    return null;
  }
  return active;
}
