import "server-only";
import { and, eq, isNull, gte, lte, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles, prayerLogs, qadaLedger, tags, prayerLogTags, challenges } from "@/lib/db/schema";
import type { Prayer, Status, ChallengeType } from "@/lib/db/schema";
import { PRAYER_ORDER } from "@/lib/prayers";
import type { DayLogMap } from "@/lib/streaks";

export async function ensureSeedProfiles() {
  const existing = await db.select().from(profiles);
  if (existing.length > 0) return existing;

  await db
    .insert(profiles)
    .values([
      { name: "Ilyas", colorTheme: "green" },
      { name: "Anis", colorTheme: "rose" },
    ])
    .onConflictDoNothing();

  return db.select().from(profiles);
}

export async function getProfiles() {
  return db.select().from(profiles);
}

export async function getProfile(profileId: number) {
  const [p] = await db.select().from(profiles).where(eq(profiles.id, profileId));
  return p ?? null;
}

/** All logs for a profile between two ISO dates (inclusive), grouped by date. */
export async function getLogsByDateRange(
  profileId: number,
  startIso: string,
  endIso: string
): Promise<Record<string, DayLogMap>> {
  const rows = await db
    .select()
    .from(prayerLogs)
    .where(
      and(
        eq(prayerLogs.profileId, profileId),
        gte(prayerLogs.date, startIso),
        lte(prayerLogs.date, endIso)
      )
    );

  const byDate: Record<string, DayLogMap> = {};
  for (const row of rows) {
    byDate[row.date] ??= {};
    byDate[row.date][row.prayer] = row.status;
  }
  return byDate;
}

/** All logs ever recorded for a profile, grouped by date (used for streaks/best-streak). */
export async function getAllLogsByDate(profileId: number): Promise<Record<string, DayLogMap>> {
  const rows = await db.select().from(prayerLogs).where(eq(prayerLogs.profileId, profileId));
  const byDate: Record<string, DayLogMap> = {};
  for (const row of rows) {
    byDate[row.date] ??= {};
    byDate[row.date][row.prayer] = row.status;
  }
  return byDate;
}

export async function getDayLog(profileId: number, date: string): Promise<DayLogMap> {
  const rows = await db
    .select()
    .from(prayerLogs)
    .where(and(eq(prayerLogs.profileId, profileId), eq(prayerLogs.date, date)));

  const map: DayLogMap = {};
  for (const row of rows) map[row.prayer] = row.status;
  return map;
}

export async function upsertPrayerLog(
  profileId: number,
  date: string,
  prayer: Prayer,
  status: Status,
  reason?: string | null
) {
  const [existing] = await db
    .select()
    .from(prayerLogs)
    .where(
      and(
        eq(prayerLogs.profileId, profileId),
        eq(prayerLogs.date, date),
        eq(prayerLogs.prayer, prayer)
      )
    );

  if (existing) {
    await db
      .update(prayerLogs)
      .set({ status, reason: reason ?? null })
      .where(eq(prayerLogs.id, existing.id));
  } else {
    await db.insert(prayerLogs).values({ profileId, date, prayer, status, reason: reason ?? null });
  }

  if (status === "missed") {
    await addQadaOwed(profileId, prayer, date);
  } else {
    await clearQadaOwedForDate(profileId, prayer, date);
  }

  if (status === "qada") {
    await clearOldestQadaOwed(profileId, prayer);
  }
}

/** Remove a prayer's log entirely, returning it to "no status", and drop any qada it had created. */
export async function clearPrayerLog(profileId: number, date: string, prayer: Prayer) {
  await db
    .delete(prayerLogs)
    .where(
      and(eq(prayerLogs.profileId, profileId), eq(prayerLogs.date, date), eq(prayerLogs.prayer, prayer))
    );
  await clearQadaOwedForDate(profileId, prayer, date);
}

async function addQadaOwed(profileId: number, prayer: Prayer, owedDate: string) {
  const [already] = await db
    .select()
    .from(qadaLedger)
    .where(
      and(
        eq(qadaLedger.profileId, profileId),
        eq(qadaLedger.prayer, prayer),
        eq(qadaLedger.owedDate, owedDate),
        isNull(qadaLedger.clearedAt)
      )
    );
  if (already) return;

  await db.insert(qadaLedger).values({ profileId, prayer, owedDate });
}

/** If a day's status changes away from "missed", remove any owed entry created for that exact date. */
async function clearQadaOwedForDate(profileId: number, prayer: Prayer, owedDate: string) {
  await db
    .delete(qadaLedger)
    .where(
      and(
        eq(qadaLedger.profileId, profileId),
        eq(qadaLedger.prayer, prayer),
        eq(qadaLedger.owedDate, owedDate),
        isNull(qadaLedger.clearedAt)
      )
    );
}

