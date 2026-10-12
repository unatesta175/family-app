"use client";

import { useState, useTransition } from "react";
import { saveMoneyPlanAllocationAction } from "@/lib/finance-actions";
import type { CategoryRow } from "@/lib/db/repo-finance";
import { cn } from "@/lib/utils";

const money = (n: number) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function MoneyPlanRow({
  category,
  month,
  planned,
  actual,
  readOnly,
}: {
  category: CategoryRow;
  month: string;
  planned: number;
  actual: number;
  readOnly: boolean;
}) {
  const [value, setValue] = useState(planned ? String(planned) : "");
  const [pending, startTransition] = useTransition();
  const pct = value ? Math.min(100, (actual / (Number(value) || 1)) * 100) : 0;
  const over = Number(value) > 0 && actual > Number(value);

  function save() {
    startTransition(async () => {
      await saveMoneyPlanAllocationAction({ categoryId: category.id, month, plannedAmount: Number(value) || 0 });
    });
  }

  return (
    <li className="flex flex-col gap-1.5 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold">{category.name}</span>
        <span className="text-xs font-semibold text-h-muted">{money(actual)} spent</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-h-muted">RM</span>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          value={value}
          disabled={readOnly}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          placeholder="0.00"
          className="h-8 w-28 rounded-md border border-h-border bg-transparent px-2 text-sm"
        />
        <span className="text-xs font-semibold text-h-muted">planned {pending && "· saving…"}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-h-surface2">
        <div className={cn("h-full rounded-full", over ? "bg-h-bad" : "bg-h-brand")} style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
}
