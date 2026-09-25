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

/** Runs once at server startup (see src/instrumentation.ts) to self-heal schema drift. */
export async function runStartupMigrations() {
  const client = createClient({ url: process.env.DATABASE_URL ?? "file:familyapp.db" });
  try {
    for (const { table, column, ddl } of REQUIRED_COLUMNS) {
      const info = await client.execute(`PRAGMA table_info(${table})`);
      const exists = info.rows.some((row) => row.name === column);
      if (!exists) {
        await client.execute(ddl);
        console.log(`[migrate] added missing column ${table}.${column}`);
      }
    }
  } finally {
    client.close();
  }
}
