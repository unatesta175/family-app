import "server-only";
import { getOwnProfileId } from "@/lib/auth";
import { todayIso } from "@/lib/date";
import { getProfile } from "@/lib/db/repo";
import { getBlocksForRoutines, getDayMap, getRoutines, getTimeSettings } from "@/lib/db/repo-time";
import type { Block } from "@/lib/time-planner";

export type PlannerRoutine = { id: number; name: string; blocks: Block[] };

export type PlannerData = {
  today: string;
  routines: PlannerRoutine[];
  /** Routine id for each weekday (0 = Sunday); null where a day has none. */
  dayMap: (number | null)[];
  /** The birth date in use: your own override, else your prayer profile's, else one worked out from its age. */
  birthDate: string | null;
  /** Where `birthDate` came from. */
  birthSource: "custom" | "profile" | "age" | null;
  /** What the prayer profile alone gives (date of birth, or an estimate from its age). */
  profileBirthDate: string | null;
  lifespanYears: number;
};

/** A birth date for someone who only gave an age: that many years before today. */
function birthDateFromAge(age: number, today: string): string {
  return `${Number(today.slice(0, 4)) - age}${today.slice(4)}`;
}

/** Everything the Time page needs for the signed-in user. */
export async function loadPlannerData(): Promise<PlannerData> {
  const profileId = await getOwnProfileId();
  const today = todayIso();
  if (profileId === null) return { today, routines: [], dayMap: Array(7).fill(null), birthDate: null, birthSource: null, profileBirthDate: null, lifespanYears: 80 };

  const routines = await getRoutines(profileId);
  const [blocks, dayMap, settings, profile] = await Promise.all([
    getBlocksForRoutines(routines.map((r) => r.id)),
    getDayMap(profileId),
    getTimeSettings(profileId),
    getProfile(profileId),
  ]);

  // Use what the prayer profile already knows, unless you've set a different date here.
  const fromProfile = profile?.dateOfBirth ?? null;
  const fromAge = profile?.age != null && profile.age > 0 ? birthDateFromAge(profile.age, today) : null;
  const profileBirthDate = fromProfile ?? fromAge;
  const birthDate = settings.birthDate ?? profileBirthDate;
  const birthSource = settings.birthDate ? "custom" : fromProfile ? "profile" : fromAge ? "age" : null;

  return {
    today,
    routines: routines.map((r) => ({
      id: r.id,
      name: r.name,
      blocks: blocks.filter((b) => b.routineId === r.id).map((b) => ({ id: b.id, start: b.startMin, end: b.endMin, category: b.category, label: b.label })),
    })),
    dayMap,
    birthDate,
    birthSource,
    profileBirthDate,
    lifespanYears: settings.lifespanYears,
  };
}
