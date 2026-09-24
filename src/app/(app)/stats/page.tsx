import Link from "next/link";
import { getActiveProfileId } from "@/lib/session";
import { getAllLogsByDate, getLogTagsMap, getProfile } from "@/lib/db/repo";
import { todayIso } from "@/lib/date";
import { PRAYER_META, PRAYER_ORDER } from "@/lib/prayers";
import { currentStreak, bestStreak } from "@/lib/streaks";
import {
  computePeriodStats,
  computeLifetimeStats,
  computeFocusArea,
  computeRootCauses,
  computeMonthCalendar,
  firstLogDateOf,
  RANGE_LABEL,
  type StatsRange,
} from "@/lib/stats";
import { StatsCarousel } from "@/components/stats-carousel";
import { StatsDailyChart } from "@/components/stats-daily-chart";
import { StatsChartCarousel } from "@/components/stats-chart-carousel";
import {
  BookOpen,
  Trophy,
  CalendarDays,
  Clock,
  Flag,
  CalendarClock,
  Cake,
  BarChart3,
  Calendar,
  SlidersHorizontal,
} from "lucide-react";

const RANGES: StatsRange[] = ["week", "month", "all"];

const ROOT_CAUSE_COLORS = [
  { chip: "bg-violet-100 text-violet-700", bar: "bg-violet-500", track: "bg-violet-100" },
  { chip: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-600", track: "bg-emerald-100" },
  { chip: "bg-amber-100 text-amber-700", bar: "bg-amber-500", track: "bg-amber-100" },
  { chip: "bg-rose-100 text-rose-700", bar: "bg-rose-500", track: "bg-rose-100" },
  { chip: "bg-sky-100 text-sky-700", bar: "bg-sky-500", track: "bg-sky-100" },
];

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const profileId = await getActiveProfileId();
  const { range: rawRange } = await searchParams;
  const range: StatsRange = RANGES.includes(rawRange as StatsRange) ? (rawRange as StatsRange) : "week";
  const today = todayIso();

  const [logsByDate, logTagsMap, profile] = await Promise.all([
    getAllLogsByDate(profileId),
    getLogTagsMap(profileId),
    getProfile(profileId),
  ]);

  const firstLogDate = firstLogDateOf(logsByDate);
  const period = computePeriodStats(logsByDate, range, today, firstLogDate);
  const lifetime = computeLifetimeStats(logsByDate, today, firstLogDate, profile?.age);
  const focusArea = computeFocusArea(logsByDate);
  const rootCauses = computeRootCauses(logsByDate, logTagsMap).slice(0, 5);
  const streak = currentStreak(logsByDate, today);
  const best = bestStreak(logsByDate);
  const periodLabel = RANGE_LABEL[range];

  const calendar = range === "month" ? computeMonthCalendar(logsByDate, today) : null;
  const monthSeries = calendar
    ? calendar.cells.map((cell) => ({ date: cell.date, label: String(cell.day), count: cell.count }))
    : [];

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold text-neutral-900">Statistics</h1>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {RANGES.map((r) => (
          <a
            key={r}
            href={`/stats?range=${r}`}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              range === r
                ? "bg-emerald-700 text-white shadow-sm"
                : "bg-white text-neutral-500 shadow-sm hover:bg-neutral-50"
            }`}
          >
            {RANGE_LABEL[r]}
          </a>
        ))}
        <Link
          href="/stats/custom"
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-neutral-500 shadow-sm transition-colors hover:bg-neutral-50"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Custom
        </Link>
      </div>

      <StatsCarousel
        periodLabel={periodLabel}
        successRatePct={period.successRatePct}
        done={period.done}
        missed={period.missed}
        currentStreak={streak}
        commitmentDone={period.done}
        commitmentTotal={period.totalSlots}
        commitmentPct={period.commitmentPct}
      />

      {range === "month" && calendar ? (
        <StatsChartCarousel series={monthSeries} calendar={calendar} />
      ) : (
        <StatsDailyChart series={period.chartSeries} today={today} />
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/stats/weekly"
          className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 text-center shadow-sm transition-colors hover:bg-neutral-50"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50">
            <BarChart3 className="h-5 w-5 text-emerald-700" />
          </div>
          <p className="text-sm font-bold text-neutral-900">Weekly Report</p>
          <p className="text-xs text-neutral-400">View summary</p>
        </Link>
        <Link
          href="/stats/monthly"
          className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 text-center shadow-sm transition-colors hover:bg-neutral-50"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50">
            <Calendar className="h-5 w-5 text-emerald-700" />
          </div>
          <p className="text-sm font-bold text-neutral-900">Monthly Report</p>
          <p className="text-xs text-neutral-400">View summary</p>
        </Link>
        <Link
          href="/stats/lifetime"
          className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 text-center shadow-sm transition-colors hover:bg-neutral-50"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50">
            <BookOpen className="h-5 w-5 text-emerald-700" />
          </div>
          <p className="text-sm font-bold text-neutral-900">All Time Report</p>
          <p className="text-xs text-neutral-400">View summary</p>
        </Link>
        <Link
          href="/stats/custom"
          className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 text-center shadow-sm transition-colors hover:bg-neutral-50"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50">
            <SlidersHorizontal className="h-5 w-5 text-emerald-700" />
          </div>
          <p className="text-sm font-bold text-neutral-900">Custom Report</p>
          <p className="text-xs text-neutral-400">Pick a date range</p>
        </Link>
      </div>

      <Link
        href="/stats/lifetime"
        className="block rounded-2xl bg-white p-4 shadow-sm transition-colors hover:bg-neutral-50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
            <BookOpen className="h-5 w-5 text-emerald-700" strokeWidth={2} />
          </div>
          <p className="flex-1 text-sm font-semibold text-neutral-900">Lifetime Journey</p>
          <LifetimeRing pct={lifetime.pct} />
        </div>

        <p className="mt-3 text-sm text-neutral-500">
          <span className="font-bold text-neutral-900">{lifetime.totalPrayed}</span> of{" "}
          {lifetime.totalPossible.toLocaleString()} prayers
        </p>
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-neutral-100">
          <div
            className="h-1.5 rounded-full bg-emerald-600"
            style={{ width: `${Math.min(100, lifetime.pct)}%` }}
          />
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <LifetimeChip icon={Cake} tone="rose" value={profile?.age ?? "—"} label="Age" />
          <LifetimeChip icon={Trophy} tone="amber" value={best} label="Best Streak" />
          <LifetimeChip icon={CalendarDays} tone="sky" value={lifetime.daysTracked} label="Days" />
          <LifetimeChip icon={Clock} tone="emerald" value={lifetime.totalPrayed} label="Prayed" />
        </div>
        {profile?.age == null && (
          <p className="mt-3 text-center text-[11px] text-neutral-400">
            Add your age in Settings to see your full lifetime prayer goal.
          </p>
        )}
      </Link>

      {focusArea && (
        <div>
          <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wider text-neutral-400">
            Focus Areas
          </p>
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <Flag className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-900">{PRAYER_META[focusArea.prayer].label}</p>
              <p className="text-xs text-neutral-500">
                {focusArea.missed} missed{focusArea.skew ? ` • mostly on ${focusArea.skew}` : ""}
              </p>
            </div>
          </div>
        </div>
      )}

      {rootCauses.length > 0 && (
        <div>
          <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wider text-neutral-400">
            Root Cause Analysis
          </p>
          <div className="flex flex-col gap-2">
            {rootCauses.map((cause, i) => {
              const color = ROOT_CAUSE_COLORS[i % ROOT_CAUSE_COLORS.length];
              return (
                <div
                  key={cause.tag.id}
                  className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-sm"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${color.chip}`}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-neutral-900">{cause.tag.label}</p>
                    <p className="text-xs text-neutral-400">{cause.pct}% of total missed</p>
                  </div>
                  <div className={`h-1.5 w-16 shrink-0 rounded-full ${color.track}`}>
                    <div
                      className={`h-1.5 rounded-full ${color.bar}`}
                      style={{ width: `${Math.max(cause.pct, 6)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!focusArea && rootCauses.length === 0 && (
        <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-4 shadow-sm">
          <CalendarClock className="h-5 w-5 shrink-0 text-neutral-300" />
          <p className="text-xs text-neutral-400">
            Keep logging your prayers to unlock focus areas and root cause insights.
          </p>
        </div>
      )}

      <p className="text-center text-[11px] text-neutral-400">
        {PRAYER_ORDER.length}-time daily tracking &middot; {lifetime.daysTracked} day
        {lifetime.daysTracked === 1 ? "" : "s"} on this journey
      </p>
    </div>
  );
}

function LifetimeRing({ pct }: { pct: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, pct) / 100) * c;

  return (
    <div className="relative h-11 w-11 shrink-0">
      <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="#eef2ee" strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="#0f7a4c"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-emerald-700">
        {pct}%
      </span>
    </div>
  );
}

const CHIP_TONE: Record<string, string> = {
  amber: "bg-amber-50 text-amber-700",
  emerald: "bg-emerald-50 text-emerald-700",
  sky: "bg-sky-50 text-sky-700",
  rose: "bg-rose-50 text-rose-700",
};

function LifetimeChip({
  icon: Icon,
  tone,
  value,
  label,
}: {
  icon: typeof Trophy;
  tone: "amber" | "emerald" | "sky" | "rose";
  value: number | string;
  label: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-1 rounded-xl px-2 py-3 ${CHIP_TONE[tone]}`}>
      <Icon className="h-4 w-4" strokeWidth={2.25} />
      <span className="text-base font-extrabold leading-none">{value}</span>
      <span className="text-[9px] font-medium uppercase tracking-wide opacity-70">{label}</span>
    </div>
  );
}
