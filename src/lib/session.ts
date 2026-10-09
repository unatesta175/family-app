import "server-only";
import { cookies } from "next/headers";
import { getOwnProfileId, requireAuth } from "@/lib/auth";
import { getProfilesInHousehold } from "@/lib/db/repo";

const COOKIE_NAME = "active_profile_id";

/** The profile currently being viewed, constrained to the caller's own household. */
export async function getActiveProfileId(): Promise<number> {
  const session = await requireAuth();
  const householdProfiles = await getProfilesInHousehold(session.householdId);
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  const parsed = raw ? Number(raw) : NaN;

  if (!Number.isNaN(parsed) && householdProfiles.some((p) => p.id === parsed)) {
    return parsed;
  }

  // No explicit selection yet (e.g. a freshly signed-in phone): default to the caller's OWN profile
  // so they land on their own, editable day — not the first household member's (which renders the
  // whole day read-only). Fall back to the first profile only if the owner's can't be resolved.
  const ownId = await getOwnProfileId();
  if (ownId !== null && householdProfiles.some((p) => p.id === ownId)) return ownId;

  return householdProfiles[0].id;
}
