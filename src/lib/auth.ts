import "server-only";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import {
  createHouseholdWithOwner,
  createSession,
  createUserInHousehold,
  deleteSession,
  getHouseholdByInviteCode,
  getProfileByUserId,
  getSessionByToken,
  getUser,
  getUserByEmail,
  getUserByGoogleId,
  getUserByUsername,
  linkGoogleAccount,
} from "@/lib/db/repo";

const SESSION_COOKIE = "session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 365; // 1 year

export type AuthResult = { ok: true } | { ok: false; error: string };

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

function generateInviteCode(): string {
  return randomBytes(5).toString("hex").toUpperCase().slice(0, 8);
}

async function startSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await createSession(userId, token, expiresAt);

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function login(username: string, password: string): Promise<AuthResult> {
  const user = await getUserByUsername(normalizeUsername(username));
  if (!user) return { ok: false, error: "Incorrect username or password." };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { ok: false, error: "Incorrect username or password." };

  await startSession(user.id);
  return { ok: true };
}

export type RegisterHousehold =
  | { mode: "create"; name: string }
  | { mode: "join"; inviteCode: string };

export async function register(params: {
  username: string;
  password: string;
  displayName: string;
  household: RegisterHousehold;
}): Promise<AuthResult> {
  const username = normalizeUsername(params.username);
  const displayName = params.displayName.trim();

  if (username.length < 3) return { ok: false, error: "Username must be at least 3 characters." };
  if (!/^[a-z0-9_]+$/.test(username)) {
    return { ok: false, error: "Username can only contain letters, numbers, and underscores." };
  }
  if (params.password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
  if (!displayName) return { ok: false, error: "Please enter your display name." };

  const existing = await getUserByUsername(username);
  if (existing) return { ok: false, error: "That username is already taken." };

  const passwordHash = await bcrypt.hash(params.password, 10);

  if (params.household.mode === "create") {
    const householdName = params.household.name.trim() || `${displayName}'s Family`;
    const { user } = await createHouseholdWithOwner({
      householdName,
      inviteCode: generateInviteCode(),
      username,
      passwordHash,
      displayName,
    });
    await startSession(user.id);
    return { ok: true };
  }

  const inviteCode = params.household.inviteCode.trim().toUpperCase();
  const household = await getHouseholdByInviteCode(inviteCode);
  if (!household) return { ok: false, error: "That invite code doesn't match any family." };

  const { user } = await createUserInHousehold({
    householdId: household.id,
    username,
    passwordHash,
    displayName,
  });
  await startSession(user.id);
  return { ok: true };
}

/**
 * Signs in an existing Google-linked account, auto-links Google to an existing username/password
 * account that shares the verified email, or — for a first-time signer — creates a brand new
 * household for them (same as choosing "create a new family" during normal registration). They
 * can join an existing family afterward via invite code from Settings, same as any account.
 */
export async function loginOrRegisterWithGoogle(profile: {
  googleId: string;
  email: string;
  name: string;
}): Promise<AuthResult> {
  const byGoogle = await getUserByGoogleId(profile.googleId);
  if (byGoogle) {
    await startSession(byGoogle.id);
    return { ok: true };
  }

  const byEmail = profile.email ? await getUserByEmail(profile.email) : null;
  if (byEmail) {
    if (!byEmail.googleId) await linkGoogleAccount(byEmail.id, profile.googleId);
    await startSession(byEmail.id);
    return { ok: true };
  }

  const displayName = profile.name.trim() || "New member";
  const baseUsername =
    normalizeUsername(profile.email.split("@")[0] || displayName).replace(/[^a-z0-9_]/g, "") || "member";
  let username = baseUsername;
  let suffix = 0;
  while (await getUserByUsername(username)) {
    suffix += 1;
    username = `${baseUsername}${suffix}`;
  }

  // Google-only accounts never use this hash to log in (there's no password form for them) —
  // it only exists to satisfy the column's NOT NULL constraint.
  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
  const { user } = await createHouseholdWithOwner({
    householdName: `${displayName}'s Family`,
    inviteCode: generateInviteCode(),
    username,
    passwordHash,
    displayName,
    googleId: profile.googleId,
    email: profile.email || undefined,
  });
  await startSession(user.id);
  return { ok: true };
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  jar.delete(SESSION_COOKIE);
  jar.delete("active_profile_id");
  redirect("/login");
}

export type Session = { userId: number; householdId: number };

/** The current session (user + household), or null if not authenticated / session expired. */
export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await getSessionByToken(token);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    await deleteSession(token);
    return null;
  }

  const user = await getUser(session.userId);
  if (!user) return null;

  return { userId: user.id, householdId: user.householdId };
}

/** Redirects to /login if there's no authenticated session. Call from protected layouts. */
export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** The profile id the logged-in account owns and is allowed to edit. */
export async function getOwnProfileId(): Promise<number | null> {
  const session = await getSession();
  if (!session) return null;
  const profile = await getProfileByUserId(session.userId);
  return profile?.id ?? null;
}

/** Throws if `profileId` isn't the logged-in account's own profile — guards every mutating action. */
export async function assertOwnProfile(profileId: number): Promise<void> {
  const ownId = await getOwnProfileId();
  if (ownId === null || profileId !== ownId) {
    throw new Error("You can only view your family member's data, not edit it.");
  }
}
