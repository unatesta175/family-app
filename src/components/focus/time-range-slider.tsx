"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type TimeRange = { start: number; end: number };

/** "all" means no filter; a range is hours-of-day (0–24, half-hour steps). `end < start` wraps past midnight. */
export type TimeFilterValue = "all" | TimeRange;

const STEP = 0.5;
const PRESETS: { label: string; sub: string; value: TimeFilterValue }[] = [
  { label: "All day", sub: "Any time", value: "all" },
  { label: "Morning", sub: "5am–12pm", value: { start: 5, end: 12 } },
  { label: "Afternoon", sub: "12–5pm", value: { start: 12, end: 17 } },
  { label: "Evening", sub: "5–9pm", value: { start: 17, end: 21 } },
  { label: "Night", sub: "9pm–5am", value: { start: 21, end: 5 } },
];

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function snap(hour: number): number {
  return clamp(Math.round(hour / STEP) * STEP, 0, 24 - STEP);
}

/** "5:30 AM" for an hour-of-day, fractional. */
export function formatHour(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  let hh = Math.floor(h);
  let mm = Math.round((h - hh) * 60);
  if (mm === 60) {
    mm = 0;
    hh = (hh + 1) % 24;
  }
  const period = hh < 12 ? "AM" : "PM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return mm === 0 ? `${h12} ${period}` : `${h12}:${String(mm).padStart(2, "0")} ${period}`;
}

export function timeFilterLabel(value: TimeFilterValue): string {
  if (value === "all") return "All day";
  return `${formatHour(value.start)} – ${formatHour(value.end)}`;
}

/** Whether an hour-of-day falls within a (possibly wrapping) range. */
export function inTimeRange(hour: number, range: TimeRange): boolean {
  const { start, end } = range;
  if (start === end) return true;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

const TICKS = [0, 6, 12, 18] as const;
const tickLabel = (h: number) => (h === 0 ? "12a" : h === 12 ? "12p" : h < 12 ? `${h}a` : `${h - 12}p`);

/**
 * A draggable dual-handle slider for picking an hour-of-day range (wraps past midnight), plus quick
 * presets. Each handle moves independently, so "9pm–5am" is a normal range, not a special case.
 */
export function TimeRangeSlider({ value, onChange }: { value: TimeFilterValue; onChange: (v: TimeFilterValue) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);
  const range = useMemo(() => (value === "all" ? { start: 0, end: 24 - STEP } : value), [value]);
  const titleId = useId();

  const hourFromClientX = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return snap(ratio * 24);
  }, []);

  const setHandle = useCallback(
    (which: "start" | "end", hour: number) => {
      onChange({ ...range, [which]: hour });
    },
    [onChange, range]
  );

  const beginDrag = useCallback(
    (which: "start" | "end") => (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(which);
    },
    []
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      setHandle(dragging, hourFromClientX(e.clientX));
    },
    [dragging, hourFromClientX, setHandle]
  );

  const endDrag = useCallback(() => setDragging(null), []);

  const onTrackPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.target !== trackRef.current) return;
      trackRef.current?.setPointerCapture(e.pointerId);
      const hour = hourFromClientX(e.clientX);
      const distStart = Math.min(Math.abs(hour - range.start), 24 - Math.abs(hour - range.start));
      const distEnd = Math.min(Math.abs(hour - range.end), 24 - Math.abs(hour - range.end));
      const which = distStart <= distEnd ? "start" : "end";
      setHandle(which, hour);
      setDragging(which);
    },
    [hourFromClientX, range.start, range.end, setHandle]
  );

  const onKeyDown = useCallback(
    (which: "start" | "end") => (e: React.KeyboardEvent) => {
      const dir = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      const current = which === "start" ? range.start : range.end;
      setHandle(which, snap((current + dir * STEP + 24) % 24));
    },
    [range.start, range.end, setHandle]
  );

  const startPct = (range.start / 24) * 100;
  const endPct = (range.end / 24) * 100;
  const wraps = range.end < range.start;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p id={titleId} className="text-sm font-bold text-h-fg">
          {value === "all" ? "All day" : `${formatHour(range.start)} – ${formatHour(range.end)}`}
        </p>
        <p className="text-xs text-h-muted">Drag the handles, or pick a preset below.</p>
      </div>

      <div className="px-1 pb-1 pt-3">
        <div
          ref={trackRef}
          onPointerDown={onTrackPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="relative h-1.5 w-full cursor-pointer touch-none rounded-full bg-h-surface2"
        >
          {wraps ? (
            <>
              <div className="absolute inset-y-0 left-0 rounded-l-full bg-h-brand" style={{ width: `${endPct}%` }} />
              <div className="absolute inset-y-0 right-0 rounded-r-full bg-h-brand" style={{ width: `${100 - startPct}%` }} />
            </>
          ) : (
            <div className="absolute inset-y-0 rounded-full bg-h-brand" style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }} />
          )}

          {(["start", "end"] as const).map((which) => {
            const pct = which === "start" ? startPct : endPct;
            const hour = which === "start" ? range.start : range.end;
            return (
              <div
                key={which}
                role="slider"
                tabIndex={0}
                aria-label={which === "start" ? "Range start" : "Range end"}
                aria-valuemin={0}
                aria-valuemax={23.5}
                aria-valuenow={hour}
                aria-valuetext={formatHour(hour)}
                aria-describedby={titleId}
                onPointerDown={beginDrag(which)}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onKeyDown={onKeyDown(which)}
                className={cn(
                  "absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-2 border-h-brand bg-h-surface shadow-[0_1px_3px_rgba(0,0,0,0.35)] outline-none transition-transform",
                  "hover:scale-110 focus-visible:ring-2 focus-visible:ring-h-brand/40",
                  dragging === which && "scale-110"
                )}
                style={{ left: `${pct}%` }}
              />
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-[10px] font-medium text-h-muted">
          {TICKS.map((h) => (
            <span key={h}>{tickLabel(h)}</span>
          ))}
          <span>12a</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => {
          const active = value === "all" ? p.value === "all" : p.value !== "all" && p.value.start === range.start && p.value.end === range.end;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(p.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                active ? "border-h-brand bg-h-brand-soft text-h-brand" : "border-h-border bg-h-surface2 text-h-muted hover:text-h-fg"
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
