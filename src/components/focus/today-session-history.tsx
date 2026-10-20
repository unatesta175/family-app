"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { SessionList, type HabitNames } from "@/components/focus/grove-views";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/habits/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/habits/ui/popover";
import { TimeRangeSlider, inTimeRange, timeFilterLabel, type TimeFilterValue } from "@/components/focus/time-range-slider";
import { localHour, type SessionLite } from "@/lib/focus";
import { cn } from "@/lib/utils";

/** Session history with dropdowns to filter down to one habit (or "No habit") and/or one time of day. */
export function TodaySessionHistory({ sessions, names, tz, readOnly = false }: { sessions: SessionLite[]; names: HabitNames; tz: number; readOnly?: boolean }) {
  const [habitFilter, setHabitFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilterValue>("all");

  const done = useMemo(() => sessions.filter((s) => s.status !== "active"), [sessions]);

  const habitOptions = useMemo(() => {
    const ids = new Set<number | null>();
    for (const s of done) ids.add(s.habitId);
    return [...ids]
      .map((id) => ({ value: id === null ? "none" : String(id), label: id === null ? "No habit" : names.get(id) ?? "Habit" }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [done, names]);

  if (done.length === 0) return null;

  const showHabitFilter = habitOptions.length > 1;
  const byHabit = (s: SessionLite) => habitFilter === "all" || (habitFilter === "none" ? s.habitId === null : s.habitId === Number(habitFilter));
  const byTime = (s: SessionLite) => timeFilter === "all" || inTimeRange(localHour(s.startedAt, tz), timeFilter);
  const filtered = done.filter((s) => byHabit(s) && byTime(s));

  return (
    <div className="flex flex-col gap-2">
      <div className={cn("grid gap-2", showHabitFilter ? "grid-cols-2" : "grid-cols-1")}>
        {showHabitFilter && (
          <Select value={habitFilter} onValueChange={setHabitFilter}>
            <SelectTrigger aria-label="Filter sessions by habit" className="font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All habits</SelectItem>
              {habitOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Popover>
          <PopoverTrigger
            aria-label="Filter sessions by time of day"
            className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-h-border bg-h-surface2 px-3 text-left text-sm font-bold text-h-fg outline-none transition-colors hover:border-h-muted/40 focus-visible:border-h-brand focus-visible:ring-2 focus-visible:ring-h-brand/25 data-[state=open]:border-h-brand"
          >
            <span className="truncate">{timeFilterLabel(timeFilter)}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-h-muted" />
          </PopoverTrigger>
          <PopoverContent>
            <TimeRangeSlider value={timeFilter} onChange={setTimeFilter} />
          </PopoverContent>
        </Popover>
      </div>
      {filtered.length > 0 ? (
        <SessionList sessions={filtered} names={names} tz={tz} readOnly={readOnly} />
      ) : (
        <p className="rounded-2xl border border-dashed border-h-border p-6 text-center text-sm text-h-muted">No sessions match these filters.</p>
      )}
    </div>
  );
}
