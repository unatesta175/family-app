import "server-only";
import { createClient } from "@libsql/client";

/**
 * Columns the schema expects that might be missing on an older database file
 * (e.g. a VPS volume that predates a migration). Each entry is applied with
 * an idempotent `ALTER TABLE ... ADD COLUMN` exactly once, checked via
 * `PRAGMA table_info` first since SQLite has no `ADD COLUMN IF NOT EXISTS`.
 */
const REQUIRED_COLUMNS: { table: string; column: string; ddl: string }[] = [
  { table: "profiles", column: "latitude", ddl: "ALTER TABLE profiles ADD COLUMN latitude REAL" },
  { table: "profiles", column: "longitude", ddl: "ALTER TABLE profiles ADD COLUMN longitude REAL" },
  { table: "profiles", column: "location_label", ddl: "ALTER TABLE profiles ADD COLUMN location_label TEXT" },
  { table: "profiles", column: "timezone", ddl: "ALTER TABLE profiles ADD COLUMN timezone TEXT" },
  { table: "profiles", column: "calc_method", ddl: "ALTER TABLE profiles ADD COLUMN calc_method TEXT" },
  {
    table: "profiles",
    column: "madhab",
    ddl: "ALTER TABLE profiles ADD COLUMN madhab TEXT NOT NULL DEFAULT 'shafi'",
  },
  { table: "users", column: "google_id", ddl: "ALTER TABLE users ADD COLUMN google_id TEXT" },
  { table: "users", column: "email", ddl: "ALTER TABLE users ADD COLUMN email TEXT" },
  // Habit evaluation types, extra goals and richer frequencies.
  { table: "habits", column: "eval_type", ddl: "ALTER TABLE habits ADD COLUMN eval_type TEXT NOT NULL DEFAULT 'yes_no'" },
  { table: "habits", column: "target_op", ddl: "ALTER TABLE habits ADD COLUMN target_op TEXT NOT NULL DEFAULT 'at_least'" },
  { table: "habits", column: "end_date", ddl: "ALTER TABLE habits ADD COLUMN end_date TEXT" },
  { table: "habits", column: "flexible", ddl: "ALTER TABLE habits ADD COLUMN flexible INTEGER NOT NULL DEFAULT 0" },
  { table: "habits", column: "repeat_every", ddl: "ALTER TABLE habits ADD COLUMN repeat_every INTEGER NOT NULL DEFAULT 1" },
  { table: "habits", column: "alternate", ddl: "ALTER TABLE habits ADD COLUMN alternate INTEGER NOT NULL DEFAULT 0" },
  { table: "habits", column: "month_days", ddl: "ALTER TABLE habits ADD COLUMN month_days TEXT NOT NULL DEFAULT ''" },
  { table: "habits", column: "year_days", ddl: "ALTER TABLE habits ADD COLUMN year_days TEXT NOT NULL DEFAULT ''" },
  { table: "habits", column: "period_unit", ddl: "ALTER TABLE habits ADD COLUMN period_unit TEXT NOT NULL DEFAULT 'week'" },
  { table: "habits", column: "priority", ddl: "ALTER TABLE habits ADD COLUMN priority INTEGER NOT NULL DEFAULT 0" },
  { table: "habits", column: "checklist", ddl: "ALTER TABLE habits ADD COLUMN checklist TEXT NOT NULL DEFAULT '[]'" },
  { table: "habits", column: "goals", ddl: "ALTER TABLE habits ADD COLUMN goals TEXT NOT NULL DEFAULT '[]'" },
  { table: "habit_logs", column: "detail", ddl: "ALTER TABLE habit_logs ADD COLUMN detail TEXT" },
  { table: "habits", column: "system_key", ddl: "ALTER TABLE habits ADD COLUMN system_key TEXT" },
  { table: "habit_task_completions", column: "status", ddl: "ALTER TABLE habit_task_completions ADD COLUMN status TEXT NOT NULL DEFAULT 'done'" },
];

/**
 * Tables introduced after the initial schema. Created with `IF NOT EXISTS` so this is a no-op
 * once `drizzle-kit push` (or a prior startup run) has already created them — never touches
 * existing rows in any table, including `profiles`/`prayer_logs`.
 */
