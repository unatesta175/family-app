"use client";

import { useState, useTransition } from "react";
import { Zap } from "lucide-react";
import { TemplateFormModal } from "@/components/finance/template-form";
import { FinanceCategoryIcon } from "@/components/finance/finance-icons";
import { applyTemplateAction } from "@/lib/finance-actions";
import type { AccountRow, CategoryRow, TemplateRow } from "@/lib/db/repo-finance";
import { colorHex } from "@/lib/habits";

const money = (n: number) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function TemplateRowItem({
  template,
  accounts,
  categories,
  readOnly,
}: {
  template: TemplateRow;
  accounts: AccountRow[];
  categories: CategoryRow[];
  readOnly: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const category = categories.find((c) => c.id === template.categoryId);
  const account = accounts.find((a) => a.id === template.accountId);

  function use() {
    startTransition(() => {
      applyTemplateAction(template.id);
    });
  }

  return (
    <li className="flex items-center gap-3 py-3">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `${colorHex(category?.color ?? "steel")}1f`, color: colorHex(category?.color ?? "steel") }}
      >
        <FinanceCategoryIcon icon={category?.icon} className="h-4 w-4" />
      </span>
      <button type="button" disabled={readOnly} onClick={() => setEditing(true)} className="min-w-0 flex-1 text-left disabled:cursor-default">
        <span className="block truncate text-sm font-bold">{template.name}</span>
        <span className="block text-[11px] font-semibold text-muted-foreground">
          {account?.name ?? "—"} {category ? `· ${category.name}` : ""} · {template.type}
        </span>
      </button>
      <span className="shrink-0 text-sm font-extrabold tabular-nums">{money(template.amount)}</span>
      {!readOnly && (
        <button
          type="button"
          onClick={use}
          disabled={pending}
          className="flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-600 hover:bg-amber-500/25"
        >
          <Zap className="h-3.5 w-3.5" />
          Use
        </button>
      )}
      {editing && <TemplateFormModal template={template} accounts={accounts} categories={categories} open onClose={() => setEditing(false)} />}
    </li>
  );
}
