import "server-only";
import { getOwnProfileId } from "@/lib/auth";
import { todayIso } from "@/lib/date";
import { getBlocksForRoutines, getDayMap, getRoutines, getTimeSettings } from "@/lib/db/repo-time";
import type { Block } from "@/lib/time-planner";

export type PlannerRoutine = { id: number; name: string; blocks: Block[] };

export type PlannerData = {
  today: string;
  routines: PlannerRoutine[];
  /** Routine id for each weekday (0 = Sunday); null where a day has none. */
  dayMap: (number | null)[];
  birthDate: string | null;
  lifespanYears: number;
};

/** Everything the Time page needs for the signed-in user. */
export async function loadPlannerData(): Promise<PlannerData> {
  const profileId = await getOwnProfileId();
  const today = todayIso();
  if (profileId === null) return { today, routines: [], dayMap: Array(7).fill(null), birthDate: null, lifespanYears: 80 };

  const routines = await getRoutines(profileId);
  const [blocks, dayMap, settings] = await Promise.all([getBlocksForRoutines(routines.map((r) => r.id)), getDayMap(profileId), getTimeSettings(profileId)]);

  return {
    today,
    routines: routines.map((r) => ({
      id: r.id,
      name: r.name,
      blocks: blocks.filter((b) => b.routineId === r.id).map((b) => ({ id: b.id, start: b.startMin, end: b.endMin, category: b.category, label: b.label })),
    })),
    dayMap,
    birthDate: settings.birthDate,
    lifespanYears: settings.lifespanYears,
  };
}
