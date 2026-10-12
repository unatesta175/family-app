"use client";

import { useMemo, useState } from "react";
import { Lock, MoreHorizontal, Search } from "lucide-react";
import { TransactionFormModal } from "@/components/finance/transaction-form";
import { FinanceCategoryIcon } from "@/components/finance/finance-icons";
import { deleteTransactionAction, toggleTransactionSharedAction } from "@/lib/finance-actions";
import { addDays } from "@/lib/date";
import type { AccountRow, CategoryRow, TransactionRow } from "@/lib/db/repo-finance";

const money = (n: number) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function TransactionsBoard({
  transactions,
  accounts,
  categories,
  readOnly,
  today,
}: {
  transactions: TransactionRow[];
  accounts: AccountRow[];
  categories: CategoryRow[];
  readOnly: boolean;
  today: string;
}) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<TransactionRow | null>(null);
  const [menuFor, setMenuFor] = useState<number | null>(null);

  const accountName = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((t) => {
      const cat = t.categoryId ? categoryById.get(t.categoryId) : null;
      const haystack = `${t.note ?? ""} ${cat?.name ?? ""} ${t.amount}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [transactions, query, categoryById]);

  const totals = useMemo(() => {
    let income = 0;
    let spent = 0;
    for (const t of transactions) {
      if (t.type === "income") income += t.amount;
      else if (t.type === "expense") spent += t.amount;
    }
    return { income, spent, net: income - spent };
  }, [transactions]);

  const yesterday = addDays(today, -1);
  const groups = useMemo(() => {
    const map = new Map<string, TransactionRow[]>();
    for (const t of filtered) {
      const list = map.get(t.date) ?? [];
      list.push(t);
      map.set(t.date, list);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  const dayLabel = (date: string) => {
    if (date === today) return "Today";
    if (date === yesterday) return "Yesterday";
    return new Date(`${date}T00:00:00`).toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short" });
  };

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_260px]">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-h-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by note, category, or amount"
            className="h-10 w-full rounded-xl border border-h-border bg-h-surface pl-9 pr-3 text-sm font-semibold outline-none focus:border-h-brand"
          />
        </div>

        {groups.length === 0 ? (
          <p className="py-8 text-center text-sm text-h-muted">No transactions here yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {groups.map(([date, rows]) => (
              <div key={date} className="h-card p-2">
                <p className="px-2 pb-1 pt-1 text-[11px] font-extrabold uppercase tracking-wider text-h-muted">{dayLabel(date)}</p>
                <ul className="flex flex-col divide-y divide-h-border">
                  {rows.map((tx) => {
                    const cat = tx.categoryId ? categoryById.get(tx.categoryId) : null;
                    const sign = tx.type === "income" ? "+" : tx.type === "expense" ? "−" : "";
                    const color = tx.type === "income" ? "text-h-good" : tx.type === "expense" ? "text-h-bad" : "text-h-muted";
                    return (
                      <li key={tx.id} className="relative flex items-center gap-3 px-2 py-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-h-surface2 text-h-muted">
                          <FinanceCategoryIcon icon={cat?.icon} className="h-4 w-4" />
                        </span>
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => !readOnly && setEditing(tx)}
                          className="min-w-0 flex-1 text-left disabled:cursor-default"
                        >
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-bold">{cat?.name ?? TYPE_NAME(tx.type)}</span>
                            {!tx.isShared && <Lock className="h-3 w-3 shrink-0 text-h-muted" />}
                          </span>
                          <span className="block text-[11px] font-semibold text-h-muted">
                            {accountName.get(tx.accountId) ?? "—"}
                            {tx.note ? ` · ${tx.note}` : ""}
                          </span>
                        </button>
                        <span className={`shrink-0 text-sm font-extrabold tabular-nums ${color}`}>
                          {sign}
                          {money(tx.amount)}
                        </span>
                        {!readOnly && (
                          <div className="relative shrink-0">
                            <button
                              type="button"
                              onClick={() => setMenuFor(menuFor === tx.id ? null : tx.id)}
                              className="rounded-full p-1.5 text-h-muted hover:bg-h-surface2 hover:text-h-fg"
                              aria-label="Transaction actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {menuFor === tx.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setMenuFor(null)} />
                                <div className="absolute right-0 top-full z-20 mt-1 flex w-40 flex-col overflow-hidden rounded-xl border border-h-border bg-h-surface shadow-lg">
                                  <button
                                    type="button"
                                    className="px-3 py-2 text-left text-xs font-bold hover:bg-h-surface2"
                                    onClick={() => {
                                      setMenuFor(null);
                                      setEditing(tx);
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="px-3 py-2 text-left text-xs font-bold hover:bg-h-surface2"
                                    onClick={() => {
                                      setMenuFor(null);
                                      toggleTransactionSharedAction(tx.id);
                                    }}
                                  >
                                    {tx.isShared ? "Make private" : "Share with partner"}
                                  </button>
                                  <button
                                    type="button"
                                    className="px-3 py-2 text-left text-xs font-bold text-h-bad hover:bg-h-surface2"
                                    onClick={() => {
                                      setMenuFor(null);
                                      deleteTransactionAction(tx.id);
                                    }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 md:sticky md:top-4 md:self-start">
        <div className="h-card flex flex-col gap-1 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-h-muted">Income</p>
          <p className="text-xl font-extrabold tabular-nums text-h-good">{money(totals.income)}</p>
        </div>
        <div className="h-card flex flex-col gap-1 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-h-muted">Spent</p>
          <p className="text-xl font-extrabold tabular-nums text-h-bad">{money(totals.spent)}</p>
        </div>
        <div className="h-card flex flex-col gap-1 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-h-muted">Net</p>
          <p className="text-xl font-extrabold tabular-nums">{money(totals.net)}</p>
        </div>
      </div>

      {editing && <TransactionFormModal tx={editing} accounts={accounts} categories={categories} open onClose={() => setEditing(null)} />}
    </div>
  );
}

function TYPE_NAME(t: string) {
  return t === "income" ? "Income" : t === "transfer" ? "Transfer" : "Expense";
}
