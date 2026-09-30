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

export const households = sqliteTable(
  "households",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    inviteCode: text("invite_code").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [uniqueIndex("households_invite_code_unique").on(table.inviteCode)]
);

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    householdId: integer("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    username: text("username").notNull(),
    // Always set, even for Google-only accounts (an unusable random hash in that case) — keeps
    // this column NOT NULL so no risky "make it nullable" table rebuild is ever needed on the
    // production sqlite file.
    passwordHash: text("password_hash").notNull(),
    googleId: text("google_id"),
    email: text("email"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    uniqueIndex("users_username_unique").on(table.username),
    uniqueIndex("users_google_id_unique").on(table.googleId),
    uniqueIndex("users_email_unique").on(table.email),
  ]
);

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(), // opaque random token — this is the session cookie's value
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const profiles = sqliteTable(
  "profiles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    colorTheme: text("color_theme").notNull().default("green"),
    age: integer("age"),
    gender: text("gender", { enum: ["male", "female"] }),
    dateOfBirth: text("date_of_birth"),
    haydMode: integer("hayd_mode", { mode: "boolean" }).notNull().default(false),
    latitude: real("latitude"),
    longitude: real("longitude"),
    locationLabel: text("location_label"),
    timezone: text("timezone"),
    calcMethod: text("calc_method", { enum: CALC_METHODS }),
    madhab: text("madhab", { enum: MADHABS }).notNull().default("shafi"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [uniqueIndex("profiles_user_id_unique").on(table.userId)]
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

// ---------------------------------------------------------------------------------------------
// Habit tracker module. Same household/profile scoping as prayer data: every row hangs off a
// profileId (directly, or through its habit/task), so family visibility works unchanged.
// ---------------------------------------------------------------------------------------------

export const HABIT_KINDS = ["build", "break"] as const;
export type HabitKind = (typeof HABIT_KINDS)[number];

/** daily = every day, weekdays = chosen days of the week, weekly_count = N times any day of the week. */
export const HABIT_SCHEDULES = ["daily", "weekdays", "weekly_count"] as const;
export type HabitSchedule = (typeof HABIT_SCHEDULES)[number];

/** done = did it / stayed clean, slipped = broke a break-habit, skipped = deliberate rest day. */
export const HABIT_LOG_STATUSES = ["done", "slipped", "skipped"] as const;
export type HabitLogStatus = (typeof HABIT_LOG_STATUSES)[number];

export const TASK_RECURRENCES = ["none", "daily", "weekly", "monthly"] as const;
export type TaskRecurrence = (typeof TASK_RECURRENCES)[number];

export const TASK_PRIORITIES = ["low", "medium", "high"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const habitCategories = sqliteTable(
  "habit_categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    profileId: integer("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("indigo"),
    icon: text("icon").notNull().default("layers"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [uniqueIndex("habit_categories_profile_name_unique").on(table.profileId, table.name)]
);

export const habits = sqliteTable("habits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").references(() => habitCategories.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  kind: text("kind", { enum: HABIT_KINDS }).notNull().default("build"),
  icon: text("icon").notNull().default("target"),
  color: text("color").notNull().default("indigo"),
  schedule: text("schedule", { enum: HABIT_SCHEDULES }).notNull().default("daily"),
  weekdays: text("weekdays").notNull().default("0,1,2,3,4,5,6"), // 0 = Sunday, for schedule=weekdays
  weeklyTarget: integer("weekly_target").notNull().default(3), // for schedule=weekly_count
  dailyTarget: integer("daily_target").notNull().default(1), // >1 makes it a counter (e.g. 8 glasses)
  unit: text("unit"),
  startDate: text("start_date").notNull(),
  archivedAt: text("archived_at"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const habitLogs = sqliteTable(
  "habit_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    habitId: integer("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // ISO yyyy-mm-dd
    status: text("status", { enum: HABIT_LOG_STATUSES }).notNull().default("done"),
    value: integer("value").notNull().default(1), // progress towards dailyTarget
    note: text("note"),
    loggedAt: text("logged_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [uniqueIndex("habit_logs_habit_date_unique").on(table.habitId, table.date)]
);

export const habitTasks = sqliteTable("habit_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").references(() => habitCategories.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  notes: text("notes"),
  priority: text("priority", { enum: TASK_PRIORITIES }).notNull().default("medium"),
  recurrence: text("recurrence", { enum: TASK_RECURRENCES }).notNull().default("none"),
  weekdays: text("weekdays").notNull().default(""), // for recurrence=weekly
  // Single task: the due date (null = whenever). Recurring task: the anchor/start date.
  dueDate: text("due_date"),
  completedAt: text("completed_at"), // single tasks only (yyyy-mm-dd of completion)
  archivedAt: text("archived_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const habitTaskCompletions = sqliteTable(
  "habit_task_completions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    taskId: integer("task_id")
      .notNull()
      .references(() => habitTasks.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
  },
  (table) => [uniqueIndex("habit_task_completions_unique").on(table.taskId, table.date)]
);
