import { PiggyBank } from "lucide-react";
import { loadFinanceContext } from "@/lib/finance-data";
import { getActualSpendByCategory, getMoneyPlanAllocations } from "@/lib/db/repo-finance";
import { MoneyPlanRow } from "@/components/finance/money-plan-row";
import { Card } from "@/components/finance/ui/card";

export const metadata = { title: "Money Plan" };

export default async function MoneyPlanPage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const { member } = await searchParams;
  const ctx = await loadFinanceContext(member);
  const month = ctx.today.slice(0, 7);
  const [allocations, actuals] = await Promise.all([
    getMoneyPlanAllocations(ctx.viewingId, month),
    getActualSpendByCategory(ctx.viewingId, month),
  ]);
  const plannedByCategory = new Map(allocations.map((a) => [a.categoryId, a.plannedAmount]));
  const totalPlanned = allocations.reduce((s, a) => s + a.plannedAmount, 0);
  const totalActual = [...actuals.values()].reduce((s, v) => s + v, 0);

  return (
    <div className="flex flex-col gap-4 md:mx-auto md:max-w-2xl">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Planning · {month}</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Money Plan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          RM {totalActual.toFixed(2)} spent of RM {totalPlanned.toFixed(2)} planned this month.
        </p>
      </div>

      {ctx.categories.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent text-primary">
            <PiggyBank className="h-7 w-7" />
          </span>
          <p className="text-base font-extrabold">No categories yet</p>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">Add spending categories in Settings to start planning envelopes for each one.</p>
        </Card>
      ) : (
        <Card className="p-2">
          <ul className="flex flex-col divide-y divide-border">
            {ctx.categories.map((c) => (
              <MoneyPlanRow
                key={c.id}
                category={c}
                month={month}
                planned={plannedByCategory.get(c.id) ?? 0}
                actual={actuals.get(c.id) ?? 0}
                readOnly={ctx.readOnly}
              />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
