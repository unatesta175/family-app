"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BarChart3,
  CalendarRange,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  Lock,
  Medal,
  PieChart as PieIcon,
  SkipForward,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  X,
} from "lucide-react";
import {
  colorHex,
  daysBetween,
  formatDuration,
  formatNumber,
  tint,
  weekStart,
  type StreakResult,
} from "@/lib/habits";
import {
  STREAK_MILESTONES,
  STREAK_UNIT_NAME,
  scoreLabel,
  type StatDay,
} from "@/lib/habit-insights";
import type { HeatCell } from "@/lib/habit-stats";
import type { HabitEvalType, HabitKind } from "@/lib/db/schema";
import { addDays, parseIso } from "@/lib/date";
import { Ring } from "@/components/habits/ring";
import { Heatmap } from "@/components/habits/heatmap";
import { Segmented } from "@/components/habits/form-bits";
import { cn } from "@/lib/utils";

export type HabitStatisticsProps = {
  kind: HabitKind;
  color: string;
  evalType: HabitEvalType;
  unit: string | null;
  startDate: string;
  today: string;
  days: StatDay[];
  score: number;
  /** Score now minus the score 30 days ago (null when the habit is younger than that). */
  scoreDelta: number | null;
  streak: StreakResult;
  rate30: number | null;
  rateAll: number | null;
  heat: HeatCell[][];
};

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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");
const short = (iso: string) => parseIso(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function HabitStatistics(props: HabitStatisticsProps) {
  const { kind, color, startDate, today, days, score, scoreDelta, streak, rate30, rateAll, heat } = props;
  const hex = colorHex(color);
  const isBreak = kind === "break";

  const counts = useMemo(() => {
    const wk = weekStart(today);
    const mo = today.slice(0, 7);
    const yr = today.slice(0, 4);
    let week = 0;
    let month = 0;
    let year = 0;
    let all = 0;
    for (const [d, s] of days) {
      if (s !== "done") continue;
      all += 1;
      if (d >= wk) week += 1;
      if (d.startsWith(mo)) month += 1;
      if (d.startsWith(yr)) year += 1;
    }
    return { week, month, year, all };
  }, [days, today]);

  const unitName = STREAK_UNIT_NAME[streak.unit];
  const plural = (n: number) => `${unitName}${n === 1 ? "" : "s"}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Habit score */}
        <Card icon={Trophy} title="Habit score" hex={hex}>
          <div className="flex items-center gap-4">
            <Ring pct={score} size={112} stroke={11} color={hex}>
              <span className="text-3xl font-extrabold tabular-nums leading-none">{score}</span>
            </Ring>
            <div className="min-w-0">
              <p className="text-base font-extrabold leading-tight">{scoreLabel(score)}</p>
              {scoreDelta !== null && scoreDelta !== 0 && (
                <p
                  className={cn(
                    "mt-1 flex items-center gap-1 text-xs font-bold",
                    scoreDelta > 0 ? "text-h-good" : "text-h-bad"
                  )}
                >
                  {scoreDelta > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {scoreDelta > 0 ? "+" : ""}
                  {scoreDelta} vs 30 days ago
                </p>
              )}
              <p className="mt-1.5 text-[11px] leading-snug text-h-muted">
                Grows with consistency and drops when you miss. Recent days count most.
              </p>
            </div>
          </div>
        </Card>

        {/* Streak */}
        <Card icon={Flame} title="Streak" hex={hex}>
          <div className="grid h-full grid-cols-2 divide-x divide-h-border">
            <StreakNumber label="Current" value={streak.current} unit={plural(streak.current)} color={hex} />
            <StreakNumber label="Best" value={streak.best} unit={plural(streak.best)} color="#f59e0b" />
          </div>
        </Card>
      </div>

      {/* Times completed */}
      <Card icon={CheckCircle2} title={isBreak ? "Clean days" : "Times completed"} hex={hex}>
        <dl className="divide-y divide-h-border">
          {(
            [
              ["This week", counts.week],
              ["This month", counts.month],
              ["This year", counts.year],
              ["All time", counts.all],
            ] as const
          ).map(([label, n]) => (
            <div key={label} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
              <dt className="text-sm font-medium text-h-muted">{label}</dt>
              <dd className="text-sm font-extrabold tabular-nums">{n}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <MiniStat label="Completion · 30 days" value={rate30 === null ? "–" : `${rate30}%`} />
          <MiniStat label="Completion · all time" value={rateAll === null ? "–" : `${rateAll}%`} />
        </div>
      </Card>

      <MonthTimeline days={days} startDate={startDate} today={today} hex={hex} kind={kind} />

      <TimesChart days={days} startDate={startDate} today={today} hex={hex} evalType={props.evalType} unit={props.unit} kind={kind} />

      <SuccessFail days={days} today={today} hex={hex} kind={kind} />

      <StreakChallenge streak={streak} hex={hex} plural={plural} />

      <Card icon={Activity} title="Last 26 weeks" hex={hex}>
        <div className="scrollbar-hide overflow-x-auto">
          <Heatmap weeks={heat} color={color} cell={12} />
        </div>
      </Card>
    </div>
  );
}

// --- Building blocks -------------------------------------------------------------------------

function Card({
  icon: Icon,
  title,
  hex,
  action,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hex: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="h-card flex flex-col p-4">
      <header className="mb-3 flex items-center gap-2">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ background: tint(hex, 0.14), color: hex }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-extrabold tracking-tight">{title}</h3>
        {action && <div className="ml-auto">{action}</div>}
      </header>
      {children}
    </section>
  );
}

function StreakNumber({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-2 py-2 text-center">
      <p className="text-[11px] font-bold uppercase tracking-wider text-h-muted">{label}</p>
      <p className="text-4xl font-extrabold leading-none tabular-nums" style={{ color }}>
        {value}
      </p>
      <p className="text-[11px] font-bold uppercase tracking-wider text-h-muted">{unit}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-h-surface2 px-3 py-2">
      <p className="text-lg font-extrabold leading-tight tabular-nums">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-h-muted">{label}</p>
    </div>
  );
}

function PeriodNav({
  label,
  sub,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
}: {
  label: string;
  sub?: string;
  onPrev?: () => void;
  onNext?: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
}) {
  const btn =
    "flex h-8 w-8 items-center justify-center rounded-full text-h-muted transition-colors hover:bg-h-surface2 hover:text-h-fg disabled:pointer-events-none disabled:opacity-30";
  return (
    <div className="mb-3 flex items-center justify-between">
      {onPrev ? (
        <button type="button" aria-label="Previous" onClick={onPrev} disabled={prevDisabled} className={btn}>
          <ChevronLeft className="h-4 w-4" />
        </button>
      ) : (
        <span className="h-8 w-8" />
      )}
      <div className="text-center">
        <p className="text-sm font-extrabold leading-tight">{label}</p>
        {sub && <p className="text-[11px] font-medium text-h-muted">{sub}</p>}
      </div>
      {onNext ? (
        <button type="button" aria-label="Next" onClick={onNext} disabled={nextDisabled} className={btn}>
          <ChevronRight className="h-4 w-4" />
        </button>
      ) : (
        <span className="h-8 w-8" />
      )}
    </div>
  );
}

// --- Month timeline --------------------------------------------------------------------------

function MonthTimeline({
  days,
  startDate,
  today,
  hex,
  kind,
}: {
  days: StatDay[];
  startDate: string;
  today: string;
  hex: string;
  kind: HabitKind;
}) {
  const [month, setMonth] = useState(today.slice(0, 7)); // yyyy-mm
  const byDate = useMemo(() => new Map(days.map(([d, s]) => [d, s])), [days]);

  const [y, m] = month.split("-").map(Number);
  const length = new Date(y, m, 0).getDate();
  const shift = (delta: number) => {
    const dt = new Date(y, m - 1 + delta, 1);
    setMonth(`${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`);
  };

  const cells = Array.from({ length: length }, (_, i) => {
    const date = `${month}-${pad(i + 1)}`;
    return { date, day: i + 1, state: byDate.get(date) ?? null };
  });
  const tally = { done: 0, partial: 0, missed: 0, skipped: 0 };
  for (const c of cells) {
    if (c.state === "done") tally.done += 1;
    else if (c.state === "partial") tally.partial += 1;
    else if (c.state === "missed" || c.state === "slipped") tally.missed += 1;
    else if (c.state === "skipped") tally.skipped += 1;
  }

  return (
    <Card icon={CalendarRange} title="Month at a glance" hex={hex}>
      <PeriodNav
        label={MONTHS[m - 1]}
        sub={String(y)}
        onPrev={() => shift(-1)}
        onNext={() => shift(1)}
        prevDisabled={month <= startDate.slice(0, 7)}
        nextDisabled={month >= today.slice(0, 7)}
      />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-x-1 gap-y-2.5">
        {cells.map((c) => (
          <div key={c.date} className="flex flex-col items-center gap-1" title={`${short(c.date)} · ${c.state ?? "not scheduled"}`}>
            <DayMarker state={c.state} hex={hex} />
            <span className={cn("text-[10px] font-bold tabular-nums", c.date === today ? "text-h-brand" : "text-h-muted")}>
              {c.day}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-h-muted">
        <Legend color={hex} label={`${tally.done} ${kind === "break" ? "clean" : "done"}`} />
        {tally.partial > 0 && <Legend color={tint(hex, 0.4)} label={`${tally.partial} partial`} />}
        <Legend color="var(--h-bad)" label={`${tally.missed} ${kind === "break" ? "slipped" : "missed"}`} />
        {tally.skipped > 0 && <Legend color="var(--h-border)" label={`${tally.skipped} skipped`} />}
      </div>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function DayMarker({ state, hex }: { state: StatDay[1] | null; hex: string }) {
  const base = "flex h-8 w-8 items-center justify-center rounded-full";
  switch (state) {
    case "done":
      return (
        <span className={base} style={{ background: hex, color: "#fff" }}>
          <Check className="h-4 w-4" strokeWidth={3} />
        </span>
      );
    case "partial":
      return (
        <span className={base} style={{ background: tint(hex, 0.3), color: hex }}>
          <span className="h-2 w-2 rounded-full bg-current" />
        </span>
      );
    case "missed":
    case "slipped":
      return (
        <span
          className={base}
          style={{ background: "color-mix(in srgb, var(--h-bad) 14%, transparent)", color: "var(--h-bad)" }}
        >
          <X className="h-4 w-4" strokeWidth={3} />
        </span>
      );
    case "skipped":
      return (
        <span className={base} style={{ background: "var(--h-surface-2)", color: "var(--h-muted)" }}>
          <SkipForward className="h-3.5 w-3.5" />
        </span>
      );
    case "pending":
    case "flex":
      return <span className={base} style={{ border: `2px solid ${hex}`, background: tint(hex, 0.08) }} />;
    default:
      return (
        <span className={base}>
          <span className="h-1 w-1 rounded-full bg-h-border" />
        </span>
      );
  }
}

// --- Times completed chart -------------------------------------------------------------------

type Range = "week" | "month" | "year";
type Bar = { label: string; value: number };

function TimesChart({
  days,
  startDate,
  today,
  hex,
  evalType,
  unit,
  kind,
}: {
  days: StatDay[];
  startDate: string;
  today: string;
  hex: string;
  evalType: HabitEvalType;
  unit: string | null;
  kind: HabitKind;
}) {
  const curYear = Number(today.slice(0, 4));
  const startYear = Number(startDate.slice(0, 4));
  const measured = kind === "build" && (evalType === "numeric" || evalType === "timer");

  const [range, setRange] = useState<Range>("month");
  const [metric, setMetric] = useState<"count" | "total">("count");
  const [weekBack, setWeekBack] = useState(0); // 0 = the 12 weeks ending this week
  const [year, setYear] = useState(curYear);
  const m = measured ? metric : "count";

  const valueOf = (state: StatDay[1], value: number) => {
    if (m === "count") return state === "done" ? 1 : 0;
    if (state !== "done" && state !== "partial") return 0;
    return evalType === "timer" ? value / 3600 : value;
  };

  const { bars, label, sub, canPrev, canNext } = useMemo(() => {
    if (range === "week") {
      const lastWeek = addDays(weekStart(today), -84 * weekBack);
      const firstWeek = addDays(lastWeek, -77);
      const out: Bar[] = Array.from({ length: 12 }, (_, i) => ({ label: short(addDays(firstWeek, i * 7)), value: 0 }));
      for (const [d, s, v] of days) {
        const idx = Math.floor(daysBetween(firstWeek, d) / 7);
        if (idx >= 0 && idx < 12) out[idx].value += valueOf(s, v);
      }
      return {
        bars: out,
        label: `${short(firstWeek)} – ${short(addDays(lastWeek, 6))}`,
        sub: "12 weeks",
        canPrev: firstWeek > weekStart(startDate),
        canNext: weekBack > 0,
      };
    }
    if (range === "month") {
      const out: Bar[] = MONTHS.map((label) => ({ label, value: 0 }));
      for (const [d, s, v] of days) {
        if (Number(d.slice(0, 4)) === year) out[Number(d.slice(5, 7)) - 1].value += valueOf(s, v);
      }
      return { bars: out, label: String(year), sub: "By month", canPrev: year > startYear, canNext: year < curYear };
    }
    const firstYear = Math.min(startYear, curYear - 4);
    const out: Bar[] = Array.from({ length: curYear - firstYear + 1 }, (_, i) => ({ label: String(firstYear + i), value: 0 }));
    for (const [d, s, v] of days) {
      const idx = Number(d.slice(0, 4)) - firstYear;
      if (idx >= 0 && idx < out.length) out[idx].value += valueOf(s, v);
    }
    return { bars: out, label: "All years", sub: "By year", canPrev: false, canNext: false };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, range, m, weekBack, year, today, startDate, startYear, curYear, evalType]);

  const rounded = bars.map((b) => ({ ...b, value: Math.round(b.value * 100) / 100 }));
  const total = rounded.reduce((a, b) => a + b.value, 0);
  const hasData = total > 0;

  const fmt = (v: number) =>
    m === "count"
      ? `${formatNumber(v)}×`
      : evalType === "timer"
        ? formatDuration(v * 3600)
        : `${formatNumber(v)}${unit ? ` ${unit}` : ""}`;

  const title = m === "count" ? (kind === "break" ? "Clean days" : "Times completed") : evalType === "timer" ? "Time spent" : "Total amount";

  return (
    <Card
      icon={BarChart3}
      title={title}
      hex={hex}
      action={
        measured ? (
          <div className="flex gap-0.5 rounded-lg bg-h-surface2 p-0.5">
            {(["count", "total"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setMetric(k)}
                className={cn(
                  "rounded-md px-2 py-1 text-[11px] font-bold transition-colors",
                  metric === k ? "bg-h-surface text-h-fg shadow-sm" : "text-h-muted hover:text-h-fg"
                )}
              >
                {k === "count" ? "Times" : "Total"}
              </button>
            ))}
          </div>
        ) : undefined
      }
    >
      <PeriodNav
        label={label}
        sub={`${sub} · ${fmt(total)}`}
        onPrev={range === "year" ? undefined : () => (range === "week" ? setWeekBack((w) => w + 1) : setYear((y) => y - 1))}
        onNext={range === "year" ? undefined : () => (range === "week" ? setWeekBack((w) => w - 1) : setYear((y) => y + 1))}
        prevDisabled={!canPrev}
        nextDisabled={!canNext}
      />

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rounded} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--h-border)" strokeDasharray="4 4" />
            <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval={range === "week" ? 1 : 0} />
            <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={m !== "count"} domain={[0, (max: number) => Math.max(max, 1)]} />
            <Tooltip
              {...TOOLTIP}
              cursor={{ fill: "var(--h-surface-2)" }}
              formatter={(v) => [fmt(Number(v)), title]}
            />
            <Bar dataKey="value" radius={[5, 5, 0, 0]}>
              {rounded.map((b, i) => (
                <Cell key={b.label} fill={hex} fillOpacity={b.value === 0 ? 0.25 : i === rounded.length - 1 ? 1 : 0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {!hasData && <p className="mt-1 text-center text-[11px] text-h-muted">Nothing logged in this period yet.</p>}

      <div className="mt-3">
        <Segmented<Range>
          value={range}
          onChange={setRange}
          options={[
            { value: "week", label: "Week" },
            { value: "month", label: "Month" },
            { value: "year", label: "Year" },
          ]}
        />
      </div>
    </Card>
  );
}

// --- Success / fail --------------------------------------------------------------------------

type DonutRange = "30d" | "year" | "all";

function SuccessFail({ days, today, hex, kind }: { days: StatDay[]; today: string; hex: string; kind: HabitKind }) {
  const [range, setRange] = useState<DonutRange>("30d");
  const isBreak = kind === "break";

  const tally = useMemo(() => {
    const cutoff = range === "30d" ? addDays(today, -29) : range === "year" ? `${today.slice(0, 4)}-01-01` : "0000-00-00";
    const t = { done: 0, partial: 0, missed: 0, skipped: 0 };
    for (const [d, s] of days) {
      if (d < cutoff) continue;
      if (s === "done") t.done += 1;
      else if (s === "partial") t.partial += 1;
      else if (s === "missed" || s === "slipped") t.missed += 1;
      else if (s === "skipped") t.skipped += 1;
    }
    return t;
  }, [days, range, today]);

  const slices = [
    { name: isBreak ? "Clean" : "Success", value: tally.done, fill: hex },
    { name: "Partial", value: tally.partial, fill: tint(hex, 0.4) },
    { name: isBreak ? "Slipped" : "Fail", value: tally.missed, fill: "var(--h-bad)" },
    { name: "Skipped", value: tally.skipped, fill: "var(--h-border)" },
  ].filter((s) => s.value > 0);

  const judged = tally.done + tally.partial + tally.missed;
  const rate = judged === 0 ? null : Math.round((tally.done / judged) * 100);

  return (
    <Card icon={PieIcon} title={isBreak ? "Clean / Slipped" : "Success / Fail"} hex={hex}>
      <div className="flex items-center gap-5">
        <div className="relative h-36 w-36 shrink-0">
          {slices.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="68%"
                  outerRadius="100%"
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                  paddingAngle={slices.length > 1 ? 2 : 0}
                  isAnimationActive={false}
                >
                  {slices.map((s) => (
                    <Cell key={s.name} fill={s.fill} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full rounded-full border-[14px] border-h-surface2" />
          )}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-extrabold leading-none tabular-nums">{rate === null ? "–" : `${rate}%`}</span>
            <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-h-muted">success</span>
          </div>
        </div>

        <ul className="flex min-w-0 flex-1 flex-col gap-2">
          {slices.length === 0 ? (
            <li className="text-sm text-h-muted">Nothing to chart for this period yet.</li>
          ) : (
            slices.map((s) => (
              <li key={s.name} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.fill }} />
                <span className="flex-1 font-medium text-h-muted">{s.name}</span>
                <span className="font-extrabold tabular-nums">{s.value}</span>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="mt-4">
        <Segmented<DonutRange>
          value={range}
          onChange={setRange}
          options={[
            { value: "30d", label: "30 days" },
            { value: "year", label: "This year" },
            { value: "all", label: "All time" },
          ]}
        />
      </div>
    </Card>
  );
}

// --- Streak challenge ------------------------------------------------------------------------

function StreakChallenge({
  streak,
  hex,
  plural,
}: {
  streak: StreakResult;
  hex: string;
  plural: (n: number) => string;
}) {
  const milestones = STREAK_MILESTONES[streak.unit];
  const next = milestones.find((n) => n > streak.current);
  const unlocked = milestones.filter((n) => n <= streak.best).length;

  return (
    <Card
      icon={Target}
      title="Streak challenge"
      hex={hex}
      action={
        <span className="rounded-full bg-h-surface2 px-2 py-0.5 text-[11px] font-bold text-h-muted">
          {unlocked}/{milestones.length}
        </span>
      }
    >
      <div className="scrollbar-hide -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
        {milestones.map((n) => {
          const got = n <= streak.best;
          return (
            <div key={n} className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5">
              <span
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-2xl border-2",
                  got ? "" : "border-h-border bg-h-surface2 text-h-muted/60"
                )}
                style={got ? { background: tint(hex, 0.16), borderColor: hex, color: hex } : undefined}
              >
                {got ? <Medal className="h-7 w-7" /> : <Lock className="h-5 w-5" />}
              </span>
              <span className={cn("text-center text-[11px] font-bold leading-tight", got ? "text-h-fg" : "text-h-muted")}>
                {n} {plural(n)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 rounded-xl bg-h-surface2 px-3 py-2.5">
        {next ? (
          <>
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-bold">Next badge: {next} {plural(next)}</span>
              <span className="font-semibold tabular-nums text-h-muted">
                {streak.current}/{next}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-h-border">
              <div className="h-full rounded-full transition-all" style={{ width: `${(streak.current / next) * 100}%`, background: hex }} />
            </div>
          </>
        ) : (
          <p className="text-xs font-bold">Every badge unlocked. Legendary.</p>
        )}
      </div>
    </Card>
  );
}
