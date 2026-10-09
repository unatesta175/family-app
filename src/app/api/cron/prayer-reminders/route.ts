import { NextResponse } from "next/server";
import { runReminderTick } from "@/lib/notification-scheduler";

// This runs the exact work the in-process ticker does, so an external cron (or an uptime pinger) can
// drive reminders instead of — or as a backstop to — the ticker. Guarded by a shared secret.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Cron endpoint disabled (set CRON_SECRET)." }, { status: 503 });

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const result = await runReminderTick();
  return NextResponse.json({ ok: true, ...result });
}
