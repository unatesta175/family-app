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

/**
 * How often a habit comes up:
 *  daily        = every day
 *  weekdays     = chosen days of the week
 *  month_days   = chosen days of the month (1-31)
 *  year_days    = chosen calendar dates of the year ("MM-DD")
 *  weekly_count = "some days per period": N days per week / month / year (see `periodUnit`; the name
 *                 is historic, from when it only meant "N times a week")
 *  repeat       = every N days from the start date
 */
export const HABIT_SCHEDULES = ["daily", "weekdays", "month_days", "year_days", "weekly_count", "repeat"] as const;
export type HabitSchedule = (typeof HABIT_SCHEDULES)[number];

export const PERIOD_UNITS = ["week", "month", "year"] as const;
export type PeriodUnit = (typeof PERIOD_UNITS)[number];

/** How a day's result is judged: a yes/no tick, a number, time on a timer, or a set of sub-items. */
export const HABIT_EVAL_TYPES = ["yes_no", "numeric", "timer", "checklist"] as const;
export type HabitEvalType = (typeof HABIT_EVAL_TYPES)[number];

export const TARGET_OPS = ["at_least", "at_most", "exactly", "any"] as const;
export type TargetOp = (typeof TARGET_OPS)[number];

/** Extra goals measured over a longer span than a day. "single" = reached in one go (one day). */
export const GOAL_PERIODS = ["week", "month", "year", "all_time", "single"] as const;
export type GoalPeriod = (typeof GOAL_PERIODS)[number];

/**
 * done = did it / stayed clean, slipped = broke a break-habit, skipped = deliberate rest day,
 * missed = explicitly marked as not done (build habits; a day with no entry at all is also "missed"
 * once it has passed, but only an explicit entry is stored).
 */
