"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Clock, TrendingUp } from "lucide-react";
import { formatFocus } from "@/lib/focus";

export type DistBar = { label: string; seconds: number; title: string; showLabel?: boolean };

/** Rounds a maximum up to a tidy axis ceiling, with four even steps, in minutes or hours. */
function axis(maxMinutes: number): { max: number; step: number; unit: "m" | "h" } {
  if (maxMinutes <= 0) return { max: 60, step: 15, unit: "m" };
  if (maxMinutes >= 180) {
    const hours = Math.ceil(maxMinutes / 60);
    const step = Math.max(1, Math.ceil(hours / 4));
    return { max: step * 4 * 60, step: step * 60, unit: "h" };
  }
  const step = [5, 10, 15, 20, 30, 45].find((s) => s * 4 >= maxMinutes) ?? 60;
  return { max: step * 4, step, unit: "m" };
}

type Row = { label: string; name: string; minutes: number; seconds: number };

/** The hover card: the slot, and how long was focused in it. */
function ChartTip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-xl border border-h-border bg-h-surface px-3 py-2 shadow-lg">
      <p className="text-[11px] font-semibold text-h-muted">{row.name}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-sm font-extrabold tabular-nums">
        <span className="h-2 w-2 rounded-sm bg-h-brand" />
        {row.seconds > 0 ? formatFocus(row.seconds) : "No focus"}
      </p>
    </div>
  );
}

/**
 * "Focused time distribution": a clean bar chart in the dashboard style, with a quiet grid, a faint
 * track behind every bar, the busiest bar highlighted, a hover card, and a short summary underneath.
 */
export function Distribution({ title, subtitle, bars }: { title: string; subtitle?: string; bars: DistBar[] }) {
  const total = bars.reduce((n, b) => n + b.seconds, 0);
  const maxMin = Math.max(0, ...bars.map((b) => b.seconds / 60));
  const ax = axis(maxMin);
  const div = ax.unit === "h" ? 60 : 1;

  const rows: Row[] = bars.map((b) => ({ label: b.showLabel === false ? "" : b.label, name: b.title, minutes: b.seconds / 60, seconds: b.seconds }));
  const peak = bars.reduce((best, b) => (b.seconds > best.seconds ? b : best), bars[0] ?? { label: "", seconds: 0, title: "" });
  const active = bars.filter((b) => b.seconds > 0);
  const avg = active.length ? total / active.length : 0;
  const ticks = [0, 1, 2, 3, 4].map((k) => (k * ax.step) / 1);

  return (
    <section className="rounded-3xl border border-h-border bg-h-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-h-muted">{subtitle}</p>}
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-h-brand-soft px-3 py-1.5 text-sm font-extrabold tabular-nums text-h-brand">
          <Clock className="h-3.5 w-3.5" />
          {formatFocus(total)}
        </span>
      </div>

      <div className="mt-4 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barCategoryGap="14%">
            <defs>
              <linearGradient id="distFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: "var(--h-brand)" }} stopOpacity={0.95} />
                <stop offset="100%" style={{ stopColor: "var(--h-brand)" }} stopOpacity={0.55} />
              </linearGradient>
              <linearGradient id="distPeak" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7be3ad" />
                <stop offset="100%" style={{ stopColor: "var(--h-brand)" }} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 4" stroke="var(--h-border)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} tickMargin={8} tick={{ fontSize: 11, fontWeight: 600, fill: "var(--h-muted)" }} />
            <YAxis
              domain={[0, ax.max]}
              ticks={ticks}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) => (v === 0 ? "0" : `${v / div}${ax.unit}`)}
              tick={{ fontSize: 11, fontWeight: 600, fill: "var(--h-muted)" }}
            />
            <Tooltip cursor={{ fill: "var(--h-brand)", fillOpacity: 0.08, radius: 8 }} content={<ChartTip />} />
            <Bar dataKey="minutes" radius={[7, 7, 3, 3]} maxBarSize={34} background={{ fill: "var(--h-surface-2)", radius: 7 }} isAnimationActive animationDuration={650}>
              {rows.map((r, i) => (
                <Cell key={i} fill={r.seconds > 0 && r.seconds === peak.seconds ? "url(#distPeak)" : "url(#distFill)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* a short read-out under the chart */}
      <div className="mt-4 grid grid-cols-3 divide-x divide-h-border rounded-2xl border border-h-border bg-h-surface2/60">
        <Fact label="Busiest" value={peak.seconds > 0 ? peak.title.replace(/^Week ending /, "") : "–"} sub={peak.seconds > 0 ? formatFocus(peak.seconds) : undefined} icon />
        <Fact label="Active" value={String(active.length)} sub={active.length === 1 ? "slot with focus" : "slots with focus"} />
        <Fact label="Average" value={avg > 0 ? formatFocus(avg) : "–"} sub="per active slot" />
      </div>
    </section>
  );
}

function Fact({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: boolean }) {
  return (
    <div className="px-3 py-2.5 text-center">
      <p className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-h-muted">
        {icon && <TrendingUp className="h-3 w-3 text-h-brand" />}
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-extrabold tabular-nums">{value}</p>
      {sub && <p className="truncate text-[10px] font-medium text-h-muted">{sub}</p>}
    </div>
  );
}
