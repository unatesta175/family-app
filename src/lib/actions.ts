"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  upsertPrayerLog,
  clearPrayerLog,
  updateProfile as updateProfileRepo,
  createTag,
  deleteTag,
  toggleLogTag,
  createChallenge,
  resetChallenge,
} from "@/lib/db/repo";
import type { Prayer, Status, CalcMethod, Madhab } from "@/lib/db/schema";
import { PRAYERS, STATUSES, CHALLENGE_TYPES, CALC_METHODS, MADHABS } from "@/lib/db/schema";
import { todayIso } from "@/lib/date";
import { assertOwnProfile } from "@/lib/auth";
import { z } from "zod";

const setStatusSchema = z.object({
  profileId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  prayer: z.enum(PRAYERS),
  status: z.enum(STATUSES),
});

export async function setPrayerStatus(input: {
  profileId: number;
  date: string;
  prayer: Prayer;
  status: Status;
}) {
  const parsed = setStatusSchema.parse(input);
  await assertOwnProfile(parsed.profileId);
  await upsertPrayerLog(parsed.profileId, parsed.date, parsed.prayer, parsed.status);
  revalidatePath("/");
  revalidatePath("/stats");
  revalidatePath("/garden");
  revalidatePath("/history");
}

const updateProfileSchema = z.object({
  profileId: z.number().int().positive(),
  name: z.string().min(1).max(50).optional(),
  colorTheme: z.string().min(1).max(30).optional(),
  age: z.number().int().min(1).max(120).nullable().optional(),
  gender: z.enum(["male", "female"]).nullable().optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  haydMode: z.boolean().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  locationLabel: z.string().max(120).nullable().optional(),
  calcMethod: z.enum(CALC_METHODS).nullable().optional(),
  madhab: z.enum(MADHABS).optional(),
});

export async function updateProfileAction(input: {
  profileId: number;
  name?: string;
  colorTheme?: string;
  age?: number | null;
  gender?: "male" | "female" | null;
  dateOfBirth?: string | null;
  haydMode?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  locationLabel?: string | null;
  calcMethod?: CalcMethod | null;
  madhab?: Madhab;
}) {
  const parsed = updateProfileSchema.parse(input);
  await assertOwnProfile(parsed.profileId);
  await updateProfileRepo(parsed.profileId, {
    name: parsed.name,
    colorTheme: parsed.colorTheme,
    age: parsed.age,
    gender: parsed.gender,
    dateOfBirth: parsed.dateOfBirth,
    haydMode: parsed.haydMode,
    latitude: parsed.latitude,
    longitude: parsed.longitude,
    locationLabel: parsed.locationLabel,
    calcMethod: parsed.calcMethod,
    madhab: parsed.madhab,
  });
  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/stats");
}

const tagLabelSchema = z.string().trim().min(1).max(40);

export async function createTagAction(profileId: number, label: string) {
  await assertOwnProfile(profileId);
  const parsed = tagLabelSchema.parse(label);
  const tag = await createTag(profileId, parsed);
  revalidatePath("/");
  revalidatePath("/history");
  return tag;
}

export async function deleteTagAction(profileId: number, tagId: number) {
  await assertOwnProfile(profileId);
  await deleteTag(profileId, tagId);
  revalidatePath("/");
  revalidatePath("/history");
}

export async function toggleLogTagAction(input: {
  profileId: number;
  date: string;
  prayer: Prayer;
  tagId: number;
}) {
  const parsed = z
    .object({
      profileId: z.number().int().positive(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      prayer: z.enum(PRAYERS),
      tagId: z.number().int().positive(),
    })
    .parse(input);
  await assertOwnProfile(parsed.profileId);
  await toggleLogTag(parsed.profileId, parsed.date, parsed.prayer, parsed.tagId);
  revalidatePath("/");
  revalidatePath("/history");
}

export async function createAndAttachTagAction(input: {
  profileId: number;
  date: string;
  prayer: Prayer;
  label: string;
}) {
  await assertOwnProfile(input.profileId);
  const label = tagLabelSchema.parse(input.label);
  const tag = await createTag(input.profileId, label);
  await toggleLogTag(input.profileId, input.date, input.prayer, tag.id);
  revalidatePath("/");
  revalidatePath("/history");
  return tag;
}

export async function switchActiveProfile(profileId: number) {
  const jar = await cookies();
  jar.set("active_profile_id", String(profileId), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}

const startChallengeSchema = z.object({
  profileId: z.number().int().positive(),
  type: z.enum(CHALLENGE_TYPES),
  durationDays: z.number().int().min(1).max(90),
});

export async function startChallengeAction(input: {
  profileId: number;
  type: (typeof CHALLENGE_TYPES)[number];
  durationDays: number;
}) {
  const parsed = startChallengeSchema.parse(input);
  await assertOwnProfile(parsed.profileId);
  await createChallenge(parsed.profileId, parsed.type, parsed.durationDays, todayIso());
  revalidatePath("/");
}

export async function resetChallengeAction(input: { profileId: number; challengeId: number }) {
  const parsed = z
    .object({ profileId: z.number().int().positive(), challengeId: z.number().int().positive() })
    .parse(input);
  await assertOwnProfile(parsed.profileId);
  await resetChallenge(parsed.profileId, parsed.challengeId);
  revalidatePath("/");
}

const setDayStatusesSchema = z.object({
  profileId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  statuses: z.partialRecord(z.enum(PRAYERS), z.enum(STATUSES)),
});

export async function setDayStatusesAction(input: {
  profileId: number;
  date: string;
  statuses: Partial<Record<Prayer, Status>>;
}) {
  const parsed = setDayStatusesSchema.parse(input);
  await assertOwnProfile(parsed.profileId);
  await Promise.all(
    Object.entries(parsed.statuses).map(([prayer, status]) =>
      upsertPrayerLog(parsed.profileId, parsed.date, prayer as Prayer, status as Status)
    )
  );
  revalidatePath("/");
  revalidatePath("/stats");
  revalidatePath("/garden");
  revalidatePath("/history");
}

const setBulkStatusesSchema = z.object({
  profileId: z.number().int().positive(),
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1),
  statuses: z.partialRecord(z.enum(PRAYERS), z.enum(STATUSES)).default({}),
  clear: z.array(z.enum(PRAYERS)).default([]),
});

/** Applies `statuses` and removes the logs for `clear` prayers (back to "no status") on every date. */
export async function setBulkStatusesAction(input: {
  profileId: number;
  dates: string[];
  statuses?: Partial<Record<Prayer, Status>>;
  clear?: Prayer[];
}) {
  const parsed = setBulkStatusesSchema.parse(input);
  await assertOwnProfile(parsed.profileId);
  const clearSet = new Set(parsed.clear);
  await Promise.all(
    parsed.dates.flatMap((date) => [
      ...Object.entries(parsed.statuses)
        .filter(([prayer]) => !clearSet.has(prayer as Prayer))
        .map(([prayer, status]) => upsertPrayerLog(parsed.profileId, date, prayer as Prayer, status as Status)),
      ...parsed.clear.map((prayer) => clearPrayerLog(parsed.profileId, date, prayer)),
    ])
  );
  revalidatePath("/");
  revalidatePath("/stats");
  revalidatePath("/garden");
  revalidatePath("/history");
}
