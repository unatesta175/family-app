"use client";

import { useState } from "react";
import type { MonthCalendar } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { DayDetailSheet } from "@/components/day-detail-sheet";

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function tierClass(count: number): string {
  if (count <= 0) return "bg-neutral-100 text-neutral-400";
  if (count <= 2) return "bg-emerald-100 text-emerald-700";
  if (count <= 4) return "bg-emerald-400 text-white";
  return "bg-emerald-700 text-white";
}

export function StatsCalendarHeatmap({ calendar }: { calendar: MonthCalendar }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selectedCell = calendar.cells.find((c) => c.date === selectedDate) ?? null;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
          <span>0</span>
          <span className="h-2.5 w-2.5 rounded-sm bg-neutral-100" />
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-100" />
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-700" />
          <span>5</span>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          {calendar.totalPrayed} Prayed
        </span>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-neutral-400">
            {d}
          </div>
        ))}

        {Array.from({ length: calendar.leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}

        {calendar.cells.map((cell) => (
          <button
            key={cell.date}
            type="button"
            onClick={() => setSelectedDate(cell.date)}
            className={cn(
              "flex aspect-square items-center justify-center rounded-lg text-xs font-semibold transition-colors",
              tierClass(cell.count),
              cell.isToday && "ring-2 ring-emerald-600 ring-offset-1"
            )}
            title={`${cell.count} of 5 prayers`}
          >
            {cell.day}
          </button>
        ))}
      </div>

      {selectedCell && (
        <DayDetailSheet
          date={selectedCell.date}
          log={selectedCell.log}
          hasLog={selectedCell.hasLog}
          isToday={selectedCell.isToday}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}
