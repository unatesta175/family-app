"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Tells the server which time zone this browser is in (as a cookie), so "today" and the clock times
 * on the Focus pages are the user's own, not the server's. The first time it is set (or if the zone
 * changes) the page reloads its data once so it shows the right day.
 */
export function TimezoneCookie() {
  const router = useRouter();
  useEffect(() => {
    const now = String(new Date().getTimezoneOffset());
    const before = document.cookie.split("; ").find((c) => c.startsWith("tzo="))?.slice(4);
    if (before === now) return;
    document.cookie = `tzo=${now}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [router]);
  return null;
}
