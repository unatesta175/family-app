import "server-only";
import { getActiveProfileId } from "@/lib/session";
import { getOwnProfileId } from "@/lib/auth";
import {
  getCategories,
  getHabitLogsInRange,
  getHabits,
  getTaskCompletionsInRange,
  getTaskSkipsInRange,
  getTasks,
} from "@/lib/db/repo-habits";
import { getProfile } from "@/lib/db/repo";

const FAR_PAST = "0000-01-01";
const FAR_FUTURE = "9999-12-31";

/** Everything a habit page needs for the profile being viewed, plus whether the viewer may edit it. */
export async function loadHabitData() {
  const profileId = await getActiveProfileId();
  const ownProfileId = await getOwnProfileId();
  const readOnly = ownProfileId === null || profileId !== ownProfileId;

  const [profile, habits, categories, logsByHabit, tasks, completions, skips] = await Promise.all([
    getProfile(profileId),
    getHabits(profileId),
    getCategories(profileId),
    getHabitLogsInRange(profileId, FAR_PAST, FAR_FUTURE),
    getTasks(profileId),
    getTaskCompletionsInRange(profileId, FAR_PAST, FAR_FUTURE),
    getTaskSkipsInRange(profileId, FAR_PAST, FAR_FUTURE),
  ]);

  return { profileId, profile, readOnly, habits, categories, logsByHabit, tasks, completions, skips };
}
