"use client";

import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export type NetWorthPoint = { date: string; label: string; netWorth: number };

export function NetWorthTrendChart({ series }: { series: NetWorthPoint[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fin-net-worth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)", background: "var(--popover)", color: "var(--popover-foreground)" }}
            formatter={(v) => [`RM ${Number(v ?? 0).toFixed(2)}`, "Net worth"]}
          />
          <Area type="monotone" dataKey="netWorth" stroke="var(--primary)" strokeWidth={2} fill="url(#fin-net-worth)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export type CategorySlice = { name: string; value: number; color: string };

export function CategoryBreakdownChart({ slices }: { slices: CategorySlice[] }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {slices.map((s) => (
          <div key={s.name} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} />
        ))}
      </div>
      <ul className="flex flex-col gap-1.5">
        {slices.map((s) => (
          <li key={s.name} className="flex items-center gap-2 text-xs font-semibold">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="min-w-0 flex-1 truncate">{s.name}</span>
            <span className="tabular-nums text-muted-foreground">RM {s.value.toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
