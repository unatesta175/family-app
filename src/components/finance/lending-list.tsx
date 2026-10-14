"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { LendingFormModal } from "@/components/finance/lending-form";
import { Badge } from "@/components/finance/ui/badge";
import type { LendingRow } from "@/lib/db/repo-finance";
import { cn } from "@/lib/utils";

const money = (n: number) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function LendingList({ entries }: { entries: LendingRow[] }) {
  const [editing, setEditing] = useState<LendingRow | null>(null);
  if (entries.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No lending or borrowing tracked yet.</p>;

  return (
    <>
      <ul className="flex flex-col divide-y divide-border">
        {entries.map((e) => (
          <li key={e.id}>
            <button type="button" onClick={() => setEditing(e)} className="flex w-full items-center gap-3 py-3 text-left">
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  e.direction === "lent" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                )}
              >
                {e.direction === "lent" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-bold">{e.counterpartyName}</span>
                  <Badge
                    className={cn(
                      "text-[10px]",
                      e.status === "settled" ? "border-transparent bg-success/15 text-success" : "border-transparent bg-amber-500/15 text-amber-600"
                    )}
                  >
                    {e.status}
                  </Badge>
                </span>
                <span className="block text-[11px] font-semibold text-muted-foreground">
                  {e.direction === "lent" ? "You lent" : "You borrowed"}
                  {e.dueDate && ` · due ${e.dueDate}`}
                </span>
              </span>
              <span className={cn("shrink-0 text-sm font-extrabold tabular-nums", e.direction === "lent" ? "text-success" : "text-destructive")}>
                {money(e.amount)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {editing && <LendingFormModal entry={editing} open onClose={() => setEditing(null)} />}
    </>
  );
}
