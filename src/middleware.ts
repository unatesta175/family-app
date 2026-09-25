import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/login", "/welcome"]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authed = Boolean(req.cookies.get("auth_user")?.value);

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

  if (authed && PUBLIC_PATHS.has(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|api).*)",
  ],
};