const REQUIRED_TABLES: { table: string; ddl: string }[] = [
  {
    table: "households",
    ddl: `CREATE TABLE IF NOT EXISTS households (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      invite_code TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    )`,
  },
  {
    table: "households_invite_code_idx",
    ddl: `CREATE UNIQUE INDEX IF NOT EXISTS households_invite_code_unique ON households (invite_code)`,
  },
  {
    table: "users",
    ddl: `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      google_id TEXT,
      email TEXT,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    )`,
  },
  {
    table: "users_username_idx",
    ddl: `CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (username)`,
  },
  {
    table: "sessions",
    ddl: `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    )`,
  },
  // --- Habit tracker module -------------------------------------------------------------
  {
    table: "app_meta",
    ddl: `CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`,
  },
  {
    table: "habit_categories",
    ddl: `CREATE TABLE IF NOT EXISTS habit_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT 'indigo',
      icon TEXT NOT NULL DEFAULT 'layers',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    )`,
  },
  {
    table: "habit_categories_idx",
    ddl: `CREATE UNIQUE INDEX IF NOT EXISTS habit_categories_profile_name_unique ON habit_categories (profile_id, name)`,
  },
  {
    table: "habits",
    ddl: `CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES habit_categories(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      description TEXT,
      kind TEXT NOT NULL DEFAULT 'build',
      icon TEXT NOT NULL DEFAULT 'target',
      color TEXT NOT NULL DEFAULT 'indigo',
      schedule TEXT NOT NULL DEFAULT 'daily',
      weekdays TEXT NOT NULL DEFAULT '0,1,2,3,4,5,6',
      weekly_target INTEGER NOT NULL DEFAULT 3,
      daily_target INTEGER NOT NULL DEFAULT 1,
      unit TEXT,
      start_date TEXT NOT NULL,
      archived_at TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    )`,
  },
  {
    table: "habits_profile_idx",
    ddl: `CREATE INDEX IF NOT EXISTS habits_profile_idx ON habits (profile_id)`,
  },
  {
    table: "habit_logs",
    ddl: `CREATE TABLE IF NOT EXISTS habit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'done',
      value INTEGER NOT NULL DEFAULT 1,
      note TEXT,
      logged_at TEXT NOT NULL DEFAULT (current_timestamp)
    )`,
  },
  {
    table: "habit_logs_idx",
    ddl: `CREATE UNIQUE INDEX IF NOT EXISTS habit_logs_habit_date_unique ON habit_logs (habit_id, date)`,
  },
  {
    table: "habit_tasks",
    ddl: `CREATE TABLE IF NOT EXISTS habit_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES habit_categories(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      notes TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      recurrence TEXT NOT NULL DEFAULT 'none',
      weekdays TEXT NOT NULL DEFAULT '',
      due_date TEXT,
      completed_at TEXT,
      archived_at TEXT,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    )`,
  },
  {
    table: "habit_tasks_profile_idx",
    ddl: `CREATE INDEX IF NOT EXISTS habit_tasks_profile_idx ON habit_tasks (profile_id)`,
  },
  {
    table: "habit_task_completions",
    ddl: `CREATE TABLE IF NOT EXISTS habit_task_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES habit_tasks(id) ON DELETE CASCADE,
      date TEXT NOT NULL
    )`,
  },
  {
    table: "habit_task_completions_idx",
    ddl: `CREATE UNIQUE INDEX IF NOT EXISTS habit_task_completions_unique ON habit_task_completions (task_id, date)`,
  },
  // --- Goals module -------------------------------------------------------------------------
  {
    table: "goals",
    ddl: `CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      why TEXT,
      area TEXT NOT NULL DEFAULT 'Personal',
      icon TEXT NOT NULL DEFAULT 'target',
      color TEXT NOT NULL DEFAULT 'indigo',
      status TEXT NOT NULL DEFAULT 'active',
      priority INTEGER NOT NULL DEFAULT 0,
      pinned INTEGER NOT NULL DEFAULT 0,
      start_date TEXT NOT NULL,
      target_date TEXT,
      visibility TEXT NOT NULL DEFAULT 'private',
      tracking TEXT NOT NULL DEFAULT 'milestones',
      target_value REAL,
      target_unit TEXT,
      start_value REAL NOT NULL DEFAULT 0,
      habit_kind TEXT NOT NULL DEFAULT 'checkins',
      habit_target INTEGER,
      quote TEXT,
      image_data TEXT,
      achieved_at TEXT,
      created_at TEXT NOT NULL DEFAULT (current_timestamp),
      updated_at TEXT NOT NULL DEFAULT (current_timestamp)
    )`,
  },
  { table: "goals_profile_idx", ddl: `CREATE INDEX IF NOT EXISTS goals_profile_idx ON goals (profile_id)` },
  {
    table: "goal_milestones",
    ddl: `CREATE TABLE IF NOT EXISTS goal_milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      due_date TEXT,
      done_at TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    )`,
  },
  { table: "goal_milestones_idx", ddl: `CREATE INDEX IF NOT EXISTS goal_milestones_goal_idx ON goal_milestones (goal_id)` },
  {
    table: "goal_progress",
    ddl: `CREATE TABLE IF NOT EXISTS goal_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      value REAL NOT NULL,
      note TEXT,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    )`,
  },
  { table: "goal_progress_idx", ddl: `CREATE INDEX IF NOT EXISTS goal_progress_goal_idx ON goal_progress (goal_id)` },
  {
    table: "goal_habits",
    ddl: `CREATE TABLE IF NOT EXISTS goal_habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE
    )`,
  },
  {
    table: "goal_habits_idx",
    ddl: `CREATE UNIQUE INDEX IF NOT EXISTS goal_habits_unique ON goal_habits (goal_id, habit_id)`,
  },
  {
    table: "goal_notes",
    ddl: `CREATE TABLE IF NOT EXISTS goal_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      mood INTEGER,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    )`,
  },
  { table: "goal_notes_idx", ddl: `CREATE INDEX IF NOT EXISTS goal_notes_goal_idx ON goal_notes (goal_id)` },
  {
    table: "goal_reviews",
    ddl: `CREATE TABLE IF NOT EXISTS goal_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      week_start TEXT NOT NULL,
      moved TEXT,
      stalled TEXT,
      change TEXT,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    )`,
  },
  {
    table: "goal_reviews_idx",
    ddl: `CREATE UNIQUE INDEX IF NOT EXISTS goal_reviews_profile_week_unique ON goal_reviews (profile_id, week_start)`,
  },
  // --- Daily routine planner ---------------------------------------------------------------
  {
    table: "time_routines",
    ddl: `CREATE TABLE IF NOT EXISTS time_routines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    )`,
  },
  { table: "time_routines_idx", ddl: `CREATE INDEX IF NOT EXISTS time_routines_profile_idx ON time_routines (profile_id)` },
  {
    table: "time_blocks",
    ddl: `CREATE TABLE IF NOT EXISTS time_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      routine_id INTEGER NOT NULL REFERENCES time_routines(id) ON DELETE CASCADE,
      start_min INTEGER NOT NULL,
      end_min INTEGER NOT NULL,
      category TEXT NOT NULL,
      label TEXT
    )`,
  },
  { table: "time_blocks_idx", ddl: `CREATE INDEX IF NOT EXISTS time_blocks_routine_idx ON time_blocks (routine_id)` },
  {
    table: "time_day_map",
    ddl: `CREATE TABLE IF NOT EXISTS time_day_map (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      weekday INTEGER NOT NULL,
      routine_id INTEGER REFERENCES time_routines(id) ON DELETE SET NULL
    )`,
  },
  {
    table: "time_day_map_idx",
    ddl: `CREATE UNIQUE INDEX IF NOT EXISTS time_day_map_profile_weekday_unique ON time_day_map (profile_id, weekday)`,
  },
  {
    table: "time_settings",
    ddl: `CREATE TABLE IF NOT EXISTS time_settings (
      profile_id INTEGER PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
      birth_date TEXT,
      lifespan_years INTEGER NOT NULL DEFAULT 80
    )`,
  },
];

