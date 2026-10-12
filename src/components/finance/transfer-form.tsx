"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/finance/ui/button";
import { Input } from "@/components/finance/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/finance/ui/select";
import { FinanceModal } from "@/components/finance/finance-modal";
import { createTransferAction } from "@/lib/finance-actions";
import { todayIso } from "@/lib/date";
import type { AccountRow } from "@/lib/db/repo-finance";

export function TransferFormButton({ accounts }: { accounts: AccountRow[] }) {
  const [open, setOpen] = useState(false);
  if (accounts.length < 2) return null;
  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" />
        New transfer
      </Button>
      {open && <TransferFormModal accounts={accounts} onClose={() => setOpen(false)} />}
    </>
  );
}

function TransferFormModal({ accounts, onClose }: { accounts: AccountRow[]; onClose: () => void }) {
  const [fromAccountId, setFromAccountId] = useState(accounts[0].id);
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? accounts[0].id);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createTransferAction({
        fromAccountId,
        toAccountId,
        amount: Number(amount) || 0,
        date,
        note: null,
      });
      if (!res.ok) setError(res.error);
      else onClose();
    });
  }

  return (
    <FinanceModal open onClose={onClose} title="New transfer">
      <div className="flex min-w-0 flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted-foreground">From</span>
          <Select value={String(fromAccountId)} onValueChange={(v) => setFromAccountId(Number(v))}>
            <SelectTrigger className="font-semibold">
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
          <span className="text-xs font-bold text-muted-foreground">To</span>
          <Select value={String(toAccountId)} onValueChange={(v) => setToAccountId(Number(v))}>
            <SelectTrigger className="font-semibold">
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
          <span className="text-xs font-bold text-muted-foreground">Amount (RM)</span>
          <Input type="number" inputMode="decimal" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted-foreground">Date</span>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            type="button"
            onClick={submit}
            disabled={pending || !amount || fromAccountId === toAccountId}
            
          >
            {pending ? "Transferring…" : "Transfer"}
          </Button>
        </div>
      </div>
    </FinanceModal>
  );
}
