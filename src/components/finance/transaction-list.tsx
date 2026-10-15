"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { TransactionFormModal } from "@/components/finance/transaction-form";
import { FinanceCategoryIcon } from "@/components/finance/finance-icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/finance/ui/tooltip";
import type { AccountRow, CategoryRow, TransactionRow } from "@/lib/db/repo-finance";
import { colorHex } from "@/lib/habits";

const money = (n: number) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function TransactionList({
  transactions,
  accounts,
  categories,
  readOnly,
}: {
  transactions: TransactionRow[];
  accounts: AccountRow[];
  categories: CategoryRow[];
  readOnly: boolean;
}) {
  const [editing, setEditing] = useState<TransactionRow | null>(null);
  const accountName = new Map(accounts.map((a) => [a.id, a.name]));
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  if (transactions.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No transactions here yet.</p>;
  }

  return (
    <>
      <ul className="flex flex-col divide-y divide-border">
        {transactions.map((tx) => {
          const cat = tx.categoryId ? categoryById.get(tx.categoryId) : null;
          const sign = tx.type === "income" ? "+" : tx.type === "expense" ? "−" : "";
          const color = tx.type === "income" ? "text-success" : tx.type === "expense" ? "text-destructive" : "text-muted-foreground";
          return (
            <li key={tx.id}>
              <button
                type="button"
                disabled={readOnly}
                onClick={() => !readOnly && setEditing(tx)}
                className="flex w-full items-center gap-3 py-3 text-left disabled:cursor-default"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `${colorHex(cat?.color ?? "steel")}1f`, color: colorHex(cat?.color ?? "steel") }}
                >
                  <FinanceCategoryIcon icon={cat?.icon} className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-bold">{tx.name || tx.note || cat?.name || TYPE_NAME(tx.type)}</span>
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
                    {accountName.get(tx.accountId) ?? "—"} · {tx.date}
                    {tx.name && tx.note ? ` · ${tx.note}` : ""}
                  </span>
                </span>
                <span className={`shrink-0 text-sm font-extrabold tabular-nums ${color}`}>
                  {sign}
                  {money(tx.amount)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {editing && <TransactionFormModal tx={editing} accounts={accounts} categories={categories} open onClose={() => setEditing(null)} />}
    </>
  );
}

function TYPE_NAME(t: string) {
  return t === "income" ? "Income" : t === "transfer" ? "Transfer" : "Expense";
}
