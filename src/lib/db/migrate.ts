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
  } finally {
    client.close();
  }
}
