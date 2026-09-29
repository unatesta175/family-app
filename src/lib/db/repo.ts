import "server-only";
import { and, eq, isNull, gte, lte, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  profiles,
  prayerLogs,
  qadaLedger,
  tags,
  prayerLogTags,
  challenges,
  households,
  users,
  sessions,
} from "@/lib/db/schema";
import type { Prayer, Status, ChallengeType, CalcMethod, Madhab } from "@/lib/db/schema";
import { PRAYER_ORDER } from "@/lib/prayers";
import type { DayLogMap } from "@/lib/streaks";

const PROFILE_THEMES = ["green", "rose", "sky", "amber"] as const;

export async function getProfile(profileId: number) {
  const [p] = await db.select().from(profiles).where(eq(profiles.id, profileId));
  return p ?? null;
}

/** All profiles belonging to users in the given household — what a household-mate is allowed to see. */
export async function getProfilesInHousehold(householdId: number) {
  const rows = await db
    .select({ profile: profiles })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .where(eq(users.householdId, householdId));
  return rows.map((r) => r.profile);
}

export async function getHouseholdByInviteCode(inviteCode: string) {
  const [h] = await db.select().from(households).where(eq(households.inviteCode, inviteCode));
  return h ?? null;
}

export async function getHousehold(householdId: number) {
  const [h] = await db.select().from(households).where(eq(households.id, householdId));
  return h ?? null;
}

export async function getUserByUsername(username: string) {
  const [u] = await db.select().from(users).where(eq(users.username, username));
  return u ?? null;
}

export async function getUser(userId: number) {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  return u ?? null;
}

/** Creates a new household, then the user account and matching profile inside it, in one transaction. */
export async function createHouseholdWithOwner(params: {
  householdName: string;
  inviteCode: string;
  username: string;
  passwordHash: string;
  displayName: string;
}) {
  return db.transaction(async (tx) => {
    const [household] = await tx
      .insert(households)
      .values({ name: params.householdName, inviteCode: params.inviteCode })
      .returning();

    const [user] = await tx
      .insert(users)
      .values({ householdId: household.id, username: params.username, passwordHash: params.passwordHash })
      .returning();

    const theme = PROFILE_THEMES[household.id % PROFILE_THEMES.length];
    const [profile] = await tx
      .insert(profiles)
      .values({ userId: user.id, name: params.displayName, colorTheme: theme })
      .returning();

    return { household, user, profile };
  });
}

/** Creates a user account + matching profile inside an existing household (joining via invite code). */
export async function createUserInHousehold(params: {
  householdId: number;
  username: string;
  passwordHash: string;
  displayName: string;
}) {
  return db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ householdId: params.householdId, username: params.username, passwordHash: params.passwordHash })
      .returning();

    const siblingCount = (await tx.select().from(profiles).where(eq(profiles.userId, user.id))).length;
    const theme = PROFILE_THEMES[(params.householdId + siblingCount + 1) % PROFILE_THEMES.length];
    const [profile] = await tx
      .insert(profiles)
      .values({ userId: user.id, name: params.displayName, colorTheme: theme })
      .returning();

    return { user, profile };
  });
}

export async function createSession(userId: number, token: string, expiresAt: string) {
  await db.insert(sessions).values({ id: token, userId, expiresAt });
}

export async function getSessionByToken(token: string) {
  const [s] = await db.select().from(sessions).where(eq(sessions.id, token));
  return s ?? null;
}

export async function deleteSession(token: string) {
  await db.delete(sessions).where(eq(sessions.id, token));
}

export async function getProfileByUserId(userId: number) {
  const [p] = await db.select().from(profiles).where(eq(profiles.userId, userId));
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

/** Auto-heals expired-but-unlogged prayers to "missed" (e.g. today's Fajr once sunrise has passed). */
export async function autoMarkExpiredMissed(profileId: number, date: string, prayers: Prayer[]) {
  for (const prayer of prayers) {
    await upsertPrayerLog(profileId, date, prayer, "missed");
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
    latitude?: number | null;
    longitude?: number | null;
    locationLabel?: string | null;
    timezone?: string | null;
    calcMethod?: CalcMethod | null;
    madhab?: Madhab;
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
