"use client";

import { useState } from "react";
import { TripFormModal } from "@/components/finance/trip-form";
import type { TripRow } from "@/lib/db/repo-finance";
import { cn } from "@/lib/utils";

const money = (n: number) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function TripRowItem({ trip, spend, readOnly }: { trip: TripRow; spend: number; readOnly: boolean }) {
  const [editing, setEditing] = useState(false);
  const pct = trip.budget > 0 ? Math.min(100, (spend / trip.budget) * 100) : 0;
  const over = trip.budget > 0 && spend > trip.budget;

  return (
    <li className="py-3">
      <button type="button" disabled={readOnly} onClick={() => setEditing(true)} className="flex w-full items-center justify-between gap-3 text-left disabled:cursor-default">
        <div className="min-w-0">
          <span className="block truncate text-sm font-bold">{trip.name}</span>
          <span className="block text-[11px] font-semibold text-h-muted">
            {trip.startDate} → {trip.endDate}
          </span>
        </div>
        <div className="shrink-0 text-right">
          <span className={cn("block text-sm font-extrabold tabular-nums", over && "text-h-bad")}>{money(spend)}</span>
          <span className="block text-[11px] font-semibold text-h-muted">of {money(trip.budget)}</span>
        </div>
      </button>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-h-surface2">
        <div className={cn("h-full rounded-full", over ? "bg-h-bad" : "bg-h-brand")} style={{ width: `${pct}%` }} />
      </div>
      {editing && <TripFormModal trip={trip} open onClose={() => setEditing(false)} />}
    </li>
  );
}
