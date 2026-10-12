"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/finance/ui/button";
import { Input } from "@/components/finance/ui/input";
import { FinanceModal } from "@/components/finance/finance-modal";
import { saveTripAction, archiveTripAction, deleteTripAction } from "@/lib/finance-actions";
import type { TripRow } from "@/lib/db/repo-finance";

export function TripFormButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)} className="gap-1.5 bg-h-brand text-h-brand-fg hover:opacity-90">
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
    <FinanceModal open={open} onClose={onClose} title={trip ? "Edit trip" : "New trip"}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-h-muted">Name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Langkawi weekend" />
        </label>
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs font-bold text-h-muted">Start date</span>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs font-bold text-h-muted">End date</span>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-h-muted">Budget (RM)</span>
          <Input type="number" inputMode="decimal" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} />
        </label>
        {error && <p className="text-xs font-semibold text-h-bad">{error}</p>}
        <div className="flex items-center justify-between gap-2 pt-1">
          {trip ? (
            <div className="flex gap-3">
              <button type="button" onClick={archive} disabled={pending} className="text-xs font-bold text-h-muted">
                Archive
              </button>
              <button type="button" onClick={remove} disabled={pending} className="text-xs font-bold text-h-bad">
                Delete
              </button>
            </div>
          ) : (
            <span />
          )}
          <Button type="button" onClick={submit} disabled={pending || !name.trim() || !startDate || !endDate} className="bg-h-brand text-h-brand-fg hover:opacity-90">
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </FinanceModal>
  );
}