export const HABIT_LOG_STATUSES = ["done", "slipped", "skipped", "missed"] as const;
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
  // The daily goal: a count/amount (numeric), seconds (timer) or number of items (checklist). 1 for yes/no.
  dailyTarget: real("daily_target").notNull().default(1),
  unit: text("unit"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  evalType: text("eval_type", { enum: HABIT_EVAL_TYPES }).notNull().default("yes_no"),
  targetOp: text("target_op", { enum: TARGET_OPS }).notNull().default("at_least"),
  // Shown every day until done instead of counting as missed (weekdays/month/year/repeat schedules).
  flexible: integer("flexible", { mode: "boolean" }).notNull().default(false),
  repeatEvery: integer("repeat_every").notNull().default(1), // schedule=repeat: every N days
  alternate: integer("alternate", { mode: "boolean" }).notNull().default(false), // repeat: N days on, N days off
  monthDays: text("month_days").notNull().default(""), // schedule=month_days, e.g. "1,15,31"
  yearDays: text("year_days").notNull().default(""), // schedule=year_days, e.g. "03-15,12-25"
  periodUnit: text("period_unit", { enum: PERIOD_UNITS }).notNull().default("week"), // schedule=weekly_count
  priority: integer("priority").notNull().default(0), // 1 = highest; 0 = none
  checklist: text("checklist").notNull().default("[]"), // JSON [{id,title}]
  goals: text("goals").notNull().default("[]"), // JSON [{period,op,value}]
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
    value: real("value").notNull().default(1), // progress towards dailyTarget (seconds for timers)
    detail: text("detail"), // checklist habits: JSON array of the ticked item ids
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

// ---------------------------------------------------------------------------------------------
// Goals module. Goals belong to a profile and are private until the owner shares them with their
// household. Habits and tasks are the daily steps that move a goal forward.
// ---------------------------------------------------------------------------------------------

export const GOAL_STATUSES = ["idea", "active", "paused", "achieved", "dropped"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

/** How a goal's progress is measured. */
export const GOAL_TRACKING = ["milestones", "measure", "habits"] as const;
export type GoalTracking = (typeof GOAL_TRACKING)[number];

export const GOAL_VISIBILITY = ["private", "shared"] as const;
export type GoalVisibility = (typeof GOAL_VISIBILITY)[number];

/** For habit-tracked goals: count check-ins, or reach a streak. */
export const GOAL_HABIT_KINDS = ["checkins", "streak"] as const;
export type GoalHabitKind = (typeof GOAL_HABIT_KINDS)[number];

export const goals = sqliteTable("goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  why: text("why"),
  area: text("area").notNull().default("Personal"),
  icon: text("icon").notNull().default("target"),
  color: text("color").notNull().default("indigo"),
  status: text("status", { enum: GOAL_STATUSES }).notNull().default("active"),
  priority: integer("priority").notNull().default(0), // 1 = highest, 0 = none
  pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
  startDate: text("start_date").notNull(),
  targetDate: text("target_date"),
  visibility: text("visibility", { enum: GOAL_VISIBILITY }).notNull().default("private"),
  tracking: text("tracking", { enum: GOAL_TRACKING }).notNull().default("milestones"),
  targetValue: real("target_value"), // tracking = measure
  targetUnit: text("target_unit"),
  startValue: real("start_value").notNull().default(0),
  habitKind: text("habit_kind", { enum: GOAL_HABIT_KINDS }).notNull().default("checkins"), // tracking = habits
  habitTarget: integer("habit_target"), // check-ins or streak days to reach
  quote: text("quote"), // vision board
  imageData: text("image_data"), // vision board: a small data: URL
  achievedAt: text("achieved_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const goalMilestones = sqliteTable("goal_milestones", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  goalId: integer("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  dueDate: text("due_date"),
  doneAt: text("done_at"), // yyyy-mm-dd it was completed
  sortOrder: integer("sort_order").notNull().default(0),
});

/** An amount logged against a measurable goal (or a note-worthy bit of progress). */
export const goalProgress = sqliteTable("goal_progress", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  goalId: integer("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  profileId: integer("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }), // who contributed it
  value: real("value").notNull(),
  note: text("note"),
  date: text("date").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const goalHabits = sqliteTable(
  "goal_habits",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    goalId: integer("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    habitId: integer("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("goal_habits_unique").on(table.goalId, table.habitId)]
);

/** Reflection journal entries. */
export const goalNotes = sqliteTable("goal_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  goalId: integer("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  profileId: integer("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  mood: integer("mood"), // 1 (low) to 5 (great)
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const goalReviews = sqliteTable(
  "goal_reviews",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    profileId: integer("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    weekStart: text("week_start").notNull(), // the Sunday of the week reviewed
    moved: text("moved"),
    stalled: text("stalled"),
    change: text("change"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [uniqueIndex("goal_reviews_profile_week_unique").on(table.profileId, table.weekStart)]
);

// ---------------------------------------------------------------------------------------------
// Daily routine planner ("Time" in the Goals module). A routine is a named day (for example
// "Weekday"); blocks are its activities on a 24-hour clock; the day map says which routine each
// weekday follows, so several days can share one routine. Personal to each profile.
// ---------------------------------------------------------------------------------------------

export const TIME_CATEGORIES = ["sleep", "pray", "eat", "hygiene", "chores", "work", "study", "commute", "exercise", "family", "free"] as const;
export type TimeCategoryKey = (typeof TIME_CATEGORIES)[number];

export const timeRoutines = sqliteTable("time_routines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const timeBlocks = sqliteTable("time_blocks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  routineId: integer("routine_id")
    .notNull()
    .references(() => timeRoutines.id, { onDelete: "cascade" }),
  startMin: integer("start_min").notNull(), // 0-1439
  endMin: integer("end_min").notNull(), // 1-1440; at or before start = runs past midnight
  category: text("category", { enum: TIME_CATEGORIES }).notNull(),
  label: text("label"),
});

export const timeDayMap = sqliteTable(
  "time_day_map",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    profileId: integer("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(), // 0 = Sunday
    routineId: integer("routine_id").references(() => timeRoutines.id, { onDelete: "set null" }),
  },
  (table) => [uniqueIndex("time_day_map_profile_weekday_unique").on(table.profileId, table.weekday)]
);

export const timeSettings = sqliteTable("time_settings", {
  profileId: integer("profile_id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  birthDate: text("birth_date"),
  lifespanYears: integer("lifespan_years").notNull().default(80),
});
