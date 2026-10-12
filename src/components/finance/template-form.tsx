"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/finance/ui/button";
import { Input } from "@/components/finance/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/finance/ui/select";
import { FinanceModal } from "@/components/finance/finance-modal";
import { saveTemplateAction, deleteTemplateAction } from "@/lib/finance-actions";
import type { AccountRow, CategoryRow, TemplateRow } from "@/lib/db/repo-finance";
import { FINANCE_TX_TYPES } from "@/lib/db/schema";

export function TemplateFormButton({ accounts, categories }: { accounts: AccountRow[]; categories: CategoryRow[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)} className="gap-1.5" disabled={accounts.length === 0}>
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
          <span className="text-xs font-bold text-muted-foreground">Name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Morning coffee" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted-foreground">Type</span>
          <Select value={type} onValueChange={(v) => setType(v as (typeof FINANCE_TX_TYPES)[number])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FINANCE_TX_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted-foreground">Account</span>
          <Select value={String(accountId)} onValueChange={(v) => setAccountId(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted-foreground">Category</span>
          <Select value={categoryId ? String(categoryId) : "none"} onValueChange={(v) => setCategoryId(v === "none" ? null : Number(v))}>
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted-foreground">Amount (RM)</span>
          <Input type="number" inputMode="decimal" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted-foreground">Note</span>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </label>
        {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
        <div className="flex items-center justify-between gap-2 pt-1">
          {template ? (
            <button type="button" onClick={remove} disabled={pending} className="text-xs font-bold text-destructive">
              Delete
            </button>
          ) : (
            <span />
          )}
          <Button type="button" onClick={submit} disabled={pending || !name.trim() || !amount || !accountId} >
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </FinanceModal>
  );
}
