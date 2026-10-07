import { redirect } from "next/navigation";
import { getOwnProfileId } from "@/lib/auth";
import { getHabit } from "@/lib/db/repo-habits";
import { getRecentEndedSession, settleActiveSession } from "@/lib/db/repo-focus";
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
  const ended = active ? null : await getRecentEndedSession(profileId, 10 * 60 * 1000);
  const row = active ?? ended;
  if (!row) redirect("/focus");
  const habit = row.habitId ? await getHabit(row.habitId) : null;

  return (
    <SessionRunner
      serverNow={nowMs()}
      initialOutcome={ended ? (ended.status === "completed" ? "done" : "withered") : undefined}
      session={{ id: row.id, startedAt: row.startedAt, plannedSeconds: row.plannedSeconds, mode: row.mode, species: row.species, habitName: habit?.name ?? null, focusedSeconds: row.focusedSeconds }}
    />
  );
}
