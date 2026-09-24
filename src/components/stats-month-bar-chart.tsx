"use client";

import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { DailyPoint } from "@/lib/stats";

export function StatsMonthBarChart({ series }: { series: DailyPoint[] }) {
  const data = series.map((point) => ({ ...point, capacity: 5 }));

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }} barGap="-100%">
            <CartesianGrid vertical={false} stroke="#eef2ee" strokeDasharray="4 4" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              interval={4}
            />
            <YAxis
              domain={[0, 5]}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              width={24}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
              formatter={(v, name) => (name === "count" ? [`${v} of 5`, "Prayed"] : [null, null])}
            />
            <Bar dataKey="capacity" fill="#e3e9ea" radius={[4, 4, 4, 4]} maxBarSize={10} />
            <Bar dataKey="count" fill="#0f7a4c" radius={[4, 4, 4, 4]} maxBarSize={10} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
