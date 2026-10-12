import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { loadFinanceContext } from "@/lib/finance-data";
import { getTransactionsByProfiles, type TransactionFilters } from "@/lib/db/repo-finance";
import { TransactionFormButton } from "@/components/finance/transaction-form";
import { TransactionsBoard } from "@/components/finance/transactions-board";
import { addMonths, todayIso } from "@/lib/date";

export const metadata = { title: "Transactions" };

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string; account?: string; category?: string; type?: string; month?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await loadFinanceContext(sp.member);

  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : todayIso().slice(0, 7);
  const from = `${month}-01`;
  const to = addMonths(from, 1);
  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString("en-MY", { month: "long", year: "numeric" });

  const txType: TransactionFilters["type"] = sp.type === "income" || sp.type === "expense" || sp.type === "transfer" ? sp.type : undefined;
  const filters: TransactionFilters = {
    accountId: sp.account ? Number(sp.account) : undefined,
    categoryId: sp.category ? Number(sp.category) : undefined,
    type: txType,
    from,
    to,
  };

  const rows = await getTransactionsByProfiles([ctx.viewingId], filters);
  const visible = (ctx.readOnly ? rows.filter((r) => r.isShared) : rows).filter((r) => r.date < to);

  const href = (next: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const merged = { ...sp, month, ...next };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    const qs = q.toString();
    return `/finance/transactions${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-4 md:mx-auto md:max-w-5xl">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-h-muted">Transactions</p>
          <h1 className="text-2xl font-extrabold tracking-tight">{visible.length} entries</h1>
        </div>
        {!ctx.readOnly && <TransactionFormButton accounts={ctx.accounts} categories={ctx.categories} />}
      </div>

      <div className="flex items-center justify-center gap-3">
        <Link href={href({ month: addMonths(from, -1).slice(0, 7) })} className="rounded-full border border-h-border p-1.5 text-h-muted hover:text-h-fg">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <p className="text-sm font-extrabold">{monthLabel}</p>
        <Link href={href({ month: addMonths(from, 1).slice(0, 7) })} className="rounded-full border border-h-border p-1.5 text-h-muted hover:text-h-fg">
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="scrollbar-hide -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
        {["income", "expense", "transfer"].map((t) => (
          <FilterChip key={t} active={sp.type === t} href={href({ type: sp.type === t ? undefined : t })} label={t} />
        ))}
        {ctx.categories.map((c) => (
          <FilterChip
            key={c.id}
            active={sp.category === String(c.id)}
            href={href({ category: sp.category === String(c.id) ? undefined : String(c.id) })}
            label={c.name}
          />
        ))}
        {ctx.accounts.map((a) => (
          <FilterChip
            key={a.id}
            active={sp.account === String(a.id)}
            href={href({ account: sp.account === String(a.id) ? undefined : String(a.id) })}
            label={a.name}
          />
        ))}
      </div>

      <TransactionsBoard transactions={visible} accounts={ctx.accounts} categories={ctx.categories} readOnly={ctx.readOnly} today={ctx.today} />
    </div>
  );
}

function FilterChip({ active, href, label }: { active: boolean; href: string; label: string }) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold capitalize transition-colors ${
        active ? "border-h-brand bg-h-brand text-h-brand-fg" : "border-h-border bg-h-surface text-h-muted hover:text-h-fg"
      }`}
    >
      {label}
    </Link>
  );
}
