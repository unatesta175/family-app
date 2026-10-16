"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/finance/ui/button";
import { Input } from "@/components/finance/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/finance/ui/select";
import { FinanceModal, FinanceField } from "@/components/finance/finance-modal";
import { saveBillAction, deleteBillAction } from "@/lib/finance-actions";
import { FINANCE_BILL_FREQUENCIES } from "@/lib/db/schema";
import type { FinanceBillFrequency } from "@/lib/db/schema";
import type { BillRow, CategoryRow } from "@/lib/db/repo-finance";
import { todayIso } from "@/lib/date";
import { cn } from "@/lib/utils";

const FREQ_LABEL: Record<FinanceBillFrequency, string> = { monthly: "Monthly", yearly: "Yearly", once: "One-time" };
const FREQ_HINT: Record<FinanceBillFrequency, string> = {
  monthly: "Repeats every month, e.g. rent or a phone plan.",
  yearly: "Repeats once a year, e.g. a domain or insurance renewal.",
  once: "A single bill that doesn't repeat.",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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
  const [frequency, setFrequency] = useState<FinanceBillFrequency>(bill?.frequency ?? "monthly");
  const [dueDay, setDueDay] = useState(String(bill?.dueDay ?? 1));
  const [dueMonth, setDueMonth] = useState(String(bill?.dueMonth ?? new Date().getMonth() + 1));
  const [dueDate, setDueDate] = useState(bill?.dueDate ?? todayIso());
  const [categoryId, setCategoryId] = useState<number | null>(bill?.categoryId ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveBillAction(bill?.id ?? null, {
        name,
        amount: Number(amount) || 0,
        dueDay: frequency === "once" ? Number(dueDate.slice(8, 10)) || 1 : Number(dueDay) || 1,
        frequency,
        dueMonth: frequency === "yearly" ? Number(dueMonth) || 1 : null,
        dueDate: frequency === "once" ? dueDate : null,
        categoryId,
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
    <FinanceModal
      open={open}
      onClose={onClose}
      title={bill ? "Edit bill" : "New bill"}
      onSave={submit}
      saveLabel={pending ? "Saving…" : "Save"}
      saveDisabled={pending || !name.trim() || !amount}
    >
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface px-6 py-6 transition-[border-color,box-shadow] focus-within:border-foreground/25 focus-within:bg-background focus-within:ring-4 focus-within:ring-foreground/[0.06]">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</span>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-xl font-bold text-subtle">RM</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
              className="w-40 min-w-0 bg-transparent text-center text-4xl font-extrabold text-foreground outline-none placeholder:text-muted-foreground/40"
            />
          </div>
        </div>

        <FinanceField label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Domain renewal (Namecheap)" />
        </FinanceField>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-foreground">How often</span>
          <div className="flex gap-1 rounded-xl border border-border bg-surface p-1">
            {FINANCE_BILL_FREQUENCIES.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFrequency(f)}
                className={cn(
                  "flex-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors",
                  frequency === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {FREQ_LABEL[f]}
              </button>
            ))}
          </div>
          <p className="px-1 text-xs text-muted-foreground">{FREQ_HINT[frequency]}</p>
        </div>

        {frequency === "monthly" && (
          <FinanceField label="Due day of month">
            <Input type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
          </FinanceField>
        )}

        {frequency === "yearly" && (
          <div className="grid grid-cols-2 gap-3">
            <FinanceField label="Month">
              <Select value={dueMonth} onValueChange={setDueMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FinanceField>
            <FinanceField label="Day">
              <Input type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
            </FinanceField>
          </div>
        )}

        {frequency === "once" && (
          <FinanceField label="Due date">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </FinanceField>
        )}

        <FinanceField label="Category">
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
        </FinanceField>

        {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

        {bill && (
          <button type="button" onClick={remove} disabled={pending} className="self-center text-xs font-bold text-destructive">
            Delete bill
          </button>
        )}
      </div>
    </FinanceModal>
  );
}
