"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/finance/ui/button";
import { Input } from "@/components/finance/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/finance/ui/select";
import { FinanceModal } from "@/components/finance/finance-modal";
import { quickAddExpenseAction } from "@/lib/finance-actions";
import type { AccountRow, CategoryRow } from "@/lib/db/repo-finance";
import { cn } from "@/lib/utils";

/** The dashboard's fast path: log today's expense in two taps. */
export function QuickAddButton({ accounts, categories }: { accounts: AccountRow[]; categories: CategoryRow[] }) {
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? 0);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (accounts.length === 0) {
    return (
      <Button asChild size="sm" className="gap-1.5 bg-h-brand text-h-brand-fg hover:opacity-90">
        <a href="/finance/accounts">
          <Plus className="h-4 w-4" />
          Add an account first
        </a>
      </Button>
    );
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await quickAddExpenseAction({ accountId, categoryId, amount: Number(amount) || 0, note: note.trim() || null });
      if (!res.ok) setError(res.error);
      else {
        setAmount("");
        setNote("");
        setOpen(false);
      }
    });
  }

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)} className="gap-1.5 bg-h-brand text-h-brand-fg hover:opacity-90">
        <Plus className="h-4 w-4" />
        Quick add spend
      </Button>
      <FinanceModal open={open} onClose={() => setOpen(false)} title="Quick add expense">
        <div className="flex flex-col gap-3">
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="h-14 text-center text-2xl font-extrabold"
          />
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
                  categoryId === c.id ? "border-h-brand bg-h-brand-soft text-h-brand" : "border-h-border text-h-muted"
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
          {accounts.length > 1 && (
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
          )}
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" />
          {error && <p className="text-xs font-semibold text-h-bad">{error}</p>}
          <Button type="button" onClick={submit} disabled={pending || !amount} className="bg-h-brand text-h-brand-fg hover:opacity-90">
            {pending ? "Saving…" : "Add expense"}
          </Button>
        </div>
      </FinanceModal>
    </>
  );
}
