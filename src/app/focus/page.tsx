import Link from "next/link";
import { Flame, Leaf, Timer, Trees } from "lucide-react";
import { getOwnProfileId } from "@/lib/auth";
import { addDays } from "@/lib/date";
import { focusToday, tzOffset } from "@/lib/focus-date";
import { getHabits } from "@/lib/db/repo-habits";
import { getFocusSessionsInRange, settleActiveSession, toLite } from "@/lib/db/repo-focus";
import { byDay, focusStreak, formatFocus } from "@/lib/focus";
import { SessionList } from "@/components/focus/grove-views";
import { GardenView } from "@/components/focus/garden-view";
import { FocusTree } from "@/components/focus/focus-tree";
import { StartPanel } from "@/components/focus/start-panel";

export const metadata = { title: "Focus" };

export default async function FocusHomePage({ searchParams }: { searchParams: Promise<{ habit?: string }> }) {
  const { habit: rawHabit } = await searchParams;
  const profileId = await getOwnProfileId();
  if (profileId === null) return <p className="h-card p-6 text-center text-sm text-h-muted">No profile for this account.</p>;

  const today = await focusToday();
  const tz = await tzOffset();
  const active = await settleActiveSession(profileId);
  const [habits, recent] = await Promise.all([getHabits(profileId), getFocusSessionsInRange(profileId, addDays(today, -60), today)]);
  const names = new Map(habits.map((h) => [h.id, h.name]));
  // Timer habits can start a session from here (and from the menu on Today).
  const timerHabits = habits.filter((h) => h.evalType === "timer" && !h.systemKey).map((h) => ({ id: h.id, name: h.name, color: h.color }));
  const days = byDay(recent.map(toLite));
  const todayTotals = days.get(today);
  const streak = focusStreak(days, today, addDays);

  return (
    <div className="flex flex-col gap-5 md:mx-auto md:max-w-xl">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-h-muted">Deep work, one tree at a time</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Focus</h1>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Tile icon={Trees} value={String(todayTotals?.trees ?? 0)} label="Trees today" />
        <Tile icon={Timer} value={formatFocus(todayTotals?.seconds ?? 0)} label="Focused today" />
        <Tile icon={Flame} value={`${streak}d`} label="Focus streak" />
      </div>

      {active ? (
        <Link href="/focus/session" className="h-card flex items-center gap-4 overflow-hidden bg-gradient-to-br from-h-brand-soft to-h-surface p-4">
          <FocusTree progress={0.55} species={active.species} className="h-20 w-16 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-extrabold">
              <Leaf className="h-4 w-4 text-h-brand" />A tree is growing
            </p>
            <p className="text-xs text-h-muted">
              {formatFocus(active.plannedSeconds)} session{active.habitId ? ` for ${names.get(active.habitId) ?? "a habit"}` : ""}. Tap to go back to it.
            </p>
          </div>
        </Link>
      ) : (
        <StartPanel habits={timerHabits} defaultHabitId={rawHabit && /^\d+$/.test(rawHabit) ? Number(rawHabit) : null} />
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-h-muted">Today&apos;s grove</h2>
          <Link href="/focus/grove" className="text-xs font-bold text-h-brand">
            Open grove
          </Link>
        </div>
        <div className="overflow-hidden rounded-3xl bg-gradient-to-b from-[#1c5a45] to-[#123f31] p-4 shadow-md">
          <GardenView sessions={todayTotals?.sessions ?? []} className="mx-auto w-full max-w-sm" />
        </div>
        <SessionList sessions={todayTotals?.sessions ?? []} names={names} tz={tz} />
      </section>
    </div>
  );
}

function Tile({ icon: Icon, value, label }: { icon: React.ComponentType<{ className?: string }>; value: string; label: string }) {
  return (
    <div className="h-card flex flex-col items-start gap-2 p-3">
      <Icon className="h-4 w-4 text-h-brand" />
      <div>
        <p className="text-xl font-extrabold leading-none tabular-nums">{value}</p>
        <p className="mt-1 text-[11px] font-semibold text-h-muted">{label}</p>
      </div>
    </div>
  );
}
