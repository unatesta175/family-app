"use client";

import { useState, useTransition } from "react";
import { Plus, CalendarDays } from "lucide-react";
import { Button } from "@/components/finance/ui/button";
import { Input } from "@/components/finance/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/finance/ui/select";
import { FinanceSheet } from "@/components/finance/finance-modal";
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
    <FinanceSheet
      open={open}
      onClose={onClose}
      title={bill ? "Edit bill" : "New bill"}
      onSave={submit}
      saveLabel={pending ? "Saving…" : "Save"}
      saveDisabled={pending || !name.trim() || !amount}
    >
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex items-center justify-center gap-2 py-1">
          <span className="rounded-full bg-muted px-2.5 py-1 text-sm font-bold text-muted-foreground">RM</span>
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

        <label className="flex flex-col gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Name</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Domain renewal (Namecheap)"
            className="h-auto rounded-xl border-0 bg-muted px-3.5 py-3 text-sm font-semibold shadow-none placeholder:font-normal placeholder:text-muted-foreground"
          />
        </label>

        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">How often</p>
          <div className="flex gap-1 rounded-full border border-border bg-muted p-1">
            {FINANCE_BILL_FREQUENCIES.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFrequency(f)}
                className={cn(
                  "flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
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
          <label className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Due day of month</span>
            <Input
              type="number"
              min={1}
              max={31}
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              className="h-auto rounded-xl border-0 bg-muted px-3.5 py-3 text-sm font-semibold shadow-none"
            />
          </label>
        )}

        {frequency === "yearly" && (
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Month</span>
              <Select value={dueMonth} onValueChange={setDueMonth}>
                <SelectTrigger className="h-auto w-full rounded-xl border-0 bg-muted px-3.5 py-3 text-sm font-bold">
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
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Day</span>
              <Input
                type="number"
                min={1}
                max={31}
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                className="h-auto rounded-xl border-0 bg-muted px-3.5 py-3 text-sm font-semibold shadow-none"
              />
            </label>
          </div>
        )}

        {frequency === "once" && (
          <label className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Due date</span>
            <div className="flex items-center gap-3 rounded-xl bg-muted px-3.5 py-3">
              <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm font-bold text-foreground outline-none"
              />
            </div>
          </label>
        )}

        <label className="flex flex-col gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Category</span>
          <Select value={categoryId ? String(categoryId) : "none"} onValueChange={(v) => setCategoryId(v === "none" ? null : Number(v))}>
            <SelectTrigger className="h-auto w-full rounded-xl border-0 bg-muted px-3.5 py-3 text-sm font-bold">
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

        {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

        {bill && (
          <button type="button" onClick={remove} disabled={pending} className="self-center text-xs font-bold text-destructive">
            Delete bill
          </button>
        )}
      </div>
    </FinanceSheet>
  );
}
