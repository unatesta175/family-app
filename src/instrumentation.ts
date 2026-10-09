export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runStartupMigrations } = await import("@/lib/db/migrate");
    await runStartupMigrations();
    // Prayer-reminder ticker: a single interval on this long-running server (no-op if VAPID is unset).
    const { startReminderTicker } = await import("@/lib/notification-scheduler");
    startReminderTicker();
  }
}
