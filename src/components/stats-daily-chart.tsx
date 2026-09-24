"use client";

import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import type { DailyPoint } from "@/lib/stats";

export function StatsDailyChart({ series, today }: { series: DailyPoint[]; today: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="mb-2 text-sm font-semibold text-neutral-900">Prayers per day</p>
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#eef2ee" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
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
              formatter={(v) => [`${v} of 5`, "Prayed"]}
            />
            <Bar dataKey="count" radius={[4, 4, 4, 4]} maxBarSize={18}>
              {series.map((point) => (
                <Cell key={point.date} fill={point.date === today ? "#0f7a4c" : "#d7e8dd"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
