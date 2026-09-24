import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { profiles, prayerLogs, qadaLedger } from "@/lib/db/schema";

export async function GET() {
  const [allProfiles, allLogs, allQada] = await Promise.all([
    db.select().from(profiles),
    db.select().from(prayerLogs),
    db.select().from(qadaLedger),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    profiles: allProfiles,
    prayerLogs: allLogs,
    qadaLedger: allQada,
  };

  return NextResponse.json(payload, {
    headers: {
      "Content-Disposition": `attachment; filename="salah-tracker-backup-${Date.now()}.json"`,
    },
  });
}
