import "server-only";
import type { NextRequest } from "next/server";

/**
 * The app's real public origin (e.g. https://istiqamahly.site). Behind the reverse proxy this
 * app runs behind, `req.nextUrl.origin` resolves to the container's bind address
 * (0.0.0.0:3000) rather than the real domain, which breaks anything — like the Google OAuth
 * redirect_uri — that must match a fixed, externally-registered URL. Set APP_URL in production;
 * falls back to the request's own origin for local dev where that's actually correct.
 */
export function getAppUrl(req: NextRequest): string {
  return process.env.APP_URL ?? req.nextUrl.origin;
}
