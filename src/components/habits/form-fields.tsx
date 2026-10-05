"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { inputClass } from "@/components/habits/form-bits";

/** A titled block of related form controls (SaaS-style settings section). */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-3 rounded-2xl border border-h-border bg-h-surface p-4", className)}>
      <div>
        <h3 className="text-sm font-extrabold leading-tight tracking-tight">{title}</h3>
        {description && <p className="mt-0.5 text-xs leading-snug text-h-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/** A time of day, as minutes since midnight. The browser shows its own 12 or 24 hour picker. */
export function TimeOfDayInput({ minutes, onChange, className, ...rest }: { minutes: number; onChange: (minutes: number) => void; className?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  const m = Math.min(1439, Math.max(0, Math.round(minutes)));
  const value = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  return (
    <input
      {...rest}
      type="time"
      value={value}
      onChange={(e) => {
        const [h, min] = e.target.value.split(":").map(Number);
        if (Number.isFinite(h) && Number.isFinite(min)) onChange(h * 60 + min);
      }}
      className={cn(inputClass, className)}
    />
  );
}

/** A small caption above a control. */
export function Caption({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-bold uppercase tracking-wide text-h-muted">{children}</span>;
}

/**
 * Free-typing number input: keeps what you type (so "2." and "" work) and only reports valid numbers.
 * `integer` rejects decimals. Reports `null` while the field is empty.
 */
export function NumberInput({
  value,
  onChange,
  min = 0,
  max = 1_000_000_000,
  integer = false,
  placeholder,
  className,
  "aria-label": ariaLabel,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  integer?: boolean;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const [draft, setDraft] = useState(value === null ? "" : String(value));

  // Follow outside changes (clamping, switching habit type) without fighting what's being typed:
  // "2." and "" both still parse to the value the parent already holds, so they're left alone.
  const parsed = draft === "" || draft === "." || draft === "-" || draft === "-." ? null : Number(draft);
  if (parsed !== value) setDraft(value === null ? "" : String(value));

  return (
    <input
      value={draft}
      inputMode={integer ? "numeric" : "decimal"}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const raw = e.target.value.replace(",", ".");
        // A minus sign is only accepted where the field allows numbers below zero.
        const sign = min < 0 ? "-?" : "";
        if (!new RegExp(`^${sign}${integer ? "\\d*" : "\\d*\\.?\\d*"}$`).test(raw)) return;
        setDraft(raw);
        if (raw === "" || raw === "." || raw === "-" || raw === "-.") {
          onChange(null);
          return;
        }
        const n = Number(raw);
        if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
      }}
      className={cn(inputClass, "tabular-nums", className)}
    />
  );
}

/** Hours / minutes / seconds fields editing one value in seconds. */
export function DurationInput({
  seconds,
  onChange,
  className,
}: {
  seconds: number;
  onChange: (seconds: number) => void;
  className?: string;
}) {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  function part(label: string, value: number, max: number, set: (n: number) => void) {
    return (
      <label className="flex flex-1 flex-col gap-1">
        <NumberInput
          integer
          min={0}
          max={max}
          value={value}
          aria-label={label}
          onChange={(n) => set(n ?? 0)}
          className="text-center"
        />
        <span className="text-center text-[10px] font-bold uppercase tracking-wide text-h-muted">{label}</span>
      </label>
    );
  }

  return (
    <div className={cn("flex items-start gap-2", className)}>
      {part("Hours", h, 999, (n) => onChange(n * 3600 + m * 60 + s))}
      {part("Minutes", m, 59, (n) => onChange(h * 3600 + n * 60 + s))}
      {part("Seconds", s, 59, (n) => onChange(h * 3600 + m * 60 + n))}
    </div>
  );
}

/** A selectable card used for single-choice options (radio-group semantics). */
export function OptionCard({
  active,
  onClick,
  icon: Icon,
  title,
  description,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      style={active ? { borderColor: accent, background: `${accent}14` } : undefined}
      className={cn(
        "flex flex-col items-start gap-1 rounded-xl border-2 p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-h-brand/40",
        active ? "" : "border-h-border bg-h-surface hover:bg-h-surface2"
      )}
    >
      <Icon className="h-4.5 w-4.5" style={{ color: active ? accent : "var(--h-muted)" }} />
      <span className="text-[13px] font-extrabold leading-tight">{title}</span>
      <span className="text-[11px] leading-tight text-h-muted">{description}</span>
    </button>
  );
}

/** Label + description on the left, a control (usually a Switch) on the right. */
export function ToggleRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl bg-h-surface2 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-bold leading-tight">{title}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-h-muted">{description}</p>
      </div>
      <div className="pt-0.5">{children}</div>
    </div>
  );
}
