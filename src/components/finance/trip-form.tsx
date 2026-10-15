"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/finance/ui/button";
import { Input } from "@/components/finance/ui/input";
import { FinanceModal, FinanceField } from "@/components/finance/finance-modal";
import { saveTripAction, archiveTripAction, deleteTripAction } from "@/lib/finance-actions";
import type { TripRow } from "@/lib/db/repo-finance";

export function TripFormButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" />
        New trip
      </Button>
      <TripFormModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function TripFormModal({ trip, open, onClose }: { trip?: TripRow; open: boolean; onClose: () => void }) {
  const [name, setName] = useState(trip?.name ?? "");
  const [startDate, setStartDate] = useState(trip?.startDate ?? "");
  const [endDate, setEndDate] = useState(trip?.endDate ?? "");
  const [budget, setBudget] = useState(trip ? String(trip.budget) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveTripAction(trip?.id ?? null, {
        name,
        startDate,
        endDate,
        budget: Number(budget) || 0,
      });
      if (!res.ok) setError(res.error);
      else onClose();
    });
  }

  async function archive() {
    if (!trip) return;
    if (!confirm(`Archive "${trip.name}"?`)) return;
    startTransition(async () => {
      const res = await archiveTripAction(trip.id);
      if (!res.ok) setError(res.error);
      else onClose();
    });
  }

  async function remove() {
    if (!trip) return;
    if (!confirm(`Delete "${trip.name}"? Transactions will be unlinked, not deleted.`)) return;
    startTransition(async () => {
      const res = await deleteTripAction(trip.id);
      if (!res.ok) setError(res.error);
      else onClose();
    });
  }

  return (
    <FinanceModal
      open={open}
      onClose={onClose}
      title={trip ? "Edit trip" : "New trip"}
      onSave={submit}
      saveLabel={pending ? "Saving…" : "Save"}
      saveDisabled={pending || !name.trim() || !startDate || !endDate}
    >
      <div className="flex min-w-0 flex-col gap-5">
        <FinanceField label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Langkawi weekend" />
        </FinanceField>
        <div className="grid grid-cols-2 gap-3">
          <FinanceField label="Starts">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </FinanceField>
          <FinanceField label="Ends">
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </FinanceField>
        </div>
        <FinanceField label="Budget (RM)">
          <Input type="number" inputMode="decimal" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} />
        </FinanceField>
        {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
        {trip && (
          <div className="flex items-center justify-center gap-4">
            <button type="button" onClick={archive} disabled={pending} className="text-xs font-bold text-muted-foreground">
              Archive
            </button>
            <button type="button" onClick={remove} disabled={pending} className="text-xs font-bold text-destructive">
              Delete
            </button>
          </div>
        )}
      </div>
    </FinanceModal>
  );
}
