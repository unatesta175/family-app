import { loadHabitData } from "@/lib/habit-data";
import { getHabits } from "@/lib/db/repo-habits";
import { computeStreak, scheduleLabel } from "@/lib/habits";
import { todayIso } from "@/lib/date";
import { HabitManager, type ManageHabit } from "@/components/habits/habit-manager";

export default async function HabitsManagePage() {
  const today = todayIso();
  const { profileId, profile, readOnly, categories, logsByHabit } = await loadHabitData();
  const all = await getHabits(profileId, { includeArchived: true });

  const habits: ManageHabit[] = all.map((h) => {
    const streak = computeStreak(h, logsByHabit[h.id] ?? {}, today);
    return {
      id: h.id,
      name: h.name,
      description: h.description,
      categoryId: h.categoryId,
      kind: h.kind,
      icon: h.icon,
      color: h.color,
      schedule: h.schedule,
      weekdays: h.weekdays,
      weeklyTarget: h.weeklyTarget,
      dailyTarget: h.dailyTarget,
      unit: h.unit,
      startDate: h.startDate,
      scheduleLabel: scheduleLabel(h),
      archived: h.archivedAt !== null,
      streak: streak.current,
      streakUnit: streak.unit,
    };
  });

  return (
    <div className="flex flex-col gap-5 md:mx-auto md:max-w-3xl">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-h-muted">{profile?.name}</p>
        <h1 className="text-2xl font-extrabold tracking-tight">My habits</h1>
        <p className="text-sm text-h-muted">Create, edit, archive and organise everything you track.</p>
      </div>
      <HabitManager
        habits={habits}
        categories={categories.map((c) => ({ id: c.id, name: c.name, color: c.color, icon: c.icon }))}
        readOnly={readOnly}
      />
    </div>
  );
}
