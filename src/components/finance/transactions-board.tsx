"use client";

import { useMemo, useState } from "react";
import { Lock, MoreHorizontal, Search } from "lucide-react";
import { TransactionFormModal } from "@/components/finance/transaction-form";
import { FinanceCategoryIcon } from "@/components/finance/finance-icons";
import { deleteTransactionAction, toggleTransactionSharedAction } from "@/lib/finance-actions";
import { addDays } from "@/lib/date";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/finance/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/finance/ui/tooltip";
import type { AccountRow, CategoryRow, TransactionRow } from "@/lib/db/repo-finance";
import { colorHex } from "@/lib/habits";

const money = (n: number) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function formatTime(time: string | null) {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

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
      const haystack = `${t.name ?? ""} ${t.note ?? ""} ${cat?.name ?? ""} ${t.amount}`.toLowerCase();
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
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, note, category, or amount"
            className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm font-semibold outline-none focus:border-ring"
          />
        </div>

        {groups.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No transactions here yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {groups.map(([date, rows]) => (
              <Card key={date} className="min-w-0 p-2">
                <p className="px-2 pb-1 pt-1 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">{dayLabel(date)}</p>
                <ul className="min-w-0 flex flex-col divide-y divide-border">
                  {rows.map((tx) => {
                    const cat = tx.categoryId ? categoryById.get(tx.categoryId) : null;
                    const sign = tx.type === "income" ? "+" : tx.type === "expense" ? "−" : "";
                    const color = tx.type === "income" ? "text-success" : tx.type === "expense" ? "text-destructive" : "text-muted-foreground";
                    return (
                      <li key={tx.id} className="relative min-w-0 flex items-center gap-3 px-2 py-2.5">
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                          style={{ background: `${colorHex(cat?.color ?? "steel")}1f`, color: colorHex(cat?.color ?? "steel") }}
                        >
                          <FinanceCategoryIcon icon={cat?.icon} className="h-4 w-4" />
                        </span>
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => !readOnly && setEditing(tx)}
                          className="min-w-0 flex-1 text-left disabled:cursor-default"
                        >
                          <span className="flex items-center gap-1.5">
                            <span className="min-w-0 truncate text-sm font-bold">{tx.name || cat?.name || TYPE_NAME(tx.type)}</span>
                            {!tx.isShared && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>Private — not shared with your partner</TooltipContent>
                              </Tooltip>
                            )}
                          </span>
                          <span className="block text-[11px] font-semibold text-muted-foreground">
                            {accountName.get(tx.accountId) ?? "—"}
                            {formatTime(tx.time) ? ` · ${formatTime(tx.time)}` : ""}
                            {tx.name && cat?.name ? ` · ${cat.name}` : ""}
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
                              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              aria-label="Transaction actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {menuFor === tx.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setMenuFor(null)} />
                                <div className="absolute right-0 top-full z-20 mt-1 flex w-40 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-md">
                                  <button
                                    type="button"
                                    className="px-3 py-2 text-left text-xs font-bold hover:bg-muted"
                                    onClick={() => {
                                      setMenuFor(null);
                                      setEditing(tx);
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="px-3 py-2 text-left text-xs font-bold hover:bg-muted"
                                    onClick={() => {
                                      setMenuFor(null);
                                      toggleTransactionSharedAction(tx.id);
                                    }}
                                  >
                                    {tx.isShared ? "Make private" : "Share with partner"}
                                  </button>
                                  <button
                                    type="button"
                                    className="px-3 py-2 text-left text-xs font-bold text-destructive hover:bg-muted"
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
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 md:sticky md:top-4 md:self-start">
        <Card className="@container/card shadow-xs">
          <CardHeader>
            <CardDescription>Income</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums text-success @[250px]/card:text-3xl">{money(totals.income)}</CardTitle>
          </CardHeader>
          <CardFooter className="text-sm text-muted-foreground">This period</CardFooter>
        </Card>
        <Card className="@container/card shadow-xs">
          <CardHeader>
            <CardDescription>Spent</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums text-destructive @[250px]/card:text-3xl">{money(totals.spent)}</CardTitle>
          </CardHeader>
          <CardFooter className="text-sm text-muted-foreground">This period</CardFooter>
        </Card>
        <Card className="@container/card shadow-xs">
          <CardHeader>
            <CardDescription>Net</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{money(totals.net)}</CardTitle>
          </CardHeader>
          <CardFooter className="text-sm text-muted-foreground">Income minus spend</CardFooter>
        </Card>
      </div>

      {editing && <TransactionFormModal tx={editing} accounts={accounts} categories={categories} open onClose={() => setEditing(null)} />}
    </div>
  );
}

function TYPE_NAME(t: string) {
  return t === "income" ? "Income" : t === "transfer" ? "Transfer" : "Expense";
}
