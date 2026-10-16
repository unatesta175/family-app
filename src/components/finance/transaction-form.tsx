"use client";

import { useState, useTransition } from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Plus, Users } from "lucide-react";
import { Button } from "@/components/finance/ui/button";
import { Input } from "@/components/finance/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/finance/ui/select";
import { Switch } from "@/components/finance/ui/switch";
import { FinanceModal, FinanceField } from "@/components/finance/finance-modal";
import { saveTransactionAction, deleteTransactionAction } from "@/lib/finance-actions";
import { FINANCE_TX_TYPES } from "@/lib/db/schema";
import type { AccountRow, CategoryRow, TransactionRow, TripRow } from "@/lib/db/repo-finance";
import { todayIso, nowTime } from "@/lib/date";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = { income: "Income", expense: "Expense", transfer: "Transfer" };
const TYPE_META = {
  income: { icon: ArrowDownLeft, active: "bg-success/10 text-success" },
  expense: { icon: ArrowUpRight, active: "bg-destructive/10 text-destructive" },
  transfer: { icon: ArrowLeftRight, active: "bg-foreground/10 text-foreground" },
} as const;

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
  const [time, setTime] = useState(tx?.time ?? nowTime());
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
        time: time || null,
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
    <FinanceModal
      open={open}
      onClose={onClose}
      title={tx ? `Edit ${TYPE_LABEL[type]}` : `Add ${TYPE_LABEL[type]}`}
      onSave={submit}
      saveLabel={pending ? "Saving…" : "Save"}
      saveDisabled={pending || !amount}
    >
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex gap-1 rounded-sm border border-border bg-surface p-1">
          {FINANCE_TX_TYPES.map((t) => {
            const { icon: Icon, active } = TYPE_META[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-sm px-3 py-2 text-xs font-bold transition-colors",
                  type === t ? active : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {TYPE_LABEL[t]}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-1.5 rounded-sm border border-border bg-surface px-6 py-6 transition-[border-color,box-shadow] focus-within:border-foreground/25 focus-within:bg-background focus-within:ring-4 focus-within:ring-foreground/[0.06]">
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
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={type === "income" ? "Salary, freelance gig…" : "Groceries at Mydin…"}
          />
        </FinanceField>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-foreground">Account</span>
          <div className="scrollbar-hide flex gap-2 overflow-x-auto">
            {accounts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAccountId(a.id)}
                className={cn(
                  "shrink-0 rounded-sm px-4 py-2 text-xs font-bold transition-colors",
                  accountId === a.id ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground hover:text-foreground"
                )}
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>

        {(showCategory || showTrip) && (
          <div className="grid grid-cols-2 gap-3">
            {showCategory && (
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
            )}

            {showTrip && (
              <FinanceField label="Trip">
                <Select value={tripId ? String(tripId) : "none"} onValueChange={(v) => setTripId(v === "none" ? null : Number(v))}>
                  <SelectTrigger>
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
              </FinanceField>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <FinanceField label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </FinanceField>
          <FinanceField label="Time">
            <Input type="time" step={1} value={time} onChange={(e) => setTime(e.target.value)} />
          </FinanceField>
        </div>

        <FinanceField label="Memo">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional extra detail" />
        </FinanceField>

        <label className="flex items-center justify-between gap-3 rounded-sm border border-border bg-surface px-4 py-3.5">
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
    </FinanceModal>
  );
}
