"use client";

import { useState, useTransition } from "react";
import { Plus, CalendarDays, Users } from "lucide-react";
import { Button } from "@/components/finance/ui/button";
import { Input } from "@/components/finance/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/finance/ui/select";
import { Switch } from "@/components/finance/ui/switch";
import { FinanceSheet } from "@/components/finance/finance-modal";
import { saveTransactionAction, deleteTransactionAction } from "@/lib/finance-actions";
import { FINANCE_TX_TYPES } from "@/lib/db/schema";
import type { AccountRow, CategoryRow, TransactionRow, TripRow } from "@/lib/db/repo-finance";
import { todayIso } from "@/lib/date";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = { income: "Income", expense: "Expense", transfer: "Transfer" };

export function TransactionFormButton({
  accounts,
  categories,
  label = "Add",
}: {
  accounts: AccountRow[];
  categories: CategoryRow[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  if (accounts.length === 0) return null;
  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" />
        {label}
      </Button>
      <TransactionFormModal accounts={accounts} categories={categories} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function TransactionFormModal({
  tx,
  accounts,
  categories,
  trips = [],
  open,
  onClose,
}: {
  tx?: TransactionRow;
  accounts: AccountRow[];
  categories: CategoryRow[];
  trips?: TripRow[];
  open: boolean;
  onClose: () => void;
}) {
  const [accountId, setAccountId] = useState(tx?.accountId ?? accounts[0]?.id ?? 0);
  const [categoryId, setCategoryId] = useState<number | null>(tx?.categoryId ?? null);
  const [tripId, setTripId] = useState<number | null>(tx?.tripId ?? null);
  const [type, setType] = useState(tx?.type ?? "expense");
  const [amount, setAmount] = useState(tx ? String(tx.amount) : "");
  const [name, setName] = useState(tx?.name ?? "");
  const [note, setNote] = useState(tx?.note ?? "");
  const [date, setDate] = useState(tx?.date ?? todayIso());
  const [isShared, setIsShared] = useState(tx?.isShared ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const showCategory = type !== "transfer";
  const showTrip = trips.length > 0 && type !== "transfer";

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveTransactionAction(tx?.id ?? null, {
        accountId,
        categoryId,
        tripId,
        type,
        amount: Number(amount) || 0,
        name: name.trim() || null,
        note: note.trim() || null,
        date,
        isShared,
      });
      if (!res.ok) setError(res.error);
      else onClose();
    });
  }

  async function remove() {
    if (!tx) return;
    if (!confirm("Delete this transaction?")) return;
    startTransition(async () => {
      const res = await deleteTransactionAction(tx.id);
      if (!res.ok) setError(res.error);
      else onClose();
    });
  }

  return (
    <FinanceSheet
      open={open}
      onClose={onClose}
      title={tx ? `Edit ${TYPE_LABEL[type]}` : `Add ${TYPE_LABEL[type]}`}
      onSave={submit}
      saveLabel={pending ? "Saving…" : "Save"}
      saveDisabled={pending || !amount}
    >
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex gap-1 rounded-full border border-border bg-muted p-1">
          {FINANCE_TX_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                "flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                type === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>

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
            placeholder={type === "income" ? "Salary, freelance gig…" : "Groceries at Mydin…"}
            className="h-auto rounded-xl border-0 bg-muted px-3.5 py-3 text-sm font-semibold shadow-none placeholder:font-normal placeholder:text-muted-foreground"
          />
        </label>

        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Account</p>
          <div className="scrollbar-hide flex gap-2 overflow-x-auto">
            {accounts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAccountId(a.id)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-colors",
                  accountId === a.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>

        {showCategory && (
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
        )}

        {showTrip && (
          <label className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Trip</span>
            <Select value={tripId ? String(tripId) : "none"} onValueChange={(v) => setTripId(v === "none" ? null : Number(v))}>
              <SelectTrigger className="h-auto w-full rounded-xl border-0 bg-muted px-3.5 py-3 text-sm font-bold">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {trips.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Details</p>
          <div className="flex items-center gap-3 rounded-xl bg-muted px-3.5 py-3">
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm font-bold text-foreground outline-none"
            />
          </div>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Memo (optional extra detail)"
            className="h-auto rounded-xl border-0 bg-muted px-3.5 py-3 text-sm font-semibold shadow-none placeholder:font-normal placeholder:text-muted-foreground"
          />
        </div>

        <label className="flex items-center justify-between gap-3 rounded-xl bg-muted px-3.5 py-3">
          <span className="flex items-center gap-3">
            <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex flex-col">
              <span className="text-sm font-bold text-foreground">Visible to my partner</span>
              <span className="text-xs text-muted-foreground">They&apos;ll see this transaction too</span>
            </span>
          </span>
          <Switch checked={isShared} onCheckedChange={setIsShared} />
        </label>

        {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

        {tx && (
          <button type="button" onClick={remove} disabled={pending} className="self-center text-xs font-bold text-destructive">
            Delete transaction
          </button>
        )}
      </div>
    </FinanceSheet>
  );
}