async function clearOldestQadaOwed(profileId: number, prayer: Prayer) {
  const [oldest] = await db
    .select()
    .from(qadaLedger)
    .where(
      and(
        eq(qadaLedger.profileId, profileId),
        eq(qadaLedger.prayer, prayer),
        isNull(qadaLedger.clearedAt)
      )
    )
    .orderBy(qadaLedger.owedDate)
    .limit(1);

  if (!oldest) return;

  await db
    .update(qadaLedger)
    .set({ clearedAt: new Date().toISOString() })
    .where(eq(qadaLedger.id, oldest.id));
}

export async function getQadaOwedCount(profileId: number) {
  const rows = await db
    .select()
    .from(qadaLedger)
    .where(and(eq(qadaLedger.profileId, profileId), isNull(qadaLedger.clearedAt)));
  return rows.length;
}

export async function getQadaOwedByPrayer(profileId: number) {
  const rows = await db
    .select()
    .from(qadaLedger)
    .where(and(eq(qadaLedger.profileId, profileId), isNull(qadaLedger.clearedAt)));

  const counts: Record<Prayer, number> = {
    fajr: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
  };
  for (const row of rows) counts[row.prayer]++;
  return counts;
}

export async function updateProfile(
  profileId: number,
  updates: {
    name?: string;
    colorTheme?: string;
    age?: number | null;
    gender?: "male" | "female" | null;
    dateOfBirth?: string | null;
    haydMode?: boolean;
  }
) {
  await db.update(profiles).set(updates).where(eq(profiles.id, profileId));
}

export type Tag = { id: number; label: string };

export async function getTags(profileId: number): Promise<Tag[]> {
  const rows = await db
    .select({ id: tags.id, label: tags.label })
    .from(tags)
    .where(eq(tags.profileId, profileId))
    .orderBy(tags.label);
  return rows;
}

export async function createTag(profileId: number, label: string): Promise<Tag> {
  const trimmed = label.trim();
  await db.insert(tags).values({ profileId, label: trimmed }).onConflictDoNothing();
  const [row] = await db
    .select({ id: tags.id, label: tags.label })
    .from(tags)
    .where(and(eq(tags.profileId, profileId), eq(tags.label, trimmed)));
  return row;
}

export async function deleteTag(profileId: number, tagId: number) {
  await db.delete(tags).where(and(eq(tags.id, tagId), eq(tags.profileId, profileId)));
}

/** Tags attached to every log for a profile, grouped by `date_prayer` key. */
export async function getLogTagsMap(profileId: number): Promise<Record<string, Tag[]>> {
  const rows = await db
    .select({
      date: prayerLogs.date,
      prayer: prayerLogs.prayer,
      tagId: tags.id,
      label: tags.label,
    })
    .from(prayerLogTags)
    .innerJoin(prayerLogs, eq(prayerLogTags.prayerLogId, prayerLogs.id))
    .innerJoin(tags, eq(prayerLogTags.tagId, tags.id))
    .where(eq(prayerLogs.profileId, profileId));

  const map: Record<string, Tag[]> = {};
  for (const row of rows) {
    const key = `${row.date}_${row.prayer}`;
    map[key] ??= [];
    map[key].push({ id: row.tagId, label: row.label });
  }
  return map;
}

export async function toggleLogTag(profileId: number, date: string, prayer: Prayer, tagId: number) {
  const [log] = await db
    .select()
    .from(prayerLogs)
    .where(and(eq(prayerLogs.profileId, profileId), eq(prayerLogs.date, date), eq(prayerLogs.prayer, prayer)));
  if (!log) return;

  const [existing] = await db
    .select()
    .from(prayerLogTags)
    .where(and(eq(prayerLogTags.prayerLogId, log.id), eq(prayerLogTags.tagId, tagId)));

  if (existing) {
    await db
      .delete(prayerLogTags)
      .where(and(eq(prayerLogTags.prayerLogId, log.id), eq(prayerLogTags.tagId, tagId)));
  } else {
    await db.insert(prayerLogTags).values({ prayerLogId: log.id, tagId }).onConflictDoNothing();
  }
}

export async function createChallenge(
  profileId: number,
  type: ChallengeType,
  durationDays: number,
  startDate: string
) {
  await db.insert(challenges).values({ profileId, type, durationDays, startDate });
}

export async function getActiveChallenge(profileId: number) {
  const [row] = await db
    .select()
    .from(challenges)
    .where(and(eq(challenges.profileId, profileId), eq(challenges.status, "active")))
    .orderBy(desc(challenges.createdAt))
    .limit(1);
  return row ?? null;
}

export async function resetChallenge(profileId: number, challengeId: number) {
  await db
    .delete(challenges)
    .where(and(eq(challenges.id, challengeId), eq(challenges.profileId, profileId)));
}

export { PRAYER_ORDER };
