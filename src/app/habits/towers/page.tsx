import Link from "next/link";
import { ArrowLeft, Blocks } from "lucide-react";
import { loadHabitData } from "@/lib/habit-data";
import { buildStatDays } from "@/lib/habit-insights";
import { addDays, todayIso } from "@/lib/date";
import { TowerSkyline } from "@/components/habit-tower/tower-panel";

export const metadata = { title: "Habit towers" };

// Only the latest three years are drawn, so older history isn't sent to the browser.
const WINDOW_DAYS = 36 * 31;

/** Every habit as a tower on one stage: a skyline of what you've built. */
export default async function HabitTowersPage() {
  const today = todayIso();
  const { profile, habits, logsByHabit } = await loadHabitData();
  const from = addDays(today, -WINDOW_DAYS);

  const towers = habits.slice(0, 16).map((h) => ({
    id: h.id,
    name: h.name,
    color: h.color,
    startDate: h.startDate,
    days: buildStatDays(h, logsByHabit[h.id] ?? {}, today).filter((d) => d[0] >= from),
  }));

  return (
    <div className="flex flex-col gap-5 md:mx-auto md:max-w-5xl">
      <Link href="/habits/manage" className="flex w-fit items-center gap-1 text-xs font-bold text-h-muted hover:text-h-fg">
        <ArrowLeft className="h-3.5 w-3.5" />
        All habits
      </Link>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-h-muted">{profile?.name}</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Habit towers</h1>
        <p className="text-sm text-h-muted">Every completed day adds one block. Every month adds a floor. Orbit around and tap a tower to open its habit.</p>
      </div>

      {towers.length === 0 ? (
        <div className="h-card flex flex-col items-center gap-2 p-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-h-brand-soft text-h-brand">
            <Blocks className="h-7 w-7" />
          </span>
          <p className="text-base font-extrabold">No towers yet</p>
          <p className="text-sm text-h-muted">Create a habit and complete it. Your first block appears straight away.</p>
        </div>
      ) : (
        <TowerSkyline habits={towers} today={today} />
      )}
      {habits.length > 16 && <p className="text-center text-[11px] text-h-muted">Showing your first 16 habits.</p>}
    </div>
  );
}
