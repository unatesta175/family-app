import { Wallet } from "lucide-react";
import { loadFinanceContext } from "@/lib/finance-data";
import { getTransactionsByProfiles } from "@/lib/db/repo-finance";
import { AccountFormButton } from "@/components/finance/account-form";
import { AccountRowList } from "@/components/finance/account-row-list";
import { TransfersPanel } from "@/components/finance/transfers-panel";
import { Card } from "@/components/finance/ui/card";

export const metadata = { title: "Accounts" };

export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const { member } = await searchParams;
  const ctx = await loadFinanceContext(member);
  const accounts = ctx.accounts.filter((a) => !a.archivedAt);
  const total = accounts.reduce((sum, a) => sum + a.balance, 0);

  const allTx = await getTransactionsByProfiles([ctx.viewingId]);
  const transfers = (ctx.readOnly ? allTx.filter((t) => t.isShared) : allTx).filter((t) => t.type === "transfer");

  return (
    <div className="flex flex-col gap-6 md:mx-auto md:max-w-4xl">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Available funds</p>
        <h1 className="text-3xl font-extrabold tracking-tight tabular-nums">
          RM {total.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h1>
        <p className="text-xs font-semibold text-muted-foreground">Across {accounts.length} account{accounts.length === 1 ? "" : "s"}</p>
      </div>

      <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
        <section className="flex flex-col gap-2">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Accounts</h2>
            {!ctx.readOnly && <AccountFormButton />}
          </div>

          {accounts.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 p-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent text-primary">
                <Wallet className="h-7 w-7" />
              </span>
              <p className="text-base font-extrabold">No accounts yet</p>
              <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                Add your bank, e-wallet, or cash on hand to start tracking where your money lives.
              </p>
            </Card>
          ) : (
            <Card className="p-1">
              <AccountRowList accounts={accounts} readOnly={ctx.readOnly} />
            </Card>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Transfers</h2>
          <TransfersPanel accounts={accounts} transfers={transfers} readOnly={ctx.readOnly} />
        </section>
      </div>
    </div>
  );
}
