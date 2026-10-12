import { Wallet } from "lucide-react";
import { loadFinanceContext } from "@/lib/finance-data";
import { getBillPayments, getBillsByProfile } from "@/lib/db/repo-finance";
import { BillFormButton } from "@/components/finance/bill-form";
import { BillRowItem } from "@/components/finance/bill-row";
import { Card } from "@/components/finance/ui/card";

export const metadata = { title: "Bills" };

export default async function BillsPage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const { member } = await searchParams;
  const ctx = await loadFinanceContext(member);
  const bills = (await getBillsByProfile(ctx.viewingId)).filter((b) => !b.archivedAt);
  const payments = await getBillPayments(bills.map((b) => b.id));
  const month = ctx.today.slice(0, 7);
  const paymentByBill = new Map(payments.filter((p) => p.month === month).map((p) => [p.billId, p]));

  const totalDue = bills.reduce((s, b) => s + (paymentByBill.get(b.id)?.amountPaid ?? b.amount), 0);
  const totalPaid = bills.filter((b) => paymentByBill.get(b.id)?.paidAt).reduce((s, b) => s + (paymentByBill.get(b.id)?.amountPaid ?? b.amount), 0);

  return (
    <div className="flex flex-col gap-4 md:mx-auto md:max-w-2xl">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">This month</p>
          <h1 className="text-2xl font-extrabold tracking-tight">
            RM {totalPaid.toFixed(2)} / {totalDue.toFixed(2)} paid
          </h1>
        </div>
        {!ctx.readOnly && <BillFormButton categories={ctx.categories} />}
      </div>

      {bills.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent text-primary">
            <Wallet className="h-7 w-7" />
          </span>
          <p className="text-base font-extrabold">No recurring bills yet</p>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">Add your rent, utilities, and subscriptions so nothing slips past due.</p>
        </Card>
      ) : (
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
      )}
    </div>
  );
}
