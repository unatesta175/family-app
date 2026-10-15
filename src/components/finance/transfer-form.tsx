"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/finance/ui/button";
import { Input } from "@/components/finance/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/finance/ui/select";
import { FinanceModal, FinanceField } from "@/components/finance/finance-modal";
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
    <FinanceModal
      open
      onClose={onClose}
      title="New transfer"
      onSave={submit}
      saveLabel={pending ? "Transferring…" : "Transfer"}
      saveDisabled={pending || !amount || fromAccountId === toAccountId}
    >
      <div className="flex min-w-0 flex-col gap-5">
        <div className="grid grid-cols-2 gap-3">
          <FinanceField label="From">
            <Select value={String(fromAccountId)} onValueChange={(v) => setFromAccountId(Number(v))}>
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
          </FinanceField>

          <FinanceField label="To">
            <Select value={String(toAccountId)} onValueChange={(v) => setToAccountId(Number(v))}>
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
          </FinanceField>
        </div>

        <FinanceField label="Amount (RM)">
          <Input type="number" inputMode="decimal" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </FinanceField>

        <FinanceField label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </FinanceField>

        {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
      </div>
    </FinanceModal>
  );
}
