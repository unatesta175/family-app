import "server-only";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { loginOrRegisterWithGoogle } from "@/lib/auth";

const STATE_COOKIE = "google_oauth_state";

type GoogleUserInfo = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
};

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/login?error=google_not_configured", req.nextUrl.origin));
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const expectedState = req.cookies.get(STATE_COOKIE)?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/login?error=google_state_mismatch", req.nextUrl.origin));
  }

  const redirectUri = new URL("/api/auth/google/callback", req.nextUrl.origin).toString();

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/login?error=google_token_exchange_failed", req.nextUrl.origin));
  }

  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    return NextResponse.redirect(new URL("/login?error=google_token_exchange_failed", req.nextUrl.origin));
  }

  const userInfoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!userInfoRes.ok) {
    return NextResponse.redirect(new URL("/login?error=google_profile_fetch_failed", req.nextUrl.origin));
  }

  const profile = (await userInfoRes.json()) as GoogleUserInfo;
  if (!profile.email || !profile.email_verified) {
    return NextResponse.redirect(new URL("/login?error=google_email_unverified", req.nextUrl.origin));
  }

  const result = await loginOrRegisterWithGoogle({
    googleId: profile.sub,
    email: profile.email,
    name: profile.name ?? profile.email.split("@")[0],
  });

  const res = NextResponse.redirect(
    new URL(result.ok ? "/" : `/login?error=${encodeURIComponent(result.error)}`, req.nextUrl.origin)
  );
  res.cookies.delete(STATE_COOKIE);
  return res;
}
