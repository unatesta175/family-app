"use client";

import { useState } from "react";
import { Luggage } from "lucide-react";
import { TripFormModal } from "@/components/finance/trip-form";
import { Progress } from "@/components/finance/ui/progress";
import type { TripRow } from "@/lib/db/repo-finance";
import { cn } from "@/lib/utils";

const money = (n: number) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function TripRowItem({ trip, spend, readOnly }: { trip: TripRow; spend: number; readOnly: boolean }) {
  const [editing, setEditing] = useState(false);
  const pct = trip.budget > 0 ? Math.min(100, (spend / trip.budget) * 100) : 0;
  const over = trip.budget > 0 && spend > trip.budget;

  return (
    <li className="py-3">
      <button type="button" disabled={readOnly} onClick={() => setEditing(true)} className="flex w-full items-center gap-3 text-left disabled:cursor-default">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
          <Luggage className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">{trip.name}</span>
          <span className="block text-[11px] font-semibold text-muted-foreground">
            {trip.startDate} → {trip.endDate}
          </span>
        </div>
        <div className="shrink-0 text-right">
          <span className={cn("block text-sm font-extrabold tabular-nums", over && "text-destructive")}>{money(spend)}</span>
          <span className="block text-[11px] font-semibold text-muted-foreground">of {money(trip.budget)}</span>
        </div>
      </button>
      <Progress value={pct} className="mt-2 h-1.5" indicatorClassName={over ? "bg-destructive" : "bg-sky-500"} />
      {editing && <TripFormModal trip={trip} open onClose={() => setEditing(false)} />}
    </li>
  );
}
