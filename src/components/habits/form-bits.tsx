"use client";

import { cn } from "@/lib/utils";
import { HABIT_COLOR_KEYS, HABIT_COLORS, WEEKDAY_INITIAL, WEEKDAY_SHORT } from "@/lib/habits";
import { HABIT_ICON_KEYS, habitIcon } from "@/lib/habit-icons";
import { Check } from "lucide-react";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold uppercase tracking-wide text-h-muted">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-h-muted">{hint}</p>}
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-h-border bg-h-surface2 px-3 py-2.5 text-sm text-h-fg outline-none transition-colors placeholder:text-h-muted/70 focus:border-h-brand focus:ring-2 focus:ring-h-brand/25";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-h-surface2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-lg px-2 py-2 text-xs font-bold transition-all",
            value === o.value ? "bg-h-surface text-h-fg shadow-sm" : "text-h-muted hover:text-h-fg"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {HABIT_COLOR_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          aria-label={key}
          onClick={() => onChange(key)}
          style={{ background: HABIT_COLORS[key] }}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full ring-offset-2 ring-offset-h-surface transition-transform",
            value === key ? "scale-110 ring-2 ring-h-fg" : "hover:scale-105"
          )}
        >
          {value === key && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
        </button>
      ))}
    </div>
  );
}

export function IconPicker({
  value,
  onChange,
  color,
}: {
  value: string;
  onChange: (v: string) => void;
  color: string;
}) {
  return (
    <div className="grid grid-cols-8 gap-1.5">
      {HABIT_ICON_KEYS.map((key) => {
        const Icon = habitIcon(key);
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            aria-label={key}
            onClick={() => onChange(key)}
            style={active ? { background: color, color: "#fff" } : undefined}
            className={cn(
              "flex aspect-square items-center justify-center rounded-lg transition-colors",
              active ? "" : "bg-h-surface2 text-h-muted hover:text-h-fg"
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}

export function WeekdayPicker({
  value,
  onChange,
  color,
}: {
  value: number[];
  onChange: (v: number[]) => void;
  color: string;
}) {
  return (
    <div className="flex justify-between gap-1">
      {WEEKDAY_INITIAL.map((label, idx) => {
        const on = value.includes(idx);
        return (
          <button
            key={idx}
            type="button"
            aria-label={WEEKDAY_SHORT[idx]}
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((d) => d !== idx) : [...value, idx])}
            style={on ? { background: color, color: "#fff" } : undefined}
            className={cn(
              "flex h-10 flex-1 items-center justify-center rounded-xl text-xs font-bold transition-colors",
              on ? "" : "bg-h-surface2 text-h-muted hover:text-h-fg"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-h-surface2 text-lg font-bold text-h-fg"
      >
        −
      </button>
      <span className="min-w-8 text-center text-base font-extrabold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-h-surface2 text-lg font-bold text-h-fg"
      >
        +
      </button>
    </div>
  );
}

export type CategoryOption = { id: number; name: string; color: string; icon: string };
