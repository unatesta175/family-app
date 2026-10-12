import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import {
  claimOverspendAlertSlot,
  computeAdaptiveDailyBudget,
  computeDailyBudget,
  daysUntilPayday,
  getBudgetSettings,
  getTransactionsByProfiles,
} from "@/lib/db/repo-finance";
import { getSubscriptionsForProfile } from "@/lib/db/repo-notifications";
import { pushConfigured, sendToSubscriptions } from "@/lib/push";
import { todayIso } from "@/lib/date";

// Same shape as src/app/api/cron/prayer-reminders: a shared-secret-guarded backstop an external
// cron (or uptime pinger) can hit. Checks every profile with a monthly income set; if today's
// spend has crossed the (flat or adaptive) daily budget, sends one push — idempotent per profile
// per day via `finance_overspend_alerts`'s unique index, claimed before sending.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Cron endpoint disabled (set CRON_SECRET)." }, { status: 503 });

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  if (!pushConfigured()) return NextResponse.json({ ok: true, scanned: 0, sent: 0 });

  const today = todayIso();
  const monthStart = `${today.slice(0, 7)}-01`;
  const allProfiles = await db.select({ id: profiles.id }).from(profiles);

  let scanned = 0;
  let sent = 0;

  for (const { id: profileId } of allProfiles) {
    try {
      const budget = await getBudgetSettings(profileId);
      if (!budget || budget.monthlyIncome <= 0) continue;
      scanned++;

      const monthTx = await getTransactionsByProfiles([profileId], { from: monthStart, to: today, type: "expense" });
      const spentThisMonth = monthTx.reduce((s, t) => s + t.amount, 0);
      const todaySpend = monthTx.filter((t) => t.date === today).reduce((s, t) => s + t.amount, 0);

      let dailyBudget = computeDailyBudget(budget.monthlyIncome, budget.dailyBudgetOverride, today);
      if (budget.adaptiveBudget) {
        const remainingDaysToPayday = daysUntilPayday(budget.paydayDay, today) + 1;
        dailyBudget = computeAdaptiveDailyBudget(budget.monthlyIncome, spentThisMonth - todaySpend, remainingDaysToPayday);
      }
      if (dailyBudget <= 0 || todaySpend <= dailyBudget) continue;

      const subs = await getSubscriptionsForProfile(profileId);
      if (subs.length === 0) continue;

      // Claim the day's slot first — a second overlapping run for the same profile/day no-ops.
      if (!(await claimOverspendAlertSlot(profileId, today))) continue;

      sent += await sendToSubscriptions(subs, {
        title: "Over your daily budget",
        body: `You've spent RM ${todaySpend.toFixed(2)} today, over your RM ${dailyBudget.toFixed(2)}/day budget.`,
        url: "/finance",
        tag: "finance-overspend",
      });
    } catch (err) {
      console.error(`[finance-overspend] profile ${profileId} failed`, err);
    }
  }

  return NextResponse.json({ ok: true, scanned, sent });
}
