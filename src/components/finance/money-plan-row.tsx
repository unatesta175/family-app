"use client";

import { useState, useTransition } from "react";
import { saveMoneyPlanAllocationAction } from "@/lib/finance-actions";
import { Progress } from "@/components/finance/ui/progress";
import type { CategoryRow } from "@/lib/db/repo-finance";

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
  const rawPct = value ? (actual / (Number(value) || 1)) * 100 : 0;
  const pct = Math.min(100, rawPct);
  const over = Number(value) > 0 && actual > Number(value);
  const near = !over && Number(value) > 0 && rawPct >= 80;

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
      <Progress
        value={pct}
        className="h-1.5"
        indicatorClassName={over ? "bg-h-bad" : near ? "bg-amber-500" : "bg-h-brand"}
      />
    </li>
  );
}
