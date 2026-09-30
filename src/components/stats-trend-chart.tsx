"use client";

import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { DailyPoint } from "@/lib/stats";

export function StatsTrendChart({ series }: { series: DailyPoint[] }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-track)" strokeDasharray="4 4" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--chart-tick)" }}
              axisLine={false}
              tickLine={false}
              interval={4}
            />
            <YAxis
              domain={[0, 5]}
              tick={{ fontSize: 10, fill: "var(--chart-tick)" }}
              axisLine={false}
              tickLine={false}
              width={24}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--chart-tooltip-border)", background: "var(--chart-tooltip-bg)", color: "var(--p-fg, inherit)" }}
              formatter={(v) => [`${v} of 5`, "Prayed"]}
            />
            <Line type="linear" dataKey="count" stroke="var(--chart-brand)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
