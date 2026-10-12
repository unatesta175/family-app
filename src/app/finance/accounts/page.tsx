import { Wallet } from "lucide-react";
import { loadFinanceContext } from "@/lib/finance-data";
import { AccountFormButton } from "@/components/finance/account-form";
import { AccountCardClientList } from "@/components/finance/account-card-list";

export const metadata = { title: "Accounts" };

export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const { member } = await searchParams;
  const ctx = await loadFinanceContext(member);
  const accounts = ctx.accounts.filter((a) => !a.archivedAt);
  const total = accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="flex flex-col gap-5 md:mx-auto md:max-w-4xl">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-h-muted">Accounts</p>
          <h1 className="text-2xl font-extrabold tracking-tight">
            RM {total.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h1>
        </div>
        {!ctx.readOnly && <AccountFormButton />}
      </div>

      {accounts.length === 0 ? (
        <div className="h-card flex flex-col items-center gap-3 p-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-h-brand-soft text-h-brand">
            <Wallet className="h-7 w-7" />
          </span>
          <p className="text-base font-extrabold">No accounts yet</p>
          <p className="mx-auto max-w-sm text-sm text-h-muted">Add your bank, e-wallet, or cash on hand to start tracking where your money lives.</p>
        </div>
      ) : (
        <AccountCardClientList accounts={accounts} readOnly={ctx.readOnly} />
      )}
    </div>
  );
}
