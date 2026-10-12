"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/finance/ui/button";
import { Input } from "@/components/finance/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/finance/ui/select";
import { Switch } from "@/components/finance/ui/switch";
import { FinanceModal } from "@/components/finance/finance-modal";
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
    <FinanceModal open={open} onClose={onClose} title={tx ? "Edit transaction" : "Add transaction"}>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex gap-1.5 rounded-lg border border-border bg-muted p-1">
          {FINANCE_TX_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-xs font-bold transition-colors",
                type === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted-foreground">Amount (RM)</span>
          <Input type="number" inputMode="decimal" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" autoFocus />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className={cn("flex flex-col gap-1", !showCategory && "col-span-2")}>
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

          {showCategory && (
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
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className={cn("flex flex-col gap-1", !showTrip && "col-span-2")}>
            <span className="text-xs font-bold text-muted-foreground">Date</span>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>

          {showTrip && (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold text-muted-foreground">Trip</span>
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
            </label>
          )}
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted-foreground">Note</span>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </label>

        <label className="flex items-center justify-between gap-2 text-sm font-semibold">
          Visible to my partner
          <Switch checked={isShared} onCheckedChange={setIsShared} />
        </label>

        {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

        <div className="flex items-center justify-between gap-2 pt-1">
          {tx ? (
            <button type="button" onClick={remove} disabled={pending} className="text-xs font-bold text-destructive">
              Delete
            </button>
          ) : (
            <span />
          )}
          <Button type="button" onClick={submit} disabled={pending || !amount}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </FinanceModal>
  );
}
