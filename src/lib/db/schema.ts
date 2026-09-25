import { sqliteTable, text, integer, real, uniqueIndex, primaryKey } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
export type Prayer = (typeof PRAYERS)[number];

/** Calculation methods supported by the `adhan` astronomical engine. */
export const CALC_METHODS = [
  "MuslimWorldLeague",
  "Egyptian",
  "Karachi",
  "UmmAlQura",
  "Dubai",
  "MoonsightingCommittee",
  "NorthAmerica",
  "Kuwait",
  "Qatar",
  "Singapore",
  "Tehran",
  "Turkey",
] as const;
export type CalcMethod = (typeof CALC_METHODS)[number];

export const MADHABS = ["shafi", "hanafi"] as const;
export type Madhab = (typeof MADHABS)[number];

export const STATUSES = [
  "on_time_jamaah",
  "on_time",
  "jamaah",
  "late",
  "qada",
  "missed",
  "not_yet",
  "excused",
] as const;
export type Status = (typeof STATUSES)[number];

export const profiles = sqliteTable(
  "profiles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    colorTheme: text("color_theme").notNull().default("green"),
    age: integer("age"),
    gender: text("gender", { enum: ["male", "female"] }),
    dateOfBirth: text("date_of_birth"),
    haydMode: integer("hayd_mode", { mode: "boolean" }).notNull().default(false),
    latitude: real("latitude"),
    longitude: real("longitude"),
    locationLabel: text("location_label"),
    calcMethod: text("calc_method", { enum: CALC_METHODS }),
    madhab: text("madhab", { enum: MADHABS }).notNull().default("shafi"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [uniqueIndex("profiles_name_unique").on(table.name)]
);

export const prayerLogs = sqliteTable("prayer_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // ISO yyyy-mm-dd, Gregorian
  prayer: text("prayer", { enum: PRAYERS }).notNull(),
  status: text("status", { enum: STATUSES }).notNull().default("not_yet"),
  reason: text("reason"),
  loggedAt: text("logged_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const tags = sqliteTable(
  "tags",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    profileId: integer("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [uniqueIndex("tags_profile_label_unique").on(table.profileId, table.label)]
);

export const prayerLogTags = sqliteTable(
  "prayer_log_tags",
  {
    prayerLogId: integer("prayer_log_id")
      .notNull()
      .references(() => prayerLogs.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.prayerLogId, table.tagId] })]
);

export const CHALLENGE_TYPES = ["no_missed", "all_on_time"] as const;
export type ChallengeType = (typeof CHALLENGE_TYPES)[number];

export const CHALLENGE_STATUSES = ["active", "completed", "failed"] as const;
export type ChallengeStatus = (typeof CHALLENGE_STATUSES)[number];

export const challenges = sqliteTable("challenges", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  type: text("type", { enum: CHALLENGE_TYPES }).notNull(),
  durationDays: integer("duration_days").notNull(),
  startDate: text("start_date").notNull(),
  status: text("status", { enum: CHALLENGE_STATUSES }).notNull().default("active"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const qadaLedger = sqliteTable("qada_ledger", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  prayer: text("prayer", { enum: PRAYERS }).notNull(),
  owedDate: text("owed_date").notNull(), // date the prayer was originally missed
  clearedAt: text("cleared_at"),
  clearedByLogId: integer("cleared_by_log_id"),
});
