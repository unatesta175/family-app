// One-off migration: links the two pre-existing hardcoded accounts (ilyas/anis) to real
// `users`/`households` rows now that auth is data-driven instead of hardcoded in source.
// Safe to re-run: skips any account that already has a matching `users` row.
// Usage: node scripts/migrate-legacy-accounts.mjs [path-to-sqlite-file]
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const dbPath = process.argv[2] ?? "familyapp.db";
const client = createClient({ url: `file:${dbPath}` });

const LEGACY_ACCOUNTS = [
  { username: "ilyas", password: "password123", profileName: "Ilyas" },
  { username: "anis", password: "password123", profileName: "Anis" },
];
const HOUSEHOLD_NAME = "The Amran Family";

function inviteCode() {
  return randomBytes(5).toString("hex").toUpperCase().slice(0, 8);
}

async function main() {
  const existingUsers = await client.execute("SELECT username FROM users");
  const existingUsernames = new Set(existingUsers.rows.map((r) => r.username));
  const toMigrate = LEGACY_ACCOUNTS.filter((a) => !existingUsernames.has(a.username));

  if (toMigrate.length === 0) {
    console.log("Nothing to do — all legacy accounts already have users rows.");
    return;
  }

  let householdId;
  const existingHousehold = await client.execute({
    sql: "SELECT id FROM households WHERE name = ?",
    args: [HOUSEHOLD_NAME],
  });
  if (existingHousehold.rows.length > 0) {
    householdId = existingHousehold.rows[0].id;
    console.log(`Using existing household "${HOUSEHOLD_NAME}" (id ${householdId})`);
  } else {
    const result = await client.execute({
      sql: "INSERT INTO households (name, invite_code) VALUES (?, ?)",
      args: [HOUSEHOLD_NAME, inviteCode()],
    });
    householdId = Number(result.lastInsertRowid);
    console.log(`Created household "${HOUSEHOLD_NAME}" (id ${householdId})`);
  }

  for (const account of toMigrate) {
    const profileRows = await client.execute({
      sql: "SELECT id, user_id FROM profiles WHERE name = ?",
      args: [account.profileName],
    });
    const profile = profileRows.rows[0];
    if (!profile) {
      console.warn(`No profile named "${account.profileName}" found — skipping ${account.username}.`);
      continue;
    }
    if (profile.user_id) {
      console.log(`Profile "${account.profileName}" already has a user_id — skipping ${account.username}.`);
      continue;
    }

    const passwordHash = await bcrypt.hash(account.password, 10);
    const userResult = await client.execute({
      sql: "INSERT INTO users (household_id, username, password_hash) VALUES (?, ?, ?)",
      args: [householdId, account.username, passwordHash],
    });
    const userId = Number(userResult.lastInsertRowid);

    await client.execute({
      sql: "UPDATE profiles SET user_id = ? WHERE id = ?",
      args: [userId, profile.id],
    });

    console.log(`Linked user "${account.username}" (id ${userId}) -> profile "${account.profileName}" (id ${profile.id})`);
  }

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => client.close());
