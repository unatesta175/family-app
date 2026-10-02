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

    const profileInfo = await client.execute(`PRAGMA table_info(profiles)`);
    if (!profileInfo.rows.some((row) => row.name === "user_id")) {
      await client.execute(`ALTER TABLE profiles ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`);
      await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_unique ON profiles (user_id)`);
      console.log("[migrate] added missing column profiles.user_id");
    }

    // Multiple households will have people sharing a display name — drop the old global
    // uniqueness constraint on profiles.name. Index-only change; no rows are touched.
    await client.execute(`DROP INDEX IF EXISTS profiles_name_unique`);

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
