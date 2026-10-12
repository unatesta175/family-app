import Link from "next/link";
import { loadFinanceContext } from "@/lib/finance-data";
import { getAccountsByProfiles, getTransactionsByProfiles } from "@/lib/db/repo-finance";
import { colorHex } from "@/lib/habits";
import { addDays } from "@/lib/date";
import { NetWorthTrendChart, CategoryBreakdownChart, type NetWorthPoint, type CategorySlice } from "@/components/finance/net-worth-chart";
import { Card } from "@/components/finance/ui/card";
import { cn } from "@/lib/utils";

export const metadata = { title: "Net worth" };

const money = (n: number) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function NetWorthPage({ searchParams }: { searchParams: Promise<{ member?: string; household?: string }> }) {
  const sp = await searchParams;
  const ctx = await loadFinanceContext(sp.member);
  const combined = sp.household === "1" && !ctx.readOnly && ctx.household.length > 1;

  const profileIds = combined ? ctx.household.map((p) => p.id) : [ctx.viewingId];
  const accounts = combined ? await getAccountsByProfiles(profileIds) : ctx.accounts;
  const visibleAccounts = (combined ? accounts.filter((a) => a.profileId === ctx.viewerId || a.isShared) : accounts).filter((a) => !a.archivedAt);
  const currentNetWorth = visibleAccounts.reduce((s, a) => s + a.balance, 0);

  const since = addDays(ctx.today, -29);
  const allTx = await getTransactionsByProfiles(profileIds, { from: since });
  const visibleTx = combined ? allTx.filter((t) => t.profileId === ctx.viewerId || t.isShared) : ctx.readOnly ? allTx.filter((t) => t.isShared) : allTx;

  // Walk backwards from today's balance, undoing each day's transactions, to build a 30-day trend.
  const byDate = new Map<string, number>();
  for (const t of visibleTx) {
    const signed = t.type === "income" ? t.amount : t.type === "expense" ? -t.amount : 0;
    byDate.set(t.date, (byDate.get(t.date) ?? 0) + signed);
  }
  const points: NetWorthPoint[] = [];
  let running = currentNetWorth;
  for (let i = 0; i < 30; i++) {
    const date = addDays(ctx.today, -i);
    points.push({ date, label: date.slice(5), netWorth: running });
    running -= byDate.get(date) ?? 0;
  }
  points.reverse();

  const expenses = visibleTx.filter((t) => t.type === "expense");

  const categoryTotals = new Map<number | null, number>();
  for (const e of expenses) categoryTotals.set(e.categoryId, (categoryTotals.get(e.categoryId) ?? 0) + e.amount);
  const categoryById = new Map(ctx.categories.map((c) => [c.id, c]));
  const slices: CategorySlice[] = [...categoryTotals.entries()]
    .map(([id, value]) => {
      const cat = id ? categoryById.get(id) : null;
      return { name: cat?.name ?? "Uncategorised", value, color: colorHex(cat?.color ?? "slate") };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const dailyTotals = new Map<string, number>();
  for (const e of expenses) dailyTotals.set(e.date, (dailyTotals.get(e.date) ?? 0) + e.amount);
  const days = [...dailyTotals.entries()];
  const avgDaily = days.length ? days.reduce((s, [, v]) => s + v, 0) / days.length : 0;
  const highest = days.sort((a, b) => b[1] - a[1])[0] ?? null;

  const thisMonth = ctx.today.slice(0, 7);
  const lastMonthDate = addDays(`${thisMonth}-01`, -1);
  const lastMonth = lastMonthDate.slice(0, 7);
  const spentThisMonth = expenses.filter((e) => e.date.startsWith(thisMonth)).reduce((s, e) => s + e.amount, 0);
  const spentLastMonth = expenses.filter((e) => e.date.startsWith(lastMonth)).reduce((s, e) => s + e.amount, 0);
  const momDelta = spentLastMonth > 0 ? Math.round(((spentThisMonth - spentLastMonth) / spentLastMonth) * 100) : null;

  const income = visibleTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const savingsRate = income > 0 ? Math.round(((income - spentThisMonth) / income) * 100) : null;

  return (
    <div className="flex flex-col gap-4 md:mx-auto md:max-w-4xl">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Net worth{combined ? " · household" : ""}</p>
          <h1 className="text-2xl font-extrabold tracking-tight">{money(currentNetWorth)}</h1>
        </div>
        {!ctx.readOnly && ctx.household.length > 1 && (
          <Link
            href={`/finance/net-worth${combined ? "" : "?household=1"}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
              combined ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"
            )}
          >
            {combined ? "Viewing combined" : "View combined"}
          </Link>
        )}
      </div>

      <Card className="p-4">
        <NetWorthTrendChart series={points} />
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Avg daily spend" value={money(avgDaily)} />
        <Stat label="Highest spend day" value={highest ? `${money(highest[1])}` : "—"} sub={highest?.[0]} />
        <Stat label="Savings rate" value={savingsRate === null ? "—" : `${savingsRate}%`} />
        <Stat label="Vs. last month" value={momDelta === null ? "—" : `${momDelta > 0 ? "+" : ""}${momDelta}%`} tone={momDelta !== null && momDelta > 0 ? "bad" : "good"} />
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Spend by category (30 days)</h2>
        <Card className="p-4">
          {slices.length === 0 ? <p className="text-sm text-muted-foreground">No spending recorded yet.</p> : <CategoryBreakdownChart slices={slices} />}
        </Card>
      </section>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "bad" }) {
  return (
    <Card className="flex flex-col gap-1 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-extrabold tabular-nums", tone === "bad" && "text-destructive", tone === "good" && "text-success")}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </Card>
  );
}
