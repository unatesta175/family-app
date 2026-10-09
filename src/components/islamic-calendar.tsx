"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Moon, Sparkles, Star } from "lucide-react";
import { eventsOn, type EventCategory, type IslamicEvent } from "@/lib/islamic-events";
import { toHijri } from "@/lib/hijri";
import { cn } from "@/lib/utils";

const CATEGORY_STYLE: Record<EventCategory, { dot: string; pill: string; icon: typeof Moon }> = {
  fasting: { dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 ring-emerald-100", icon: Moon },
  celebration: { dot: "bg-rose-500", pill: "bg-rose-50 text-rose-700 ring-rose-100", icon: Sparkles },
  virtue: { dot: "bg-amber-500", pill: "bg-amber-50 text-amber-700 ring-amber-100", icon: Star },
};

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const GREG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Noon local time, so day arithmetic never shifts across a DST or timezone boundary. */
function dayAt(year: number, monthIndex: number, day: number): Date {
  return new Date(year, monthIndex, day, 12, 0, 0);
}

type Cell = { date: Date; inMonth: boolean };

/** Full weeks (Sunday-first) covering `monthIndex`, padded with the trailing/leading days around it. */
function monthGrid(year: number, monthIndex: number): Cell[] {
  const first = dayAt(year, monthIndex, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay()); // back up to the Sunday on/before the 1st
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { date: dayAt(d.getFullYear(), d.getMonth(), d.getDate()), inMonth: d.getMonth() === monthIndex };
  });
}

const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function IslamicCalendar({ todayIso }: { todayIso: string }) {
  const [ty, tm] = todayIso.split("-").map(Number);
  const [view, setView] = useState({ year: ty, month: tm - 1 }); // month is 0-based
  const [selectedIso, setSelectedIso] = useState(todayIso);

  const cells = useMemo(() => monthGrid(view.year, view.month), [view]);

  // The Hijri months the visible Gregorian month spans, for the subtitle (e.g. "Rabi al-Thani – Jumada al-Awwal").
  const hijriSpan = useMemo(() => {
    const firstH = toHijri(dayAt(view.year, view.month, 1));
    const lastH = toHijri(dayAt(view.year, view.month + 1, 0));
    const years = firstH.year === lastH.year ? `${firstH.year} AH` : `${firstH.year}–${lastH.year} AH`;
    const months = firstH.monthName === lastH.monthName ? firstH.monthName : `${firstH.monthName} – ${lastH.monthName}`;
    return `${months} · ${years}`;
  }, [view]);

  const selected = useMemo(() => {
    const [y, m, d] = selectedIso.split("-").map(Number);
    const date = dayAt(y, m - 1, d);
    return { date, hijri: toHijri(date), events: eventsOn(date) };
  }, [selectedIso]);

  const step = (delta: number) => {
    const d = new Date(view.year, view.month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };
  const goToday = () => {
    setView({ year: ty, month: tm - 1 });
    setSelectedIso(todayIso);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Month header */}
      <div className="flex items-center justify-between gap-2 rounded-2xl bg-white p-3 shadow-sm">
        <button type="button" onClick={() => step(-1)} aria-label="Previous month" className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-500 hover:bg-neutral-100">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-extrabold text-neutral-900">{GREG_MONTHS[view.month]} {view.year}</p>
          <p className="truncate text-[11px] font-medium text-emerald-700">{hijriSpan}</p>
        </div>
        <button type="button" onClick={() => step(1)} aria-label="Next month" className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-500 hover:bg-neutral-100">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Grid */}
      <div className="rounded-2xl bg-white p-2.5 shadow-sm">
        <div className="mb-1 grid grid-cols-7">
          {WEEKDAYS.map((w, i) => (
            <div key={i} className={cn("py-1 text-center text-[11px] font-bold", i === 5 ? "text-emerald-600" : "text-neutral-400")}>
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            const iso = isoOf(cell.date);
            const hijri = toHijri(cell.date);
            const events = eventsOn(cell.date);
            const isToday = iso === todayIso;
            const isSelected = iso === selectedIso;
            const fasting = events.some((e) => e.fasting) && !events.some((e) => e.noFast);
            const cats = Array.from(new Set(events.map((e) => e.category)));
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelectedIso(iso)}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center rounded-xl p-0.5 transition-colors",
                  !cell.inMonth && "opacity-35",
                  isSelected ? "bg-emerald-700 text-white" : isToday ? "bg-emerald-50 ring-1 ring-emerald-300" : fasting ? "bg-emerald-50/50 hover:bg-emerald-50" : "hover:bg-neutral-100"
                )}
              >
                <span className={cn("text-sm font-bold leading-none tabular-nums", isSelected ? "text-white" : "text-neutral-800")}>{cell.date.getDate()}</span>
                <span className={cn("mt-0.5 text-[9px] font-medium leading-none tabular-nums", isSelected ? "text-emerald-100" : "text-neutral-400")}>{hijri.day}</span>
                <span className="mt-1 flex h-1.5 items-center gap-0.5">
                  {cats.slice(0, 3).map((c) => (
                    <span key={c} className={cn("h-1.5 w-1.5 rounded-full", isSelected ? "bg-white/80" : CATEGORY_STYLE[c].dot)} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-neutral-900">
              {selected.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
            <p className="text-xs font-medium text-emerald-700">{selected.hijri.day} {selected.hijri.monthName} {selected.hijri.year} AH</p>
          </div>
          {selectedIso !== todayIso && (
            <button type="button" onClick={goToday} className="shrink-0 rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800">
              Today
            </button>
          )}
        </div>
        <div className="flex flex-col gap-1.5 p-4">
          {selected.events.length > 0 ? (
            selected.events.map((e) => <EventRow key={e.key} event={e} />)
          ) : (
            <p className="py-2 text-center text-xs text-neutral-400">No special observances on this day.</p>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 px-1 text-[11px] font-medium text-neutral-500">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Fasting</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500" /> Celebration</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> Virtue</span>
      </div>
    </div>
  );
}

function EventRow({ event }: { event: IslamicEvent }) {
  const style = CATEGORY_STYLE[event.category];
  const Icon = style.icon;
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-neutral-50 px-3 py-2.5">
      <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ring-1", style.pill)}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-neutral-900">
          {event.name}
          {event.fasting && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">Fasting</span>}
          {event.noFast && <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">No fasting</span>}
        </p>
        <p className="text-xs text-neutral-500">{event.blurb}</p>
      </div>
    </div>
  );
}
