import { redirect } from "next/navigation";
import { getOwnProfileId } from "@/lib/auth";
import { getHabit } from "@/lib/db/repo-habits";
import { settleActiveSession } from "@/lib/db/repo-focus";
import { nowMs } from "@/lib/now";
import { SessionRunner } from "@/components/focus/session-runner";

export const metadata = { title: "Focusing" };

export default async function FocusSessionPage() {
  const profileId = await getOwnProfileId();
  if (profileId === null) redirect("/focus");
  // A session that ran its whole course while the app was closed is finished here and lands in the grove.
  const active = await settleActiveSession(profileId);
  if (!active) redirect("/focus/grove");
  const habit = active.habitId ? await getHabit(active.habitId) : null;

  return (
    <SessionRunner
      serverNow={nowMs()}
      session={{ id: active.id, startedAt: active.startedAt, plannedSeconds: active.plannedSeconds, mode: active.mode, species: active.species, habitName: habit?.name ?? null }}
    />
  );
}
