"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/finance/ui/button";
import { Input } from "@/components/finance/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/finance/ui/select";
import { Switch } from "@/components/finance/ui/switch";
import { FinanceModal } from "@/components/finance/finance-modal";
import { saveBillAction, deleteBillAction } from "@/lib/finance-actions";
import type { BillRow, CategoryRow } from "@/lib/db/repo-finance";

export function BillFormButton({ categories }: { categories: CategoryRow[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" />
        Add bill
      </Button>
      <BillFormModal categories={categories} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function BillFormModal({ bill, categories, open, onClose }: { bill?: BillRow; categories: CategoryRow[]; open: boolean; onClose: () => void }) {
  const [name, setName] = useState(bill?.name ?? "");
  const [amount, setAmount] = useState(bill ? String(bill.amount) : "");
  const [dueDay, setDueDay] = useState(String(bill?.dueDay ?? 1));
  const [categoryId, setCategoryId] = useState<number | null>(bill?.categoryId ?? null);
  const [recurring, setRecurring] = useState(bill?.recurring ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveBillAction(bill?.id ?? null, {
        name,
        amount: Number(amount) || 0,
        dueDay: Number(dueDay) || 1,
        categoryId,
        recurring,
      });
      if (!res.ok) setError(res.error);
      else onClose();
    });
  }

  async function remove() {
    if (!bill) return;
    if (!confirm(`Delete "${bill.name}"?`)) return;
    startTransition(async () => {
      const res = await deleteBillAction(bill.id);
      if (!res.ok) setError(res.error);
      else onClose();
    });
  }

  return (
    <FinanceModal open={open} onClose={onClose} title={bill ? "Edit bill" : "New bill"}>
      <div className="flex min-w-0 flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted-foreground">Name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Electricity (TNB)" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted-foreground">Amount (RM)</span>
          <Input type="number" inputMode="decimal" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted-foreground">Due day of month</span>
          <Input type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
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
        <label className="flex items-center justify-between gap-2 text-sm font-semibold">
          Recurs every month
          <Switch checked={recurring} onCheckedChange={setRecurring} />
        </label>
        {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
        <div className="flex items-center justify-between gap-2 pt-1">
          {bill ? (
            <button type="button" onClick={remove} disabled={pending} className="text-xs font-bold text-destructive">
              Delete
            </button>
          ) : (
            <span />
          )}
          <Button type="button" onClick={submit} disabled={pending || !name.trim() || !amount} >
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </FinanceModal>
  );
}
