import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { loadFinanceContext } from "@/lib/finance-data";
import {
  computeAdaptiveDailyBudget,
  computeDailyBudget,
  computeSafeToSpendToday,
  computeWeeklyDigest,
  daysInMonth,
  daysUntilPayday,
  getBillPayments,
  getBillsByProfile,
  getCategoryTrends,
  getTransactionsByProfiles,
  getWeekdaySpendPattern,
  predictTomorrowSpend,
  projectMonthEndSavings,
  projectRunOutDay,
  type DaySpend,
} from "@/lib/db/repo-finance";
import { billDueDateInMonth } from "@/lib/finance-bills";
import { addDays } from "@/lib/date";
import { QuickAddButton } from "@/components/finance/quick-add";
import { TransactionFormButton } from "@/components/finance/transaction-form";
import { TransactionList } from "@/components/finance/transaction-list";
import { AccountHeroCarousel, type AccountStats } from "@/components/finance/account-hero-carousel";
import { Badge } from "@/components/finance/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/finance/ui/card";
import { cn } from "@/lib/utils";

const APP_NAME = "Istiqamahly";

export const metadata = { title: "Dashboard" };

const money = (n: number) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 20) return "Good evening";
  return "Good night";
}

export default async function FinanceDashboardPage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const sp = await searchParams;
  const ctx = await loadFinanceContext(sp.member);
  const today = ctx.today;

  const monthStart = `${today.slice(0, 7)}-01`;
  const historyStart = addDays(today, -56); // ~8 weeks, enough for the weekday pattern too

  const allTx = await getTransactionsByProfiles([ctx.viewingId], { from: historyStart });
  const visibleTx = ctx.readOnly ? allTx.filter((t) => t.isShared) : allTx;
  const expenses = visibleTx.filter((t) => t.type === "expense");

  // Daily totals for the prediction formula.
  const byDate = new Map<string, number>();
  for (const e of expenses) byDate.set(e.date, (byDate.get(e.date) ?? 0) + e.amount);
  const history: DaySpend[] = [...byDate.entries()].map(([date, amount]) => ({ date, amount }));

  const todaySpend = byDate.get(today) ?? 0;
  const tomorrow = addDays(today, 1);
  const prediction = predictTomorrowSpend(history, tomorrow);

  const monthlyIncome = ctx.budget?.monthlyIncome ?? 0;
  const override = ctx.budget?.dailyBudgetOverride ?? null;
  const flatDailyBudget = computeDailyBudget(monthlyIncome, override, today);

  const spentThisMonth = expenses.filter((e) => e.date >= monthStart && e.date <= today).reduce((s, e) => s + e.amount, 0);
  const currentDay = Number(today.slice(8, 10));
  const dim = daysInMonth(today);
  const runOutDay = projectRunOutDay(monthlyIncome, spentThisMonth, currentDay, dim);
  const projectedLeftover = projectMonthEndSavings(monthlyIncome, spentThisMonth, currentDay, dim);

  const paydayDays = ctx.budget ? daysUntilPayday(ctx.budget.paydayDay, today) : null;

  // Adaptive daily budget (opt-in): remaining monthly budget / remaining days to payday, so one
  // overspend or underspend day shifts tomorrow's number. Off (default) keeps the flat behavior.
  const remainingDaysToPayday = (paydayDays ?? Math.max(0, dim - currentDay)) + 1; // +1 counts today
  const dailyBudget = ctx.budget?.adaptiveBudget
    ? computeAdaptiveDailyBudget(monthlyIncome, spentThisMonth - todaySpend, remainingDaysToPayday)
    : flatDailyBudget;
  const overBudget = dailyBudget > 0 && todaySpend > dailyBudget;
  const pctOfBudget = dailyBudget > 0 ? Math.round((todaySpend / dailyBudget) * 100) : 0;

  // Reserve: unpaid bills due this cycle, spread evenly over the remaining days to payday so
  // "safe to spend today" already sets aside a slice for them. Reminders have no amount field in
  // the schema (they're a separate, amount-less list from Bills), so they're informational only
  // here, not part of the money reserve.
  const bills = ctx.readOnly ? [] : await getBillsByProfile(ctx.viewingId);
  const thisMonth = today.slice(0, 7);
  const activeBills = bills.filter((b) => !b.archivedAt && billDueDateInMonth(b, thisMonth) !== null);
  const payments = await getBillPayments(activeBills.map((b) => b.id));
  const paidThisMonth = new Set(payments.filter((p) => p.month === thisMonth).map((p) => p.billId));
  const unpaidBillsTotal = activeBills.filter((b) => !paidThisMonth.has(b.id)).reduce((s, b) => s + b.amount, 0);
  const dailyReserve = remainingDaysToPayday > 0 ? unpaidBillsTotal / remainingDaysToPayday : unpaidBillsTotal;
  const safeToSpendToday = dailyBudget > 0 ? computeSafeToSpendToday(dailyBudget, todaySpend, dailyReserve) : null;

  const weekdayPattern = getWeekdaySpendPattern(history).filter((w) => w.flagged);
  const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const categoryTrends = ctx.readOnly ? [] : await getCategoryTrends(ctx.viewingId, today.slice(0, 7));
  const risingCategories = categoryTrends
    .filter((t) => t.trendingUp)
    .sort((a, b) => (b.pctChange ?? 0) - (a.pctChange ?? 0))
    .slice(0, 2);
  const categoryNameById = new Map(ctx.categories.map((c) => [c.id, c.name]));

  const weeklyDigest = computeWeeklyDigest(
    expenses.map((e) => ({ date: e.date, amount: e.amount, categoryId: e.categoryId })),
    today,
    dailyBudget
  );

  const recent = visibleTx.slice(0, 8);

  const monthTx = visibleTx.filter((t) => t.date >= monthStart && t.date <= today);
  const statsByAccount = new Map<number, AccountStats>();
  for (const t of monthTx) {
    const entry = statsByAccount.get(t.accountId) ?? { income: 0, spending: 0 };
    if (t.type === "income") entry.income += t.amount;
    else if (t.type === "expense") entry.spending += t.amount;
    statsByAccount.set(t.accountId, entry);
  }
  const heroAccounts = ctx.accounts.filter((a) => !a.archivedAt);

  const viewerName = ctx.household.find((p) => p.id === ctx.viewerId)?.name ?? "";
  const dateLabel = new Date(`${today}T00:00:00`).toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long" });

  const hasPartner = ctx.household.length > 1;
  const householdTotal = hasPartner
    ? await (async () => {
        const partnerId = ctx.household.find((p) => p.id !== ctx.viewerId)?.id;
        if (!partnerId) return null;
        const partnerTx = await getTransactionsByProfiles([partnerId], { from: today, to: today });
        const partnerShared = partnerTx.filter((t) => t.isShared && t.type === "expense");
        const mine = allTx.filter((t) => t.date === today && t.type === "expense" && t.isShared);
        return mine.reduce((s, t) => s + t.amount, 0) + partnerShared.reduce((s, t) => s + t.amount, 0);
      })()
    : null;

  return (
    <div className="flex flex-col gap-5 md:mx-auto md:max-w-5xl">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {ctx.readOnly ? `${viewerName ? viewerName + "'s view of " : ""}partner's finances` : `${greeting(new Date().getHours())}, ${viewerName}`}
          </h1>
          <p className="text-sm text-muted-foreground">{dateLabel}</p>
        </div>
        {!ctx.readOnly && <TransactionFormButton accounts={ctx.accounts} categories={ctx.categories} label="Add transaction" />}
      </div>

      {/* Hero: account card paired with today's single most actionable number, side by side on
          desktop — mirrors a typical finance-app home layout (account card + "this period" detail). */}
      <div className="grid gap-4 lg:grid-cols-2">
        {heroAccounts.length > 0 && (
          <AccountHeroCarousel
            accounts={heroAccounts}
            statsByAccount={statsByAccount}
            appName={APP_NAME}
            readOnly={ctx.readOnly}
          />
        )}

        {/* Safe to spend today — the single most actionable number: daily budget minus what's
            already spent today minus a daily slice set aside for upcoming unpaid bills. */}
        {safeToSpendToday !== null && (
          <Card className={cn("@container/card shadow-xs", safeToSpendToday < 0 && "ring-2 ring-destructive")}>
            <CardHeader>
              <CardDescription>Safe to spend today</CardDescription>
              <CardTitle className={cn("text-2xl font-semibold tabular-nums @[250px]/card:text-3xl", safeToSpendToday < 0 && "text-destructive")}>
                {money(Math.max(0, safeToSpendToday))}
              </CardTitle>
              <CardAction>
                <Badge className="border-transparent bg-blue-500/10 text-blue-600">
                  <ShieldCheck className="size-3.5" />
                  {ctx.budget?.adaptiveBudget ? "Adaptive" : "Daily"}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                {safeToSpendToday < 0 ? "Over what's safe for today" : "On track for today"}
              </div>
              <div className="text-muted-foreground">
                {safeToSpendToday < 0
                  ? `You're ${money(Math.abs(safeToSpendToday))} past what's safe for today.`
                  : dailyReserve > 0
                    ? `${money(dailyBudget)}/day budget, minus ${money(todaySpend)} spent and ${money(dailyReserve)} set aside for unpaid bills.`
                    : `${money(dailyBudget)}/day budget minus ${money(todaySpend)} spent so far.`}
              </div>
            </CardFooter>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs @md/main:grid-cols-2">
        {/* Today vs daily budget — the core overspend indicator */}
        <Card className={cn("@container/card", overBudget && "ring-2 ring-destructive")}>
          <CardHeader>
            <CardDescription>Spent today</CardDescription>
            <CardTitle className={cn("text-2xl font-semibold tabular-nums @[250px]/card:text-3xl", overBudget && "text-destructive")}>
              {money(todaySpend)}
            </CardTitle>
            <CardAction>
              {overBudget ? (
                <Badge variant="destructive">
                  <AlertTriangle className="size-3.5" />
                  Over budget
                </Badge>
              ) : (
                <Badge className="border-transparent bg-blue-500/10 text-blue-600">
                  <TrendingUp className="size-3.5" />
                  {dailyBudget > 0 ? `${pctOfBudget}%` : "No budget"}
                </Badge>
              )}
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            {dailyBudget > 0 ? (
              <>
                <div className="line-clamp-1 flex gap-2 font-medium">
                  {pctOfBudget}% of your {money(dailyBudget)}/day budget
                </div>
                <div className="text-muted-foreground">
                  {ctx.budget?.adaptiveBudget ? "Adaptive, recalculated daily" : !ctx.budget?.dailyBudgetOverride && "From monthly income ÷ days in month"}
                </div>
              </>
            ) : (
              <Link href="/finance/settings" className="font-medium text-primary">
                Set your monthly income to see a daily budget →
              </Link>
            )}
          </CardFooter>
        </Card>

        {/* Projected month-end savings/shortfall */}
        {projectedLeftover !== null && (
          <Card className={cn("@container/card", projectedLeftover < 0 && "ring-2 ring-destructive")}>
            <CardHeader>
              <CardDescription>Projected by payday, at this pace</CardDescription>
              <CardTitle className={cn("text-2xl font-semibold tabular-nums @[250px]/card:text-3xl", projectedLeftover < 0 ? "text-destructive" : "text-success")}>
                {projectedLeftover < 0 ? `− ${money(Math.abs(projectedLeftover))}` : money(projectedLeftover)}
              </CardTitle>
              <CardAction>
                <Badge className={cn("border-transparent", projectedLeftover < 0 ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success")}>
                  {projectedLeftover < 0 ? <TrendingDown className="size-3.5" /> : <TrendingUp className="size-3.5" />}
                  {projectedLeftover < 0 ? "Shortfall" : "Leftover"}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="text-muted-foreground">
                {projectedLeftover < 0 ? "Projected shortfall before payday if this pace continues." : "Projected leftover if this pace continues."}
              </div>
            </CardFooter>
          </Card>
        )}

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Predicted tomorrow</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{money(prediction.amount)}</CardTitle>
            <CardAction>
              <Badge className={cn("border-transparent", prediction.confident ? "bg-success/10 text-success" : "bg-amber-500/10 text-amber-600")}>
                <TrendingDown className="size-3.5" />
                {prediction.confident ? "Confident" : "Estimate"}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="text-muted-foreground">
              {prediction.confident ? "Based on your last 2-4 weeks, weekday-weighted." : "Not enough history yet — rough estimate only."}
            </div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Payday</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {paydayDays === null ? "—" : paydayDays === 0 ? "Today" : `${paydayDays}d`}
            </CardTitle>
            <CardAction>
              <Badge className="border-transparent bg-violet-500/10 text-violet-600">
                <CalendarClock className="size-3.5" />
                Payday
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="text-muted-foreground">{paydayDays === null ? "Set payday in Settings" : "until your next payday"}</div>
          </CardFooter>
        </Card>
      </div>

{(runOutDay !== null || prediction.confident) && (
        <Card className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", runOutDay !== null ? "bg-destructive" : "bg-success")} />
            <p className="text-sm font-bold">
              {runOutDay !== null
                ? `At this pace, you'll hit RM0 of this month's budget by day ${runOutDay} of ${dim} — tomorrow's spend is predicted at ${money(prediction.amount)}.`
                : `On track this month. Tomorrow's spend is predicted at ${money(prediction.amount)}.`}
            </p>
          </div>
          <Link href="/finance/transactions" className="shrink-0 text-xs font-bold text-primary">
            Ask for advice →
          </Link>
        </Card>
      )}

      {/* Insights (left, wider) paired with recent activity (right) — side by side on desktop. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          {hasPartner && householdTotal !== null && (
            <Card className="flex items-center justify-between p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Household spent today (shared)</p>
              <p className="text-lg font-extrabold tabular-nums">{money(householdTotal)}</p>
            </Card>
          )}

          {/* Day-of-week spending pattern */}
          {weekdayPattern.length > 0 && (
            <Card className="flex flex-col gap-1.5 p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
                Spending pattern
              </p>
              {weekdayPattern.map((w) => (
                <p key={w.weekday} className="text-sm font-semibold">
                  You spend about {money(w.avg)} on {WEEKDAY_NAMES[w.weekday]}s — well above your usual daily spend.
                </p>
              ))}
            </Card>
          )}

          {/* Category spend trend */}
          {risingCategories.length > 0 && (
            <Card className="flex flex-col gap-1.5 p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-destructive" />
                Trending up this month
              </p>
              {risingCategories.map((t) => (
                <p key={t.categoryId} className="text-sm font-semibold">
                  {categoryNameById.get(t.categoryId) ?? "A category"} is up {Math.round(t.pctChange ?? 0)}% vs last month ({money(t.lastMonth)} → {money(t.thisMonth)}).
                </p>
              ))}
            </Card>
          )}

          {/* Weekly spending digest */}
          {weeklyDigest.thisWeekTotal > 0 && (
            <Card className="@container/card shadow-xs">
              <CardHeader>
                <CardDescription>Last 7 days</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{money(weeklyDigest.thisWeekTotal)}</CardTitle>
                {weeklyDigest.pctChange !== null && (
                  <CardAction>
                    <Badge className={cn("border-transparent", weeklyDigest.pctChange > 0 ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success")}>
                      {weeklyDigest.pctChange > 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                      {weeklyDigest.pctChange > 0 ? "+" : ""}
                      {Math.round(weeklyDigest.pctChange)}%
                    </Badge>
                  </CardAction>
                )}
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="line-clamp-1 flex gap-2 font-medium">
                  {weeklyDigest.daysOverBudget > 0
                    ? `Over budget on ${weeklyDigest.daysOverBudget} of the last 7 days`
                    : "Within budget every day this week"}
                </div>
                <div className="text-muted-foreground">
                  {weeklyDigest.topCategoryId !== null
                    ? `Top category: ${categoryNameById.get(weeklyDigest.topCategoryId) ?? "—"}.`
                    : "vs prior week"}
                </div>
              </CardFooter>
            </Card>
          )}
        </div>

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Recent activity</h2>
            <div className="flex items-center gap-3">
              {!ctx.readOnly && <QuickAddButton accounts={ctx.accounts} categories={ctx.categories} />}
              <Link href="/finance/transactions" className="flex items-center gap-1 text-xs font-bold text-primary">
                See all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
          <Card className="p-2">
            <TransactionList transactions={recent} accounts={ctx.accounts} categories={ctx.categories} readOnly={ctx.readOnly} />
          </Card>
        </section>
      </div>
    </div>
  );
}
