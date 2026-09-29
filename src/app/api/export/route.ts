import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { prayerLogs, qadaLedger } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { getProfilesInHousehold } from "@/lib/db/repo";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const householdProfiles = await getProfilesInHousehold(session.householdId);
  const profileIds = householdProfiles.map((p) => p.id);

  const [allLogs, allQada] = await Promise.all([
    profileIds.length ? db.select().from(prayerLogs).where(inArray(prayerLogs.profileId, profileIds)) : [],
    profileIds.length ? db.select().from(qadaLedger).where(inArray(qadaLedger.profileId, profileIds)) : [],
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    profiles: householdProfiles,
    prayerLogs: allLogs,
    qadaLedger: allQada,
  };

  return NextResponse.json(payload, {
    headers: {
      "Content-Disposition": `attachment; filename="salah-tracker-backup-${Date.now()}.json"`,
    },
  });
}
