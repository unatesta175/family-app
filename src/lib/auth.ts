import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ensureSeedProfiles } from "@/lib/db/repo";

const AUTH_COOKIE = "auth_user";

/** Fixed family accounts: username -> the profile name they own. */
const ACCOUNTS: Record<string, { password: string; profileName: string }> = {
  ilyas: { password: "password123", profileName: "Ilyas" },
  anis: { password: "password123", profileName: "Anis" },
};

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function login(username: string, password: string): Promise<LoginResult> {
  const account = ACCOUNTS[username.trim().toLowerCase()];
  if (!account || account.password !== password) {
    return { ok: false, error: "Incorrect username or password." };
  }

  const profiles = await ensureSeedProfiles();
  const own = profiles.find((p) => p.name === account.profileName);
  if (!own) {
    return { ok: false, error: "No matching profile found for this account." };
  }

  const jar = await cookies();
  jar.set(AUTH_COOKIE, username.trim().toLowerCase(), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  jar.set("active_profile_id", String(own.id), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return { ok: true };
}

export async function logout() {
  const jar = await cookies();
  jar.delete(AUTH_COOKIE);
  jar.delete("active_profile_id");
  redirect("/login");
}

/** The username of the currently logged-in account, or null if not authenticated. */
export async function getAuthUsername(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(AUTH_COOKIE)?.value;
  return value && value in ACCOUNTS ? value : null;
}

/** Redirects to /login if there's no authenticated session. Call from protected layouts. */
export async function requireAuth(): Promise<string> {
  const username = await getAuthUsername();
  if (!username) redirect("/login");
  return username;
}

/** The profile id the logged-in account owns and is allowed to edit. */
export async function getOwnProfileId(): Promise<number | null> {
  const username = await getAuthUsername();
  if (!username) return null;
  const profileName = ACCOUNTS[username].profileName;
  const profiles = await ensureSeedProfiles();
  return profiles.find((p) => p.name === profileName)?.id ?? null;
}

/** Throws if `profileId` isn't the logged-in account's own profile — guards every mutating action. */
export async function assertOwnProfile(profileId: number): Promise<void> {
  const ownId = await getOwnProfileId();
  if (ownId === null || profileId !== ownId) {
    throw new Error("You can only view your partner's data, not edit it.");
  }
}
