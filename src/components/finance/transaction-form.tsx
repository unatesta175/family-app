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

export function TransactionFormButton({ accounts, categories }: { accounts: AccountRow[]; categories: CategoryRow[] }) {
  const [open, setOpen] = useState(false);
  if (accounts.length === 0) return null;
  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)} className="gap-1.5 bg-h-brand text-h-brand-fg hover:opacity-90">
        <Plus className="h-4 w-4" />
        Add
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
      <div className="flex flex-col gap-3">
        <div className="flex gap-1.5">
          {FINANCE_TX_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                "flex-1 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
                type === t ? "border-h-brand bg-h-brand-soft text-h-brand" : "border-h-border text-h-muted"
              )}
            >
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-h-muted">Amount (RM)</span>
          <Input type="number" inputMode="decimal" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" autoFocus />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-h-muted">Account</span>
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

        {type !== "transfer" && (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold text-h-muted">Category</span>
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

        {trips.length > 0 && type !== "transfer" && (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold text-h-muted">Trip</span>
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

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-h-muted">Date</span>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-h-muted">Note</span>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </label>

        <label className="flex items-center justify-between gap-2 text-sm font-semibold">
          Visible to my partner
          <Switch checked={isShared} onCheckedChange={setIsShared} />
        </label>

        {error && <p className="text-xs font-semibold text-h-bad">{error}</p>}

        <div className="flex items-center justify-between gap-2 pt-1">
          {tx ? (
            <button type="button" onClick={remove} disabled={pending} className="text-xs font-bold text-h-bad">
              Delete
            </button>
          ) : (
            <span />
          )}
          <Button type="button" onClick={submit} disabled={pending || !amount} className="bg-h-brand text-h-brand-fg hover:opacity-90">
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </FinanceModal>
  );
}