/** Runs once at server startup (see src/instrumentation.ts) to self-heal schema drift. */
export async function runStartupMigrations() {
  const client = createClient({ url: process.env.DATABASE_URL ?? "file:familyapp.db" });
  try {
    for (const { table, ddl } of REQUIRED_TABLES) {
      await client.execute(ddl);
      void table;
    }

    for (const { table, column, ddl } of REQUIRED_COLUMNS) {
      const info = await client.execute(`PRAGMA table_info(${table})`);
      const exists = info.rows.some((row) => row.name === column);
      if (!exists) {
        await client.execute(ddl);
        console.log(`[migrate] added missing column ${table}.${column}`);
      }
    }

    // One of each system habit (the prayers) per profile, so racing page loads can't create duplicates.
    await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS habits_profile_system_key_unique ON habits (profile_id, system_key) WHERE system_key IS NOT NULL`);

    const profileInfo = await client.execute(`PRAGMA table_info(profiles)`);
    if (!profileInfo.rows.some((row) => row.name === "user_id")) {
      await client.execute(`ALTER TABLE profiles ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`);
      await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_unique ON profiles (user_id)`);
      console.log("[migrate] added missing column profiles.user_id");
    }

    // Multiple households will have people sharing a display name — drop the old global
    // uniqueness constraint on profiles.name. Index-only change; no rows are touched.
    await client.execute(`DROP INDEX IF EXISTS profiles_name_unique`);

    // Habits that used to be counters (daily target above 1) become "numeric" habits. One-off, guarded
    // by a flag so it never touches habits the user later edits.
    const evalFlag = await client.execute({ sql: "SELECT value FROM app_meta WHERE key = ?", args: ["habit_eval_types_v1"] });
    if (evalFlag.rows.length === 0) {
      await client.execute(`UPDATE habits SET eval_type = 'numeric' WHERE daily_target > 1 AND eval_type = 'yes_no'`);
      await client.execute({ sql: "INSERT OR IGNORE INTO app_meta (key, value) VALUES (?, ?)", args: ["habit_eval_types_v1", "1"] });
    }

    await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_unique ON users (google_id)`);
    await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email)`);
  } finally {
    client.close();
  }

  // Runs after the raw client above is closed: uses the shared drizzle client so the seed goes
  // through the exact same code path as the in-app "starter habits" button.
  try {
    const { seedStarterHabitsOnce, syncHabitCategoriesOnce } = await import("@/lib/db/repo-habits");
    await seedStarterHabitsOnce();
    await syncHabitCategoriesOnce();
  } catch (err) {
    console.error("[migrate] starter habit seeding failed", err);
  }
}
