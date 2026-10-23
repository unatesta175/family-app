import { redirect } from "next/navigation";
import { getOwnProfileId } from "@/lib/auth";
import { getHabit, getHabits } from "@/lib/db/repo-habits";
import { cfgFromRow, getFocusSession, settleActiveSessions } from "@/lib/db/repo-focus";
import { canCreditFocusTime } from "@/lib/focus";
import { nowMs } from "@/lib/now";
import { SessionRunner } from "@/components/focus/session-runner";

export const metadata = { title: "Focusing" };

/** How long a finished session's celebration screen stays reachable after a reload. */
const END_SCREEN_WINDOW_MS = 2 * 60 * 60 * 1000;

export default async function FocusSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  const profileId = await getOwnProfileId();
  if (profileId === null || !Number.isInteger(id)) redirect("/focus");
  // A session that ran its whole course while the app was closed is finished here and lands in the grove.
  await settleActiveSessions(profileId);
  const row = await getFocusSession(id);
  if (!row || row.profileId !== profileId) redirect("/focus");
  const recentlyEnded = row.status !== "active" && row.endedAt !== null && nowMs() - row.endedAt <= END_SCREEN_WINDOW_MS;
  if (row.status !== "active" && !recentlyEnded) redirect("/focus");
  const habit = row.habitId ? await getHabit(row.habitId) : null;
  // A finished session with no habit can still be counted towards one of these.
  const pickableHabits = row.habitId === null && recentlyEnded ? (await getHabits(profileId)).filter((h) => !h.systemKey && canCreditFocusTime(h)).map((h) => ({ id: h.id, name: h.name })) : [];

  return (
    <SessionRunner
      serverNow={nowMs()}
      timerHabits={pickableHabits}
      initialOutcome={row.status === "active" ? undefined : row.status === "completed" ? "done" : "withered"}
      session={{ id: row.id, startedAt: row.startedAt, plannedSeconds: row.plannedSeconds, mode: row.mode, cfg: cfgFromRow(row), species: row.species, habitName: habit?.name ?? null, habitId: row.habitId, focusedSeconds: row.focusedSeconds, pausedSeconds: row.pausedSeconds, pausedAt: row.pausedAt, endedAt: row.endedAt ?? undefined, openEnded: row.openEnded }}
    />
  );
}
