"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { STATUS_COLOR } from "@/lib/habits";

/** The share of habits completed on each day of the month. Days not reached yet are left out. */
export function MonthChart({ points }: { points: { day: number; pct: number | null }[] }) {
  return (
    <div className="h-full min-h-28 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="monthFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={STATUS_COLOR.done} stopOpacity={0.45} />
              <stop offset="100%" stopColor={STATUS_COLOR.done} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--h-border)" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--h-muted)" }} interval={0} />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--h-muted)" }} />
          <Tooltip
            formatter={(v) => [`${v}%`, "Completed"]}
            labelFormatter={(d) => `Day ${d}`}
            contentStyle={{ background: "var(--h-surface)", border: "1px solid var(--h-border)", borderRadius: 12, fontSize: 12 }}
          />
          <Area type="monotone" dataKey="pct" stroke={STATUS_COLOR.done} strokeWidth={2.5} fill="url(#monthFill)" connectNulls={false} dot={{ r: 2.5, fill: STATUS_COLOR.done, strokeWidth: 0 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
