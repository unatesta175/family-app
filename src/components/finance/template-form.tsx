"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FinanceModal } from "@/components/finance/finance-modal";
import { saveTemplateAction, deleteTemplateAction } from "@/lib/finance-actions";
import type { AccountRow, CategoryRow, TemplateRow } from "@/lib/db/repo-finance";
import { FINANCE_TX_TYPES } from "@/lib/db/schema";

export function TemplateFormButton({ accounts, categories }: { accounts: AccountRow[]; categories: CategoryRow[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)} className="gap-1.5 bg-h-brand text-h-brand-fg hover:opacity-90" disabled={accounts.length === 0}>
        <Plus className="h-4 w-4" />
        New template
      </Button>
      <TemplateFormModal accounts={accounts} categories={categories} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function TemplateFormModal({
  template,
  accounts,
  categories,
  open,
  onClose,
}: {
  template?: TemplateRow;
  accounts: AccountRow[];
  categories: CategoryRow[];
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [accountId, setAccountId] = useState<number>(template?.accountId ?? accounts[0]?.id ?? 0);
  const [categoryId, setCategoryId] = useState<number | null>(template?.categoryId ?? null);
  const [type, setType] = useState<(typeof FINANCE_TX_TYPES)[number]>(template?.type ?? "expense");
  const [amount, setAmount] = useState(template ? String(template.amount) : "");
  const [note, setNote] = useState(template?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveTemplateAction(template?.id ?? null, {
        name,
        accountId,
        categoryId,
        type,
        amount: Number(amount) || 0,
        note: note.trim() || null,
      });
      if (!res.ok) setError(res.error);
      else onClose();
    });
  }

  async function remove() {
    if (!template) return;
    if (!confirm(`Delete "${template.name}"?`)) return;
    startTransition(async () => {
      const res = await deleteTemplateAction(template.id);
      if (!res.ok) setError(res.error);
      else onClose();
    });
  }

  return (
    <FinanceModal open={open} onClose={onClose} title={template ? "Edit template" : "New template"}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-h-muted">Name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Morning coffee" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-h-muted">Type</span>
          <select value={type} onChange={(e) => setType(e.target.value as (typeof FINANCE_TX_TYPES)[number])} className="h-10 rounded-md border border-h-border bg-transparent px-3 text-sm">
            {FINANCE_TX_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-h-muted">Account</span>
          <select value={accountId} onChange={(e) => setAccountId(Number(e.target.value))} className="h-10 rounded-md border border-h-border bg-transparent px-3 text-sm">
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-h-muted">Category</span>
          <select value={categoryId ?? ""} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)} className="h-10 rounded-md border border-h-border bg-transparent px-3 text-sm">
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-h-muted">Amount (RM)</span>
          <Input type="number" inputMode="decimal" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-h-muted">Note</span>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </label>
        {error && <p className="text-xs font-semibold text-h-bad">{error}</p>}
        <div className="flex items-center justify-between gap-2 pt-1">
          {template ? (
            <button type="button" onClick={remove} disabled={pending} className="text-xs font-bold text-h-bad">
              Delete
            </button>
          ) : (
            <span />
          )}
          <Button type="button" onClick={submit} disabled={pending || !name.trim() || !amount || !accountId} className="bg-h-brand text-h-brand-fg hover:opacity-90">
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </FinanceModal>
  );
}
