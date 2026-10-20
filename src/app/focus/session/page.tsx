import { redirect } from "next/navigation";
import { getOwnProfileId } from "@/lib/auth";
import { getRecentEndedSession, settleActiveSessions } from "@/lib/db/repo-focus";

export const metadata = { title: "Focusing" };

/** No session id in the URL: sends you to whichever one makes sense — the one running, else the most recent. */
export default async function FocusSessionRedirectPage() {
  const profileId = await getOwnProfileId();
  if (profileId === null) redirect("/focus");
  const active = await settleActiveSessions(profileId);
  const running = active.find((s) => s.pausedAt === null) ?? active[active.length - 1];
  if (running) redirect(`/focus/session/${running.id}`);
  const ended = await getRecentEndedSession(profileId, 2 * 60 * 60 * 1000);
  if (ended) redirect(`/focus/session/${ended.id}`);
  redirect("/focus");
}
