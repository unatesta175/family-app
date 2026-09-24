import "server-only";
import { cookies } from "next/headers";
import { ensureSeedProfiles } from "@/lib/db/repo";

const COOKIE_NAME = "active_profile_id";

export async function getActiveProfileId(): Promise<number> {
  const seeded = await ensureSeedProfiles();
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  const parsed = raw ? Number(raw) : NaN;

  if (!Number.isNaN(parsed) && seeded.some((p) => p.id === parsed)) {
    return parsed;
  }

  return seeded[0].id;
}
