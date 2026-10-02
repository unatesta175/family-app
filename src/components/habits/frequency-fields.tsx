"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { MONTH_SHORT, PERIOD_MAX, yearDayLabel } from "@/lib/habits";
import { PERIOD_UNITS, type HabitSchedule } from "@/lib/db/schema";
import type { HabitFormValues } from "@/lib/habit-form-values";
import { Caption, NumberInput, ToggleRow } from "@/components/habits/form-fields";
import { WeekdayPicker } from "@/components/habits/form-bits";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/habits/ui/select";
import { Switch } from "@/components/habits/ui/switch";
import { cn } from "@/lib/utils";

type SetField = <K extends keyof HabitFormValues>(key: K, value: HabitFormValues[K]) => void;

const FREQUENCIES: { value: HabitSchedule; label: string }[] = [
  { value: "daily", label: "Everyday" },
  { value: "weekdays", label: "Specific days of the week" },
  { value: "month_days", label: "Specific days of the month" },
  { value: "year_days", label: "Specific days of the year" },
  { value: "weekly_count", label: "Some days per period" },
  { value: "repeat", label: "Repeat" },
];

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Frequencies whose occurrences land on specific days, so "flexible" carry-over makes sense. */
const FLEXIBLE_SCHEDULES: HabitSchedule[] = ["weekdays", "month_days", "year_days", "repeat"];

export function FrequencyFields({ v, set, hex }: { v: HabitFormValues; set: SetField; hex: string }) {
  return (
    <div className="flex flex-col gap-3">
      <Select value={v.schedule} onValueChange={(s) => set("schedule", s as HabitSchedule)}>
        <SelectTrigger aria-label="Frequency">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FREQUENCIES.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {v.schedule === "weekdays" && <WeekdayPicker value={v.weekdays} onChange={(d) => set("weekdays", d)} color={hex} />}

      {v.schedule === "month_days" && (
        <div className="flex flex-col gap-1.5">
          <Caption>Days of the month</Caption>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
              const on = v.monthDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set("monthDays", on ? v.monthDays.filter((d) => d !== day) : [...v.monthDays, day])}
                  style={on ? { background: hex, color: "#fff" } : undefined}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-lg text-xs font-bold tabular-nums transition-colors",
                    on ? "" : "bg-h-surface2 text-h-muted hover:text-h-fg"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
          {v.monthDays.some((d) => d > 28) && (
            <p className="text-[11px] leading-snug text-h-muted">
              In shorter months, days past the end of the month land on the last day.
            </p>
          )}
        </div>
      )}

      {v.schedule === "year_days" && <YearDaysPicker v={v} set={set} hex={hex} />}

      {v.schedule === "weekly_count" && (
        <div className="flex flex-col gap-1.5">
          <Caption>Days to do it</Caption>
          <div className="flex items-center gap-2">
            <NumberInput
              integer
              min={1}
              max={PERIOD_MAX[v.periodUnit]}
              value={v.weeklyTarget}
              aria-label="Days per period"
              onChange={(n) => set("weeklyTarget", n ?? 1)}
              className="w-20 text-center"
            />
            <span className="text-sm font-semibold text-h-muted">days per</span>
            <Select
              value={v.periodUnit}
              onValueChange={(u) => {
                const unit = u as HabitFormValues["periodUnit"];
                set("periodUnit", unit);
                if (v.weeklyTarget > PERIOD_MAX[unit]) set("weeklyTarget", PERIOD_MAX[unit]);
              }}
            >
              <SelectTrigger aria-label="Period" className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_UNITS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u[0].toUpperCase() + u.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-[11px] leading-snug text-h-muted">
            Any day counts — it just has to happen {v.weeklyTarget} time{v.weeklyTarget === 1 ? "" : "s"} each {v.periodUnit}.
          </p>
        </div>
      )}

      {v.schedule === "repeat" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Caption>Repeat</Caption>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-h-muted">Every</span>
              <NumberInput
                integer
                min={1}
                max={365}
                value={v.repeatEvery}
                aria-label="Repeat every N days"
                onChange={(n) => set("repeatEvery", n ?? 1)}
                className="w-20 text-center"
              />
              <span className="text-sm font-semibold text-h-muted">day{v.repeatEvery === 1 ? "" : "s"}</span>
            </div>
          </div>
          <ToggleRow
            title="Alternate days"
            description={`Do it for ${v.repeatEvery} day${v.repeatEvery === 1 ? "" : "s"}, then rest for ${v.repeatEvery}, and keep alternating.`}
          >
            <Switch checked={v.alternate} onCheckedChange={(c) => set("alternate", c)} aria-label="Alternate days" />
          </ToggleRow>
        </div>
      )}

      {FLEXIBLE_SCHEDULES.includes(v.schedule) && (
        <ToggleRow
          title="Flexible"
          description="If you don't do it on the scheduled day, it stays on your list every day until you complete it, instead of being marked missed."
        >
          <Switch checked={v.flexible} onCheckedChange={(c) => set("flexible", c)} aria-label="Flexible" />
        </ToggleRow>
      )}
    </div>
  );
}

function YearDaysPicker({ v, set, hex }: { v: HabitFormValues; set: SetField; hex: string }) {
  const [month, setMonth] = useState("1");
  const [day, setDay] = useState("1");

  const maxDay = DAYS_IN_MONTH[Number(month) - 1];
  const safeDay = Math.min(Number(day), maxDay);
  const key = `${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
  const exists = v.yearDays.includes(key);

  return (
    <div className="flex flex-col gap-2">
      <Caption>Dates in the year</Caption>
      <div className="flex gap-2">
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger aria-label="Month" className="flex-[1.4]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_SHORT.map((m, i) => (
              <SelectItem key={m} value={String(i + 1)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(safeDay)} onValueChange={setDay}>
          <SelectTrigger aria-label="Day" className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
              <SelectItem key={d} value={String(d)}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          disabled={exists}
          onClick={() => set("yearDays", [...v.yearDays, key].sort())}
          aria-label="Add date"
          style={{ background: hex }}
          className="flex h-10 shrink-0 items-center gap-1 rounded-xl px-3 text-sm font-bold text-white transition-opacity disabled:opacity-40"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Add
        </button>
      </div>
      {v.yearDays.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {v.yearDays.map((k) => (
            <span
              key={k}
              className="flex items-center gap-1 rounded-full bg-h-surface2 py-1 pl-3 pr-1.5 text-xs font-bold"
            >
              {yearDayLabel(k)}
              <button
                type="button"
                aria-label={`Remove ${yearDayLabel(k)}`}
                onClick={() =>
                  set(
                    "yearDays",
                    v.yearDays.filter((d) => d !== k)
                  )
                }
                className="flex h-5 w-5 items-center justify-center rounded-full text-h-muted hover:bg-h-border hover:text-h-fg"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[11px] leading-snug text-h-muted">Pick a month and day, then Add. You can add as many dates as you like.</p>
      )}
    </div>
  );
}
