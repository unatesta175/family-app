import "server-only";
import { cookies } from "next/headers";
import { requireAuth } from "@/lib/auth";
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

  return householdProfiles[0].id;
}
