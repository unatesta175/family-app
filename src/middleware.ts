import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/login", "/register", "/welcome"]);
// Informational pages (linked from Google's OAuth consent screen) that stay reachable
// regardless of auth state, unlike login/register/welcome which redirect once signed in.
const ALWAYS_PUBLIC_PATHS = new Set(["/privacy", "/terms"]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authed = Boolean(req.cookies.get("session")?.value);

  if (ALWAYS_PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  if (!authed) {
    // Unauthenticated visitors hitting the root get the marketing page
    // instead of being dropped straight onto the login form.
    if (pathname === "/") {
      const url = req.nextUrl.clone();
      url.pathname = "/welcome";
      return NextResponse.redirect(url);
    }
    if (!PUBLIC_PATHS.has(pathname)) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  // Redirecting an authed visitor away from /login etc is handled by the pages themselves
  // (via requireAuth's real, DB-backed session check), not here — this cookie check only
  // confirms a `session` cookie is *present*, not that it still points at a live session row.
  // Trusting presence alone here created an infinite redirect loop for anyone holding a stale
  // cookie: middleware bounces /login -> / on presence, the page's real check bounces / ->
  // /login on invalidity, forever.

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|api).*)",
  ],
};
