import Link from "next/link";
import { loadFinanceContext } from "@/lib/finance-data";
import { getTransactionsByProfiles, type TransactionFilters } from "@/lib/db/repo-finance";
import { TransactionFormButton } from "@/components/finance/transaction-form";
import { TransactionList } from "@/components/finance/transaction-list";
import { Card } from "@/components/finance/ui/card";
import { cn } from "@/lib/utils";

export const metadata = { title: "Transactions" };

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string; account?: string; category?: string; type?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await loadFinanceContext(sp.member);

  const txType: TransactionFilters["type"] = sp.type === "income" || sp.type === "expense" || sp.type === "transfer" ? sp.type : undefined;
  const filters: TransactionFilters = {
    accountId: sp.account ? Number(sp.account) : undefined,
    categoryId: sp.category ? Number(sp.category) : undefined,
    type: txType,
    from: sp.from,
    to: sp.to,
  };

  const rows = await getTransactionsByProfiles([ctx.viewingId], filters);
  const visible = ctx.readOnly ? rows.filter((r) => r.isShared) : rows;

  const href = (next: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const merged = { ...sp, ...next };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    const qs = q.toString();
    return `/finance/transactions${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-4 md:mx-auto md:max-w-3xl">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-h-muted">Transactions</p>
          <h1 className="text-2xl font-extrabold tracking-tight">{visible.length} entries</h1>
        </div>
        {!ctx.readOnly && <TransactionFormButton accounts={ctx.accounts} categories={ctx.categories} />}
      </div>

      <div className="scrollbar-hide -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
        {["income", "expense", "transfer"].map((t) => (
          <Link
            key={t}
            href={href({ type: sp.type === t ? undefined : t })}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold capitalize transition-colors",
              sp.type === t ? "border-h-brand bg-h-brand text-h-brand-fg" : "border-h-border bg-h-surface text-h-muted hover:text-h-fg"
            )}
          >
            {t}
          </Link>
        ))}
        {ctx.accounts.map((a) => (
          <Link
            key={a.id}
            href={href({ account: sp.account === String(a.id) ? undefined : String(a.id) })}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
              sp.account === String(a.id) ? "border-h-brand bg-h-brand text-h-brand-fg" : "border-h-border bg-h-surface text-h-muted hover:text-h-fg"
            )}
          >
            {a.name}
          </Link>
        ))}
      </div>

      <Card className="h-card border-h-border bg-h-surface p-2 py-2 text-h-fg">
        <TransactionList transactions={visible} accounts={ctx.accounts} categories={ctx.categories} readOnly={ctx.readOnly} />
      </Card>
    </div>
  );
}
