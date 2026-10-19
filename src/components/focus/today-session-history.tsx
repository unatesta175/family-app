"use client";

import { useMemo, useState } from "react";
import { SessionList, type HabitNames } from "@/components/focus/grove-views";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/habits/ui/select";
import { localHour, type SessionLite } from "@/lib/focus";
import { cn } from "@/lib/utils";

const TIME_RANGES = [
  { value: "morning", label: "Morning", sub: "5am–12pm", test: (h: number) => h >= 5 && h < 12 },
  { value: "afternoon", label: "Afternoon", sub: "12–5pm", test: (h: number) => h >= 12 && h < 17 },
  { value: "evening", label: "Evening", sub: "5–9pm", test: (h: number) => h >= 17 && h < 21 },
  { value: "night", label: "Night", sub: "9pm–5am", test: (h: number) => h >= 21 || h < 5 },
] as const;

/** Session history with dropdowns to filter down to one habit (or "No habit") and/or one time of day. */
export function TodaySessionHistory({ sessions, names, tz, readOnly = false }: { sessions: SessionLite[]; names: HabitNames; tz: number; readOnly?: boolean }) {
  const [habitFilter, setHabitFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");

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
  const byTime = (s: SessionLite) => {
    if (timeFilter === "all") return true;
    const range = TIME_RANGES.find((r) => r.value === timeFilter);
    return range ? range.test(localHour(s.startedAt, tz)) : true;
  };
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
        <Select value={timeFilter} onValueChange={setTimeFilter}>
          <SelectTrigger aria-label="Filter sessions by time of day" className="font-bold">
            <SelectValue placeholder="All times" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All times</SelectItem>
            {TIME_RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label} <span className="font-normal text-h-muted">· {r.sub}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {filtered.length > 0 ? (
        <SessionList sessions={filtered} names={names} tz={tz} readOnly={readOnly} />
      ) : (
        <p className="rounded-2xl border border-dashed border-h-border p-6 text-center text-sm text-h-muted">No sessions match these filters.</p>
      )}
    </div>
  );
}
