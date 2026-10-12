"use client";

import { ArrowLeftRight } from "lucide-react";
import { TransferFormButton } from "@/components/finance/transfer-form";
import type { AccountRow, TransactionRow } from "@/lib/db/repo-finance";

const money = (n: number) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function TransfersPanel({
  accounts,
  transfers,
  readOnly,
}: {
  accounts: AccountRow[];
  transfers: TransactionRow[];
  readOnly: boolean;
}) {
  const accountName = new Map(accounts.map((a) => [a.id, a.name]));

  // Pair up legs sharing the same date+amount (created together by createTransfer) into one row.
  const pairs: { date: string; amount: number; accountIds: number[] }[] = [];
  const used = new Set<number>();
  for (const t of transfers) {
    if (used.has(t.id)) continue;
    const match = transfers.find((o) => o.id !== t.id && !used.has(o.id) && o.date === t.date && o.amount === t.amount);
    if (match) {
      used.add(t.id);
      used.add(match.id);
      pairs.push({ date: t.date, amount: t.amount, accountIds: [t.accountId, match.accountId] });
    }
  }

  return (
    <div className="h-card flex flex-col gap-3 p-4">
      {!readOnly && <TransferFormButton accounts={accounts} />}
      {pairs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-h-surface2 text-h-muted">
            <ArrowLeftRight className="h-5 w-5" />
          </span>
          <p className="text-xs font-semibold text-h-muted">No transfers yet</p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-h-border">
          {pairs.map((p, i) => (
            <li key={i} className="flex items-center gap-2 py-2.5 text-xs">
              <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 text-h-muted" />
              <span className="min-w-0 flex-1 truncate font-bold">
                {accountName.get(p.accountIds[0]) ?? "—"} → {accountName.get(p.accountIds[1]) ?? "—"}
              </span>
              <span className="shrink-0 font-extrabold tabular-nums">{money(p.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
