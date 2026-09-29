import "server-only";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const STATE_COOKIE = "google_oauth_state";

/** Kicks off the Google OAuth flow: redirects to Google's consent screen with a CSRF state token. */
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Google sign-in isn't configured on this server." }, { status: 500 });
  }

  const state = randomBytes(24).toString("hex");
  const redirectUri = new URL("/api/auth/google/callback", req.nextUrl.origin).toString();

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(STATE_COOKIE, state, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 10,
  });
  return res;
}
