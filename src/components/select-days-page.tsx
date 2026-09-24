"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronsUpDown, Check, ListChecks, Eraser } from "lucide-react";
import { BulkLogDrawer } from "@/components/bulk-log-drawer";
import { setBulkStatusesAction } from "@/lib/actions";
import { PRAYER_ORDER } from "@/lib/prayers";
import { addMonths, parseIso } from "@/lib/date";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthGrid(year: number, month: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = new Date(year, month, 1).getDay(); // 0=Sun start, matches Sun-first header
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return { day: d, date };
  });
  return { leadingBlanks, days };
}

export function SelectDaysPage({
  profileId,
  today,
  haydEnabled = false,
}: {
  profileId: number;
  today: string;
  haydEnabled?: boolean;
}) {
  const router = useRouter();
  const [anchor, setAnchor] = useState(today);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isClearing, startClearing] = useTransition();

  const anchorDate = parseIso(anchor);
  const year = anchorDate.getFullYear();
  const month = anchorDate.getMonth();
  const { leadingBlanks, days } = monthGrid(year, month);
  const monthLabel = anchorDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  function toggleDate(date: string) {
    if (date > today) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  const selectedDates = Array.from(selected).sort();

  function handleClear() {
    startClearing(async () => {
      await setBulkStatusesAction({ profileId, dates: selectedDates, clear: [...PRAYER_ORDER] });
      router.push("/history");
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-neutral-900">Select Days</h1>
        <Link
          href="/history"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
          aria-label="Done"
        >
          <Check className="h-4 w-4" />
        </Link>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between rounded-full bg-neutral-50 px-2 py-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setAnchor((a) => addMonths(a, -1))}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-500 shadow-sm hover:text-emerald-700"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-400 shadow-sm">
              <ChevronsUpDown className="h-4 w-4" />
            </span>
          </div>
          <p className="text-sm font-bold text-neutral-900">{monthLabel}</p>
          <button
            type="button"
            onClick={() => setAnchor((a) => addMonths(a, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-500 shadow-sm hover:text-emerald-700"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center">
          {WEEKDAY_LABELS.map((label, i) => (
            <p
              key={label}
              className={cn("text-[10px] font-semibold", i === 0 || i === 6 ? "text-emerald-600" : "text-neutral-400")}
            >
              {label}
            </p>
          ))}
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {days.map(({ day, date }) => {
            const isToday = date === today;
            const isSelected = selected.has(date);
            const isFuture = date > today;
            return (
              <button
                key={date}
                type="button"
                onClick={() => toggleDate(date)}
                disabled={isFuture}
                className={cn(
                  "relative mx-auto mt-1 flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                  isFuture && "pointer-events-none text-neutral-300",
                  !isFuture && isToday && "bg-emerald-700 text-white",
                  !isFuture && !isToday && isSelected && "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300",
                  !isFuture && !isToday && !isSelected && "text-neutral-700 hover:bg-neutral-50"
                )}
              >
                {day}
                {isSelected && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-white">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-full bg-emerald-800 py-2 pl-5 pr-2 text-white shadow-lg">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
              {selected.size}
            </span>
            Days Selected
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={isClearing}
              onClick={handleClear}
              className="flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-2.5 text-sm font-bold hover:bg-white/25 disabled:opacity-60"
            >
              <Eraser className="h-4 w-4" />
              {isClearing ? "Clearing…" : "Clear"}
            </button>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-bold hover:bg-emerald-500"
            >
              <ListChecks className="h-4 w-4" />
              LOG
            </button>
          </div>
        </div>
      )}

      {drawerOpen && (
        <BulkLogDrawer
          profileId={profileId}
          dates={selectedDates}
          onClose={() => setDrawerOpen(false)}
          onSaved={() => router.push("/history")}
          haydEnabled={haydEnabled}
        />
      )}
    </div>
  );
}
