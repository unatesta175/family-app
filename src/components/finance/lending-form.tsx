"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/finance/ui/button";
import { Input } from "@/components/finance/ui/input";
import { FinanceModal, FinanceField } from "@/components/finance/finance-modal";
import { saveLendingAction, deleteLendingAction, setLendingStatusAction } from "@/lib/finance-actions";
import { FINANCE_LEND_DIRECTIONS } from "@/lib/db/schema";
import type { LendingRow } from "@/lib/db/repo-finance";
import { cn } from "@/lib/utils";

export function LendingFormButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" />
        Add entry
      </Button>
      <LendingFormModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function LendingFormModal({ entry, open, onClose }: { entry?: LendingRow; open: boolean; onClose: () => void }) {
  const [counterpartyName, setCounterpartyName] = useState(entry?.counterpartyName ?? "");
  const [direction, setDirection] = useState(entry?.direction ?? "lent");
  const [amount, setAmount] = useState(entry ? String(entry.amount) : "");
  const [note, setNote] = useState(entry?.note ?? "");
  const [dueDate, setDueDate] = useState(entry?.dueDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveLendingAction(entry?.id ?? null, {
        counterpartyName,
        direction,
        amount: Number(amount) || 0,
        note: note.trim() || null,
        dueDate: dueDate || null,
      });
      if (!res.ok) setError(res.error);
      else onClose();
    });
  }

  async function settle() {
    if (!entry) return;
    startTransition(async () => {
      await setLendingStatusAction(entry.id, "settled");
      onClose();
    });
  }

  async function remove() {
    if (!entry) return;
    if (!confirm("Delete this entry?")) return;
    startTransition(async () => {
      const res = await deleteLendingAction(entry.id);
      if (!res.ok) setError(res.error);
      else onClose();
    });
  }

  return (
    <FinanceModal
      open={open}
      onClose={onClose}
      title={entry ? "Edit entry" : "New lending entry"}
      onSave={submit}
      saveLabel={pending ? "Saving…" : "Save"}
      saveDisabled={pending || !counterpartyName.trim() || !amount}
    >
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex gap-1 rounded-xl border border-border bg-surface p-1">
          {FINANCE_LEND_DIRECTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDirection(d)}
              className={cn(
                "flex-1 rounded-xl px-3 py-1.5 text-xs font-bold capitalize transition-colors",
                direction === d ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {d === "lent" ? "I lent" : "I borrowed"}
            </button>
          ))}
        </div>
        <FinanceField label="Who">
          <Input value={counterpartyName} onChange={(e) => setCounterpartyName(e.target.value)} placeholder="Name" />
        </FinanceField>
        <FinanceField label="Amount (RM)">
          <Input type="number" inputMode="decimal" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </FinanceField>
        <FinanceField label="Due date (optional)">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </FinanceField>
        <FinanceField label="Note">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </FinanceField>
        {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
        {entry && (
          <div className="flex items-center justify-center gap-4">
            {entry.status !== "settled" && (
              <button type="button" onClick={settle} disabled={pending} className="text-xs font-bold text-success">
                Mark settled
              </button>
            )}
            <button type="button" onClick={remove} disabled={pending} className="text-xs font-bold text-destructive">
              Delete
            </button>
          </div>
        )}
      </div>
    </FinanceModal>
  );
}
