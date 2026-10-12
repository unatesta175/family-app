"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FinanceModal } from "@/components/finance/finance-modal";
import { saveLendingAction, deleteLendingAction, setLendingStatusAction } from "@/lib/finance-actions";
import { FINANCE_LEND_DIRECTIONS } from "@/lib/db/schema";
import type { LendingRow } from "@/lib/db/repo-finance";
import { cn } from "@/lib/utils";

export function LendingFormButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)} className="gap-1.5 bg-h-brand text-h-brand-fg hover:opacity-90">
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
    <FinanceModal open={open} onClose={onClose} title={entry ? "Edit entry" : "New lending entry"}>
      <div className="flex flex-col gap-3">
        <div className="flex gap-1.5">
          {FINANCE_LEND_DIRECTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDirection(d)}
              className={cn(
                "flex-1 rounded-full border px-3 py-1.5 text-xs font-bold capitalize transition-colors",
                direction === d ? "border-h-brand bg-h-brand-soft text-h-brand" : "border-h-border text-h-muted"
              )}
            >
              {d === "lent" ? "I lent" : "I borrowed"}
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-h-muted">Who</span>
          <Input value={counterpartyName} onChange={(e) => setCounterpartyName(e.target.value)} placeholder="Name" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-h-muted">Amount (RM)</span>
          <Input type="number" inputMode="decimal" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-h-muted">Due date (optional)</span>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-h-muted">Note</span>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </label>
        {error && <p className="text-xs font-semibold text-h-bad">{error}</p>}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex gap-3">
            {entry && entry.status !== "settled" && (
              <button type="button" onClick={settle} disabled={pending} className="text-xs font-bold text-h-good">
                Mark settled
              </button>
            )}
            {entry && (
              <button type="button" onClick={remove} disabled={pending} className="text-xs font-bold text-h-bad">
                Delete
              </button>
            )}
          </div>
          <Button type="button" onClick={submit} disabled={pending || !counterpartyName.trim() || !amount} className="bg-h-brand text-h-brand-fg hover:opacity-90">
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </FinanceModal>
  );
}
