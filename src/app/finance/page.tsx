import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock, TrendingDown } from "lucide-react";
import { loadFinanceContext } from "@/lib/finance-data";
import {
  computeDailyBudget,
  daysInMonth,
  daysUntilPayday,
  getTransactionsByProfiles,
  predictTomorrowSpend,
  projectRunOutDay,
  type DaySpend,
} from "@/lib/db/repo-finance";
import { addDays } from "@/lib/date";
import { QuickAddButton } from "@/components/finance/quick-add";
import { TransactionList } from "@/components/finance/transaction-list";
import { AccountHeroCarousel, type AccountStats } from "@/components/finance/account-hero-carousel";
import { cn } from "@/lib/utils";

const APP_NAME = "Istiqamahly";

export const metadata = { title: "Dashboard" };

const money = (n: number) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function FinanceDashboardPage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const sp = await searchParams;
  const ctx = await loadFinanceContext(sp.member);
  const today = ctx.today;

  const monthStart = `${today.slice(0, 7)}-01`;
  const historyStart = addDays(today, -35);

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
  const dailyBudget = computeDailyBudget(monthlyIncome, override, today);
  const overBudget = dailyBudget > 0 && todaySpend > dailyBudget;
  const pctOfBudget = dailyBudget > 0 ? Math.round((todaySpend / dailyBudget) * 100) : 0;

  const spentThisMonth = expenses.filter((e) => e.date >= monthStart && e.date <= today).reduce((s, e) => s + e.amount, 0);
  const currentDay = Number(today.slice(8, 10));
  const dim = daysInMonth(today);
  const runOutDay = projectRunOutDay(monthlyIncome, spentThisMonth, currentDay, dim);

  const paydayDays = ctx.budget ? daysUntilPayday(ctx.budget.paydayDay, today) : null;

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
    <div className="flex flex-col gap-5 md:mx-auto md:max-w-4xl">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-h-muted">{ctx.readOnly ? "Partner's finances" : "Today"}</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Finance</h1>
      </div>

      {heroAccounts.length > 0 && (
        <AccountHeroCarousel accounts={heroAccounts} statsByAccount={statsByAccount} appName={APP_NAME} />
      )}

      {/* Today vs daily budget — the core overspend indicator */}
      <div className={cn("h-card flex flex-col gap-3 p-5", overBudget && "ring-2 ring-h-bad")}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-h-muted">Spent today</p>
          {overBudget && (
            <span className="flex items-center gap-1 rounded-full bg-h-break-soft px-2.5 py-1 text-[11px] font-extrabold text-h-bad">
              <AlertTriangle className="h-3 w-3" />
              Over budget
            </span>
          )}
        </div>
        <p className={cn("text-4xl font-extrabold tabular-nums", overBudget ? "text-h-bad" : "text-h-fg")}>{money(todaySpend)}</p>
        {dailyBudget > 0 ? (
          <>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-h-surface2">
              <div
                className={cn("h-full rounded-full transition-all", overBudget ? "bg-h-bad" : "bg-h-brand")}
                style={{ width: `${Math.min(100, pctOfBudget)}%` }}
              />
            </div>
            <p className="text-xs font-semibold text-h-muted">
              {pctOfBudget}% of your {money(dailyBudget)}/day budget
              {!ctx.budget?.dailyBudgetOverride && " (from monthly income ÷ days in month)"}
            </p>
          </>
        ) : (
          <Link href="/finance/settings" className="text-xs font-bold text-h-brand">
            Set your monthly income to see a daily budget →
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="h-card flex flex-col gap-1 p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-h-muted">
            <TrendingDown className="h-3.5 w-3.5" />
            Predicted tomorrow
          </p>
          <p className="text-xl font-extrabold tabular-nums">{money(prediction.amount)}</p>
          <p className="text-[11px] text-h-muted">
            {prediction.confident ? "Based on your last 2-4 weeks, weekday-weighted." : "Not enough history yet — rough estimate only."}
          </p>
        </div>
        <div className="h-card flex flex-col gap-1 p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-h-muted">
            <CalendarClock className="h-3.5 w-3.5" />
            Payday
          </p>
          <p className="text-xl font-extrabold tabular-nums">{paydayDays === null ? "—" : paydayDays === 0 ? "Today" : `${paydayDays}d`}</p>
          <p className="text-[11px] text-h-muted">{paydayDays === null ? "Set payday in Settings" : "until your next payday"}</p>
        </div>
      </div>

{(runOutDay !== null || prediction.confident) && (
        <div className="h-card flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", runOutDay !== null ? "bg-h-bad" : "bg-h-good")} />
            <p className="text-sm font-bold">
              {runOutDay !== null
                ? `At this pace, you'll hit RM0 of this month's budget by day ${runOutDay} of ${dim} — tomorrow's spend is predicted at ${money(prediction.amount)}.`
                : `On track this month. Tomorrow's spend is predicted at ${money(prediction.amount)}.`}
            </p>
          </div>
          <Link href="/finance/transactions" className="shrink-0 text-xs font-bold text-h-brand">
            Ask for advice →
          </Link>
        </div>
      )}

      {hasPartner && householdTotal !== null && (
        <div className="h-card flex items-center justify-between p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-h-muted">Household spent today (shared)</p>
          <p className="text-lg font-extrabold tabular-nums">{money(householdTotal)}</p>
        </div>
      )}

      {!ctx.readOnly && (
        <div className="flex items-center gap-2">
          <QuickAddButton accounts={ctx.accounts} categories={ctx.categories} />
          <Link href="/finance/transactions" className="text-xs font-bold text-h-muted hover:text-h-fg">
            View all transactions
          </Link>
        </div>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-h-muted">Recent activity</h2>
          <Link href="/finance/transactions" className="flex items-center gap-1 text-xs font-bold text-h-brand">
            See all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="h-card p-2">
          <TransactionList transactions={recent} accounts={ctx.accounts} categories={ctx.categories} readOnly={ctx.readOnly} />
        </div>
      </section>
    </div>
  );
}
