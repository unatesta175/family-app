"use client";

import { CATEGORY_BY_KEY, DAY_MIN, toClock12, type DialSegment } from "@/lib/time-planner";
import { cn } from "@/lib/utils";

const C = 130; // centre of the 260x260 viewBox
const R_OUT = 104;
const R_IN = 72;

/** Angle in radians for a minute of the day: midnight at the top, clockwise. */
const angle = (minutes: number) => (minutes / DAY_MIN) * Math.PI * 2 - Math.PI / 2;
const point = (r: number, a: number) => ({ x: C + r * Math.cos(a), y: C + r * Math.sin(a) });

/** A donut-sector path between two minutes of the day. */
function arc(start: number, end: number, r0: number, r1: number): string {
  const a0 = angle(start);
  const a1 = angle(end);
  const large = end - start > DAY_MIN / 2 ? 1 : 0;
  const p0 = point(r1, a0);
  const p1 = point(r1, a1);
  const p2 = point(r0, a1);
  const p3 = point(r0, a0);
  return `M ${p0.x} ${p0.y} A ${r1} ${r1} 0 ${large} 1 ${p1.x} ${p1.y} L ${p2.x} ${p2.y} A ${r0} ${r0} 0 ${large} 0 ${p3.x} ${p3.y} Z`;
}

/**
 * A 24-hour analog clock: midnight at the top, noon at the bottom. Each activity is an arc coloured by
 * its category; the empty stretches are your free time. A hand shows the time now. Tap an arc to pick it.
 */
export function AnalogClock({
  segments,
  nowMinutes,
  selectedId,
  onSelect,
  children,
  className,
}: {
  segments: DialSegment[];
  /** Minutes since midnight to draw the hand at, or null to hide it. */
  nowMinutes: number | null;
  selectedId: number | null;
  onSelect: (id: number) => void;
  /** Shown in the middle of the dial. */
  children?: React.ReactNode;
  className?: string;
}) {
  const hand = nowMinutes === null ? null : point(R_OUT + 2, angle(nowMinutes));
  return (
    <div className={cn("relative mx-auto aspect-square w-full max-w-sm", className)}>
      <svg viewBox="0 0 260 260" className="h-full w-full" role="img" aria-label="24-hour daily clock">
        {/* The dial face: the free (uncovered) time shows through as this track. */}
        <circle cx={C} cy={C} r={(R_OUT + R_IN) / 2} fill="none" stroke="var(--h-surface-2)" strokeWidth={R_OUT - R_IN} />

        {/* Hour ticks and the 3-hourly numbers. */}
        {Array.from({ length: 24 }, (_, h) => {
          const a = angle(h * 60);
          const major = h % 3 === 0;
          const p0 = point(R_OUT + 3, a);
          const p1 = point(R_OUT + (major ? 10 : 6), a);
          return <line key={h} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke="var(--h-muted)" strokeOpacity={major ? 0.7 : 0.35} strokeWidth={major ? 1.6 : 1} strokeLinecap="round" />;
        })}
        {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => {
          const p = point(R_OUT + 20, angle(h * 60));
          return (
            <text key={h} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize="9.5" fontWeight={700} fill="var(--h-muted)">
              {h === 0 ? "12a" : h === 12 ? "12p" : h < 12 ? `${h}a` : `${h - 12}p`}
            </text>
          );
        })}

        {/* Activities. */}
        {segments.map((s, i) => {
          const meta = CATEGORY_BY_KEY[s.category];
          const selected = s.id === selectedId;
          return (
            <path
              key={`${s.id}-${i}`}
              d={arc(s.start, s.end, selected ? R_IN - 3 : R_IN, selected ? R_OUT + 3 : R_OUT)}
              fill={meta.color}
              stroke="var(--h-surface)"
              strokeWidth={selected ? 2.5 : 1.2}
              strokeLinejoin="round"
              opacity={selectedId !== null && !selected ? 0.45 : 1}
              tabIndex={0}
              role="button"
              aria-label={`${s.label || meta.label}, ${toClock12(s.start)} to ${toClock12(s.end % DAY_MIN)}`}
              onClick={() => onSelect(s.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(s.id);
                }
              }}
              className="cursor-pointer outline-none transition-opacity focus-visible:stroke-[var(--h-fg)]"
            >
              <title>{`${s.label || meta.label} · ${toClock12(s.start)} – ${toClock12(s.end % DAY_MIN)}`}</title>
            </path>
          );
        })}

        {/* The hand for the current time. */}
        {hand && (
          <g pointerEvents="none">
            <line x1={C} y1={C} x2={hand.x} y2={hand.y} stroke="var(--h-fg)" strokeWidth={2.2} strokeLinecap="round" />
            <circle cx={hand.x} cy={hand.y} r={4.5} fill="var(--h-brand)" stroke="var(--h-surface)" strokeWidth={2} />
            <circle cx={C} cy={C} r={4} fill="var(--h-fg)" />
          </g>
        )}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="flex max-w-[44%] flex-col items-center text-center">{children}</div>
      </div>
    </div>
  );
}
