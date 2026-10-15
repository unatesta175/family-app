import { Wallet } from "lucide-react";
import { loadFinanceContext } from "@/lib/finance-data";
import { getBillPayments, getBillsByProfile } from "@/lib/db/repo-finance";
import { billDueDateInMonth, billNextOccurrence } from "@/lib/finance-bills";
import { BillFormButton } from "@/components/finance/bill-form";
import { BillRowItem, BillUpcomingItem } from "@/components/finance/bill-row";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/finance/ui/card";
import { Badge } from "@/components/finance/ui/badge";
import { Progress } from "@/components/finance/ui/progress";
import { cn } from "@/lib/utils";

export const metadata = { title: "Bills" };

const money = (n: number) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MONTH_LABEL = (iso: string) =>
  new Date(`${iso}-01T00:00:00`).toLocaleDateString("en-MY", { month: "long", year: "numeric" });

export default async function BillsPage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const { member } = await searchParams;
  const ctx = await loadFinanceContext(member);
  const allBills = (await getBillsByProfile(ctx.viewingId)).filter((b) => !b.archivedAt);
  const payments = await getBillPayments(allBills.map((b) => b.id));
  const month = ctx.today.slice(0, 7);
  const paymentByBill = new Map(payments.filter((p) => p.month === month).map((p) => [p.billId, p]));

  // Bills actually due this month (monthly always, yearly/one-time only in their due month).
  const bills = allBills.filter((b) => billDueDateInMonth(b, month) !== null);
  // Yearly/one-time bills not due this month — surfaced separately so nothing slips past months ahead.
  const upcomingBills = allBills
    .filter((b) => b.frequency !== "monthly" && billDueDateInMonth(b, month) === null)
    .sort((a, b) => billNextOccurrence(a, ctx.today).localeCompare(billNextOccurrence(b, ctx.today)));

  const totalDue = bills.reduce((s, b) => s + (paymentByBill.get(b.id)?.amountPaid ?? b.amount), 0);
  const paidBills = bills.filter((b) => paymentByBill.get(b.id)?.paidAt);
  const totalPaid = paidBills.reduce((s, b) => s + (paymentByBill.get(b.id)?.amountPaid ?? b.amount), 0);
  const unpaidBills = bills.filter((b) => !paymentByBill.get(b.id)?.paidAt);
  const overdueBills = unpaidBills.filter((b) => (billDueDateInMonth(b, month) ?? `${month}-01`) < ctx.today);
  const pct = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0;

  const monthlyIncome = ctx.budget?.monthlyIncome ?? 0;
  const incomePct = monthlyIncome > 0 ? Math.round((totalDue / monthlyIncome) * 100) : null;

  return (
    <div className="flex flex-col gap-4 md:mx-auto md:max-w-5xl">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bills</h1>
          <p className="text-sm text-muted-foreground">What&apos;s due each month, and what&apos;s already paid</p>
        </div>
        {!ctx.readOnly && <BillFormButton categories={ctx.categories} />}
      </div>

      {allBills.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent text-primary">
            <Wallet className="h-7 w-7" />
          </span>
          <p className="text-base font-extrabold">No recurring bills yet</p>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">Add your rent, utilities, and subscriptions so nothing slips past due.</p>
        </Card>
      ) : (
        <>
          {bills.length > 0 && (
          <>
          <Card className="@container/card shadow-xs">
            <CardHeader>
              <CardDescription>Bills in {MONTH_LABEL(month)}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{money(totalDue)}</CardTitle>
              <CardAction>
                <Badge variant="outline">
                  {paidBills.length} of {bills.length} paid
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Progress value={pct} />
              <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-lg border border-border">
                <div className="flex flex-col gap-1 p-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Paid</span>
                  <span className="text-lg font-semibold tabular-nums">{money(totalPaid)}</span>
                </div>
                <div className="flex flex-col gap-1 p-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Left to pay</span>
                  <span className="text-lg font-semibold tabular-nums">{money(totalDue - totalPaid)}</span>
                </div>
                <div className="flex flex-col gap-1 p-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Overdue</span>
                  <span className={cn("text-lg font-semibold tabular-nums", overdueBills.length > 0 && "text-destructive")}>
                    {overdueBills.length > 0 ? overdueBills.length : "None"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <section className="flex flex-col gap-2">
              <h2 className="px-1 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">To pay · {unpaidBills.length}</h2>
              <Card className="p-2">
                <ul className="flex flex-col divide-y divide-border">
                  {bills.map((b) => (
                    <BillRowItem
                      key={b.id}
                      bill={b}
                      payment={paymentByBill.get(b.id) ?? null}
                      month={month}
                      today={ctx.today}
                      categories={ctx.categories}
                      readOnly={ctx.readOnly}
                    />
                  ))}
                </ul>
              </Card>
            </section>

            <Card className="h-fit">
              <CardHeader>
                <CardDescription>Against your income</CardDescription>
              </CardHeader>
              <CardContent>
                {incomePct === null ? (
                  <>
                    <p className="text-sm font-bold">No income logged for {MONTH_LABEL(month)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Set your monthly income in Settings to see how much of it your bills take.</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold">Bills take up {incomePct}% of your income</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {money(totalDue)} of {money(monthlyIncome)} monthly income goes to bills this month.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
          </>
          )}

          {upcomingBills.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="px-1 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Upcoming · {upcomingBills.length}</h2>
              <Card className="p-2">
                <ul className="flex flex-col divide-y divide-border">
                  {upcomingBills.map((b) => (
                    <BillUpcomingItem key={b.id} bill={b} today={ctx.today} categories={ctx.categories} readOnly={ctx.readOnly} />
                  ))}
                </ul>
              </Card>
            </section>
          )}
        </>
      )}
    </div>
  );
}
