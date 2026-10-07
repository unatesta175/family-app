import Link from "next/link";
import { Blocks } from "lucide-react";
import { loadHabitData } from "@/lib/habit-data";
import { requireAuth } from "@/lib/auth";
import { loadSelectableGoals } from "@/lib/goal-data";
import { getGoalChipsForHabits } from "@/lib/db/repo-goals";
import { getProfilesInHousehold } from "@/lib/db/repo";
import { getHabits } from "@/lib/db/repo-habits";
import { computeStreak, scheduleLabel, targetLabel } from "@/lib/habits";
import { habitToFormValues } from "@/lib/habit-form-values";
import { todayIso } from "@/lib/date";
import { HabitManager, type ManageHabit } from "@/components/habits/habit-manager";

export default async function HabitsManagePage() {
  const today = todayIso();
  const { profileId, profile, readOnly, categories, logsByHabit } = await loadHabitData();
  const all = await getHabits(profileId, { includeArchived: true });
  const session = await requireAuth();
  const circleSize = (await getProfilesInHousehold(session.householdId)).length;
  const goals = readOnly ? [] : await loadSelectableGoals();
  const goalChips = await getGoalChipsForHabits(all.map((h) => h.id));

  const habits: ManageHabit[] = all.map((h) => {
    const streak = computeStreak(h, logsByHabit[h.id] ?? {}, today);
    return {
      ...habitToFormValues(h, goalChips.get(h.id)?.goalId ?? null),
      id: h.id,
      locked: !!h.systemKey,
      scheduleLabel: scheduleLabel(h),
      targetLabel: targetLabel(h),
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
        <Link href="/habits/towers" className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-h-border bg-h-surface px-3 py-1.5 text-xs font-bold text-h-brand hover:bg-h-brand-soft">
          <Blocks className="h-3.5 w-3.5" />
          See your habit towers
        </Link>
      </div>
      <HabitManager
        habits={habits}
        categories={categories.map((c) => ({ id: c.id, name: c.name, color: c.color, icon: c.icon }))}
        readOnly={readOnly}
        circleSize={circleSize}
        goals={goals}
      />
    </div>
  );
}
