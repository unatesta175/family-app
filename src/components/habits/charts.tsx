"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint, WeekBar } from "@/lib/habit-stats";

const AXIS = { fontSize: 10, fill: "var(--h-muted)" };
const TOOLTIP = {
  contentStyle: {
    fontSize: 12,
    borderRadius: 10,
    border: "1px solid var(--h-border)",
    background: "var(--h-surface)",
    color: "var(--h-fg)",
  },
  labelStyle: { color: "var(--h-muted)", fontWeight: 700 },
};

export function TrendChart({ points }: { points: TrendPoint[] }) {
  const data = points.map((p) => ({ ...p, value: p.pct }));
  const interval = Math.max(0, Math.ceil(points.length / 6) - 1);
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="habitTrend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5b5bf0" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#5b5bf0" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--h-border)" strokeDasharray="4 4" />
          <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval={interval} />
          <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={AXIS} axisLine={false} tickLine={false} unit="%" />
          <Tooltip
            {...TOOLTIP}
            formatter={(v, _n, item) => {
              const p = item.payload as TrendPoint;
              return [v == null ? "Nothing due" : `${v}% (${p.done}/${p.due})`, "Completion"];
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#5b5bf0"
            strokeWidth={2.5}
            fill="url(#habitTrend)"
            connectNulls
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WeeklyBars({ bars, color }: { bars: WeekBar[]; color: string }) {
  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={bars} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--h-border)" strokeDasharray="4 4" />
          <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={AXIS} axisLine={false} tickLine={false} unit="%" />
          <Tooltip
            {...TOOLTIP}
            cursor={{ fill: "var(--h-surface-2)" }}
            formatter={(v, _n, item) => {
              const b = item.payload as WeekBar;
              return [`${v}% (${b.done}/${b.target})`, "Week of"];
            }}
          />
          <Bar dataKey="pct" radius={[5, 5, 0, 0]}>
            {bars.map((b, i) => (
              <Cell key={i} fill={color} fillOpacity={i === bars.length - 1 ? 1 : 0.7} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
