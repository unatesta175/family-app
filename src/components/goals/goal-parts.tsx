import { AlertTriangle, CheckCircle2, Clock, Flame, TrendingDown, TrendingUp } from "lucide-react";
import { colorHex, tint } from "@/lib/habits";
import { HabitIcon } from "@/components/habits/habit-icon";
import { STATUS_META, type Forecast } from "@/lib/goals";
import type { GoalStatus } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

/** Rounded icon tile in the goal's colour. Pure markup, safe on the server. */
export function GoalTile({ icon, color, size = "md" }: { icon: string; color: string; size?: "sm" | "md" | "lg" }) {
  const hex = colorHex(color);
  const box = size === "lg" ? "h-14 w-14 rounded-2xl" : size === "sm" ? "h-8 w-8 rounded-lg" : "h-11 w-11 rounded-xl";
  const glyph = size === "lg" ? "h-7 w-7" : size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <span className={cn("flex shrink-0 items-center justify-center", box)} style={{ background: tint(hex, 0.15), color: hex }}>
      <HabitIcon name={icon} className={glyph} />
    </span>
  );
}

export function StatusBadge({ status }: { status: GoalStatus }) {
  const m = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide"
      style={{ background: `${m.tone}1f`, color: m.tone }}
    >
      {m.label}
    </span>
  );
}

export function ProgressBar({ pct, color, className }: { pct: number; color: string; className?: string }) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-h-surface2", className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct > 0 ? 3 : 0, Math.min(100, pct))}%`, background: pct >= 100 ? "var(--h-good)" : colorHex(color) }} />
    </div>
  );
}

const FORECAST_STYLE = {
  done: { icon: CheckCircle2, cls: "text-h-good bg-h-good/12" },
  ahead: { icon: TrendingUp, cls: "text-h-good bg-h-good/12" },
  on_track: { icon: TrendingUp, cls: "text-h-brand bg-h-brand-soft" },
  behind: { icon: TrendingDown, cls: "text-h-bad bg-h-bad/10" },
  not_started: { icon: Clock, cls: "text-h-muted bg-h-surface2" },
  no_target: { icon: Clock, cls: "text-h-muted bg-h-surface2" },
} as const;

export function ForecastBadge({ forecast, className }: { forecast: Forecast; className?: string }) {
  const s = FORECAST_STYLE[forecast.state];
  const Icon = s.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", s.cls, className)}>
      <Icon className="h-3 w-3" />
      {forecast.text}
    </span>
  );
}

export function EffortBadge({ weeks }: { weeks: number }) {
  if (weeks < 1) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-h-break-soft px-2 py-0.5 text-[11px] font-bold text-h-break" title="Weeks in a row with progress on this goal">
      <Flame className="h-3 w-3" />
      {weeks} wk streak
    </span>
  );
}

export function NudgeDot({ count }: { count: number }) {
  if (count < 1) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-h-bad/10 px-2 py-0.5 text-[11px] font-bold text-h-bad">
      <AlertTriangle className="h-3 w-3" />
      {count}
    </span>
  );
}
