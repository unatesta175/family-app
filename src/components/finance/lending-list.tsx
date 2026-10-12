"use client";

import { useState } from "react";
import { LendingFormModal } from "@/components/finance/lending-form";
import { Badge } from "@/components/finance/ui/badge";
import type { LendingRow } from "@/lib/db/repo-finance";
import { cn } from "@/lib/utils";

const money = (n: number) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function LendingList({ entries }: { entries: LendingRow[] }) {
  const [editing, setEditing] = useState<LendingRow | null>(null);
  if (entries.length === 0) return <p className="py-8 text-center text-sm text-h-muted">No lending or borrowing tracked yet.</p>;

  return (
    <>
      <ul className="flex flex-col divide-y divide-h-border">
        {entries.map((e) => (
          <li key={e.id}>
            <button type="button" onClick={() => setEditing(e)} className="flex w-full items-center gap-3 py-3 text-left">
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-bold">{e.counterpartyName}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "border-transparent px-1.5 text-[10px]",
                      e.status === "settled" ? "bg-h-surface2 text-h-muted" : "bg-h-brand-soft text-h-brand"
                    )}
                  >
                    {e.status}
                  </Badge>
                </span>
                <span className="block text-[11px] font-semibold text-h-muted">
                  {e.direction === "lent" ? "You lent" : "You borrowed"}
                  {e.dueDate && ` · due ${e.dueDate}`}
                </span>
              </span>
              <span className={cn("shrink-0 text-sm font-extrabold tabular-nums", e.direction === "lent" ? "text-h-good" : "text-h-bad")}>
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
