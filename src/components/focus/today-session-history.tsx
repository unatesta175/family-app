"use client";

import { useMemo, useState } from "react";
import { SessionList, type HabitNames } from "@/components/focus/grove-views";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/habits/ui/select";
import type { SessionLite } from "@/lib/focus";

/** Today's session list with a dropdown to filter down to one habit (or "No habit"). */
export function TodaySessionHistory({ sessions, names, tz, readOnly = false }: { sessions: SessionLite[]; names: HabitNames; tz: number; readOnly?: boolean }) {
  const [filter, setFilter] = useState("all");

  const options = useMemo(() => {
    const ids = new Set<number | null>();
    for (const s of sessions) {
      if (s.status === "active") continue;
      ids.add(s.habitId);
    }
    return [...ids]
      .map((id) => ({ value: id === null ? "none" : String(id), label: id === null ? "No habit" : names.get(id) ?? "Habit" }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [sessions, names]);

  if (options.length === 0) return null;

  const filtered = filter === "all" ? sessions : sessions.filter((s) => (filter === "none" ? s.habitId === null : s.habitId === Number(filter)));

  return (
    <div className="flex flex-col gap-2">
      {options.length > 1 && (
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger aria-label="Filter sessions by habit" className="font-bold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All habits</SelectItem>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <SessionList sessions={filtered} names={names} tz={tz} readOnly={readOnly} />
    </div>
  );
}
