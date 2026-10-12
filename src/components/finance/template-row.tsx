"use client";

import { useState, useTransition } from "react";
import { Zap } from "lucide-react";
import { TemplateFormModal } from "@/components/finance/template-form";
import { applyTemplateAction } from "@/lib/finance-actions";
import type { AccountRow, CategoryRow, TemplateRow } from "@/lib/db/repo-finance";

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
      <button type="button" disabled={readOnly} onClick={() => setEditing(true)} className="min-w-0 flex-1 text-left disabled:cursor-default">
        <span className="block truncate text-sm font-bold">{template.name}</span>
        <span className="block text-[11px] font-semibold text-h-muted">
          {account?.name ?? "—"} {category ? `· ${category.name}` : ""} · {template.type}
        </span>
      </button>
      <span className="shrink-0 text-sm font-extrabold tabular-nums">{money(template.amount)}</span>
      {!readOnly && (
        <button
          type="button"
          onClick={use}
          disabled={pending}
          className="flex items-center gap-1 rounded-full bg-h-brand-soft px-3 py-1.5 text-xs font-bold text-h-brand hover:opacity-90"
        >
          <Zap className="h-3.5 w-3.5" />
          Use
        </button>
      )}
      {editing && <TemplateFormModal template={template} accounts={accounts} categories={categories} open onClose={() => setEditing(false)} />}
    </li>
  );
}
