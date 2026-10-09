import { redirect } from "next/navigation";
import { getOwnProfileId } from "@/lib/auth";
import { getHabit, getHabits } from "@/lib/db/repo-habits";
import { cfgFromRow, getRecentEndedSession, settleActiveSession } from "@/lib/db/repo-focus";
import { nowMs } from "@/lib/now";
import { SessionRunner } from "@/components/focus/session-runner";

export const metadata = { title: "Focusing" };

export default async function FocusSessionPage() {
  const profileId = await getOwnProfileId();
  if (profileId === null) redirect("/focus");
  // A session that ran its whole course while the app was closed is finished here and lands in the grove.
  const active = await settleActiveSession(profileId);
  // Finishing a session ends it on the server, which refreshes this page. Instead of sending you away,
  // show how it ended for a few minutes, so the celebration is never cut short (and survives a reload).
  const ended = active ? null : await getRecentEndedSession(profileId, 2 * 60 * 60 * 1000);
  const row = active ?? ended;
  if (!row) redirect("/focus");
  const habit = row.habitId ? await getHabit(row.habitId) : null;
  // A finished session with no habit can still be counted towards one of these.
  const timerHabits = row.habitId === null && ended ? (await getHabits(profileId)).filter((h) => h.evalType === "timer" && !h.systemKey).map((h) => ({ id: h.id, name: h.name })) : [];

  return (
    <SessionRunner
      serverNow={nowMs()}
      timerHabits={timerHabits}
      initialOutcome={ended ? (ended.status === "completed" ? "done" : "withered") : undefined}
      session={{ id: row.id, startedAt: row.startedAt, plannedSeconds: row.plannedSeconds, mode: row.mode, cfg: cfgFromRow(row), species: row.species, habitName: habit?.name ?? null, focusedSeconds: row.focusedSeconds, pausedSeconds: row.pausedSeconds, pausedAt: row.pausedAt, endedAt: row.endedAt ?? undefined }}
    />
  );
}
