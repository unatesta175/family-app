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
import { Card } from "@/components/finance/ui/card";
import { Badge } from "@/components/finance/ui/badge";
import { cn } from "@/lib/utils";

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

      {/* Today vs daily budget — the core overspend indicator */}
      <Card className={cn("h-card gap-3 border-h-border bg-h-surface p-5 py-5 text-h-fg", overBudget && "ring-2 ring-h-bad")}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-h-muted">Spent today</p>
          {overBudget && (
            <Badge className="gap-1 border-transparent bg-h-break-soft text-[11px] text-h-bad">
              <AlertTriangle className="h-3 w-3" />
              Over budget
            </Badge>
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
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="h-card gap-1 border-h-border bg-h-surface p-4 py-4 text-h-fg">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-h-muted">
            <TrendingDown className="h-3.5 w-3.5" />
            Predicted tomorrow
          </p>
          <p className="text-xl font-extrabold tabular-nums">{money(prediction.amount)}</p>
          <p className="text-[11px] text-h-muted">
            {prediction.confident ? "Based on your last 2-4 weeks, weekday-weighted." : "Not enough history yet — rough estimate only."}
          </p>
        </Card>
        <Card className="h-card gap-1 border-h-border bg-h-surface p-4 py-4 text-h-fg">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-h-muted">
            <CalendarClock className="h-3.5 w-3.5" />
            Payday
          </p>
          <p className="text-xl font-extrabold tabular-nums">{paydayDays === null ? "—" : paydayDays === 0 ? "Today" : `${paydayDays}d`}</p>
          <p className="text-[11px] text-h-muted">{paydayDays === null ? "Set payday in Settings" : "until your next payday"}</p>
        </Card>
      </div>

      {runOutDay !== null && (
        <Card className="h-card flex-row items-center gap-3 border-h-border border-l-4 border-l-h-bad bg-h-surface p-4 py-4 text-h-fg">
          <AlertTriangle className="h-5 w-5 shrink-0 text-h-bad" />
          <p className="text-sm font-bold">
            At this pace, you&apos;ll hit RM0 of this month&apos;s budget by day {runOutDay} of {dim}.
          </p>
        </Card>
      )}

      {hasPartner && householdTotal !== null && (
        <Card className="h-card flex-row items-center justify-between border-h-border bg-h-surface p-4 py-4 text-h-fg">
          <p className="text-xs font-bold uppercase tracking-wider text-h-muted">Household spent today (shared)</p>
          <p className="text-lg font-extrabold tabular-nums">{money(householdTotal)}</p>
        </Card>
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
        <Card className="h-card border-h-border bg-h-surface p-2 py-2 text-h-fg">
          <TransactionList transactions={recent} accounts={ctx.accounts} categories={ctx.categories} readOnly={ctx.readOnly} />
        </Card>
      </section>
    </div>
  );
}
