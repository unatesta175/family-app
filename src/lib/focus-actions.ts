"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOwnProfileId } from "@/lib/auth";
import { addDays } from "@/lib/date";
import { localDateFrom } from "@/lib/focus";
import { tzOffset } from "@/lib/focus-date";
import { nowMs } from "@/lib/now";
import { getHabit } from "@/lib/db/repo-habits";
import { completeFocusSession, createFocusSession, deleteFocusSession, getFocusSession, getFocusSessionsInRange, settleActiveSession, toLite, witherFocusSession } from "@/lib/db/repo-focus";
import { FOCUS_SPECIES, GRACE_SECONDS, MAX_MINUTES, MIN_MINUTES, byDay, focusStreak, timeline } from "@/lib/focus";

export type FocusResult<T = undefined> = ({ ok: true } & (T extends undefined ? object : { data: T })) | { ok: false; error: string };

function refresh() {
  revalidatePath("/focus", "layout");
  revalidatePath("/habits", "layout"); // a finished session adds time to its habit
}

async function ownProfile(): Promise<number> {
  const id = await getOwnProfileId();
  if (id === null) throw new Error("No profile for this account.");
  return id;
}

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message ?? "Check the form." };
  return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
}

const startSchema = z.object({
  habitId: z.number().int().positive().nullable(),
  minutes: z.number().int().min(MIN_MINUTES, `A session is at least ${MIN_MINUTES} minutes.`).max(MAX_MINUTES, `A session is at most ${MAX_MINUTES} minutes.`),
  mode: z.enum(["single", "pomodoro"]),
  species: z.enum(FOCUS_SPECIES),
});

/** Starts growing a tree. Only one session can run at a time. */
export async function startFocusAction(input: z.input<typeof startSchema>): Promise<FocusResult<{ id: number }>> {
  try {
    const v = startSchema.parse(input);
    const profileId = await ownProfile();
    if (await settleActiveSession(profileId)) return { ok: false, error: "A focus session is already running." };
    if (v.habitId !== null) {
      const habit = await getHabit(v.habitId);
      if (!habit || habit.profileId !== profileId) throw new Error("Habit not found.");
      if (habit.evalType !== "timer") throw new Error("Only timer habits can start a focus session.");
    }
    const row = await createFocusSession({ profileId, habitId: v.habitId, date: localDateFrom(nowMs(), await tzOffset()), startedAt: nowMs(), plannedSeconds: v.minutes * 60, mode: v.mode, species: v.species });
    refresh();
    return { ok: true, data: { id: row.id } };
  } catch (err) {
    return fail(err);
  }
}

export type FinishSummary = { treesToday: number; secondsToday: number; streak: number };

/** The day's totals after a session, for the celebration screen. */
async function summaryFor(profileId: number, date: string): Promise<FinishSummary> {
  const days = byDay((await getFocusSessionsInRange(profileId, addDays(date, -60), date)).map(toLite));
  const d = days.get(date);
  return { treesToday: d?.trees ?? 0, secondsToday: d?.seconds ?? 0, streak: focusStreak(days, date, addDays) };
}

/** The timer reached the end: the tree is fully grown and goes into the Grove. */
export async function finishFocusAction(id: number): Promise<FocusResult<FinishSummary>> {
  try {
    const profileId = await ownProfile();
    const row = await getFocusSession(id);
    if (!row || row.profileId !== profileId) throw new Error("Session not found.");
    if (row.status === "completed") return { ok: true, data: await summaryFor(profileId, row.date) };
    if (row.status !== "active") throw new Error("This session already ended.");
    // The server's own clock decides: a small slack covers the browser's clock running a touch ahead.
    const tl = timeline(row.startedAt, row.plannedSeconds, row.mode, Date.now() + 3000);
    if (!tl.done) throw new Error("This session isn't finished yet.");
    await completeFocusSession(row);
    refresh();
    return { ok: true, data: await summaryFor(profileId, row.date) };
  } catch (err) {
    return fail(err);
  }
}

/** Giving up. In the first seconds nothing is kept; after that the tree withers. */
export async function cancelFocusAction(id: number): Promise<FocusResult<{ withered: boolean }>> {
  try {
    const profileId = await ownProfile();
    const row = await getFocusSession(id);
    if (!row || row.profileId !== profileId) throw new Error("Session not found.");
    if (row.status !== "active") return { ok: true, data: { withered: row.status === "withered" } };
    const tl = timeline(row.startedAt, row.plannedSeconds, row.mode, Date.now());
    if (tl.done) {
      await completeFocusSession(row);
      refresh();
      return { ok: true, data: { withered: false } };
    }
    if (tl.wallElapsed < GRACE_SECONDS) {
      await deleteFocusSession(row.id);
      refresh();
      return { ok: true, data: { withered: false } };
    }
    await witherFocusSession(row.id, tl.focusElapsed);
    refresh();
    return { ok: true, data: { withered: true } };
  } catch (err) {
    return fail(err);
  }
}
