import "server-only";
import { getOwnProfileId, requireAuth } from "@/lib/auth";
import { getProfilesInHousehold } from "@/lib/db/repo";

export type GoalMember = { id: number; name: string };

/**
 * The family member whose Goals pages the signed-in user is looking at (`?member=<profile id>`), or
 * null for their own. Only people in the same circle count; anything else falls back to your own pages.
 * Pages opened this way are view-only: every mutating action still checks you own the profile.
 */
export async function resolveMember(raw: string | undefined): Promise<GoalMember | null> {
  const id = Number(raw);
  if (!raw || !Number.isInteger(id) || id <= 0) return null;
  const session = await requireAuth();
  const own = await getOwnProfileId();
  if (id === own) return null;
  const profile = (await getProfilesInHousehold(session.householdId)).find((p) => p.id === id);
  return profile ? { id: profile.id, name: profile.name } : null;
}

/** Everyone else in the circle, for the "whose goals" switcher. */
export async function listCircleMembers(): Promise<GoalMember[]> {
  const session = await requireAuth();
  const own = await getOwnProfileId();
  return (await getProfilesInHousehold(session.householdId)).filter((p) => p.id !== own).map((p) => ({ id: p.id, name: p.name }));
}
