import Link from "next/link";
import {
  ArrowLeft,
  Flame,
  XCircle,
  Flag,
  HelpCircle,
  TrendingUp,
  SlidersHorizontal,
  CalendarRange,
} from "lucide-react";
import { getActiveProfileId } from "@/lib/session";
import { getAllLogsByDate, getLogTagsMap } from "@/lib/db/repo";
import { todayIso, addDays, parseIso } from "@/lib/date";
import { PRAYER_META } from "@/lib/prayers";
import { computeRangeStats, computeFocusArea, computeRootCauses, filterLogsByRange } from "@/lib/stats";

const ROOT_CAUSE_COLORS = [
  { chip: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-600", track: "bg-emerald-100" },
  { chip: "bg-violet-100 text-violet-700", bar: "bg-violet-500", track: "bg-violet-100" },
  { chip: "bg-amber-100 text-amber-700", bar: "bg-amber-500", track: "bg-amber-100" },
  { chip: "bg-rose-100 text-rose-700", bar: "bg-rose-500", track: "bg-rose-100" },
  { chip: "bg-sky-100 text-sky-700", bar: "bg-sky-500", track: "bg-sky-100" },
];

function formatLabel(start: string, end: string): string {
  const s = parseIso(start).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const e = parseIso(end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${s} - ${e}`;
}

export default async function CustomReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; view?: string }>;
}) {
  const profileId = await getActiveProfileId();
  const { from, to, view: rawView } = await searchParams;
  const today = todayIso();
  const view = rawView === "patterns" ? "patterns" : "comparison";

  const isValidRange = Boolean(from && to && from <= to && to <= today);

  const header = (
    <div className="flex items-center gap-3">
      <Link
        href="/stats"
        className="flex h-8 w-8 items-center justify-center rounded-full text-emerald-700 hover:bg-emerald-50"
        aria-label="Back to Stats"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <h1 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Custom Report</h1>
    </div>
  );

  if (!isValidRange) {
    const defaultFrom = from && from <= today ? from : addDays(today, -6);
    const defaultTo = to && to <= today ? to : today;

    return (
      <div className="flex flex-col gap-6">
        {header}

        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CalendarRange className="h-7 w-7 text-emerald-300" strokeWidth={1.5} />
          </div>
          <p className="text-lg font-bold text-neutral-900">Pick a date range</p>
          <p className="max-w-xs text-sm text-neutral-400">
            Choose a start and end date to see your prayer summary for that period.
          </p>
        </div>

        <form action="/stats/custom" method="get" className="flex flex-col gap-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <label className="text-xs font-semibold text-neutral-400" htmlFor="from">
              Start date
            </label>
            <input
              id="from"
              type="date"
              name="from"
              max={today}
              defaultValue={defaultFrom}
              required
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-900 outline-none focus:border-emerald-400"
            />
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <label className="text-xs font-semibold text-neutral-400" htmlFor="to">
              End date
            </label>
            <input
              id="to"
              type="date"
              name="to"
              max={today}
              defaultValue={defaultTo}
              required
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-900 outline-none focus:border-emerald-400"
            />
          </div>
          <button
            type="submit"
            className="flex items-center justify-center gap-2 rounded-full bg-emerald-700 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
          >
            <SlidersHorizontal className="h-4 w-4" />
            View Report
          </button>
        </form>
      </div>
    );
  }

  const start = from as string;
  const end = to as string;

  const [logsByDate, logTagsMap] = await Promise.all([
    getAllLogsByDate(profileId),
    getLogTagsMap(profileId),
  ]);

  const stats = computeRangeStats(logsByDate, start, end);
  const rangeLogs = filterLogsByRange(logsByDate, start, end);
  const focusArea = computeFocusArea(rangeLogs);
  const rootCauses = computeRootCauses(rangeLogs, logTagsMap).slice(0, 5);
  const growth = stats.performed - stats.previousPerformed;

  return (
    <div className="flex flex-col gap-6">
      {header}

      {stats.hasData ? (
        <>
          <RangeRing pct={stats.pct} performed={stats.performed} totalSlots={stats.totalSlots} />

          <div className="grid grid-cols-2 gap-3">
            <Tile tone="amber" icon={Flame} value={stats.bestStreak} label="Best Streak" suffix=" days" />
            <Tile tone="rose" icon={XCircle} value={stats.missed} label="Missed" />
            <Tile
              tone="violet"
              icon={Flag}
              value={focusArea ? PRAYER_META[focusArea.prayer].label : "—"}
              label="Weakest"
            />
            <Tile tone="neutral" icon={HelpCircle} value={stats.pending} label="Pending" />
          </div>

          <div className="flex rounded-full border border-neutral-200 bg-white p-1 shadow-sm">
            <Link
              href={`/stats/custom?from=${start}&to=${end}&view=comparison`}
              scroll={false}
              className={`flex-1 rounded-full py-2.5 text-center text-sm font-semibold transition-colors ${
                view === "comparison" ? "bg-emerald-700 text-white" : "text-neutral-500"
              }`}
            >
              Comparison
            </Link>
            <Link
              href={`/stats/custom?from=${start}&to=${end}&view=patterns`}
              scroll={false}
              className={`flex-1 rounded-full py-2.5 text-center text-sm font-semibold transition-colors ${
                view === "patterns" ? "bg-emerald-700 text-white" : "text-neutral-500"
              }`}
            >
              Patterns
            </Link>
          </div>

          {view === "comparison" ? (
            <div className="rounded-3xl border border-neutral-200 bg-neutral-50/60 p-5">
              <p className="text-center text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Period Growth
              </p>
              <div className="mt-6 flex items-end justify-center gap-10">
                <GrowthBar
                  value={stats.previousPerformed}
                  max={Math.max(stats.performed, stats.previousPerformed, 1)}
                  label="Previous"
                  active={false}
                />
                <div className="flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-full bg-emerald-100">
                  <TrendingUp className="h-4 w-4 text-emerald-700" />
                </div>
                <GrowthBar
                  value={stats.performed}
                  max={Math.max(stats.performed, stats.previousPerformed, 1)}
                  label="This Period"
                  active
                />
              </div>
              <div className="mt-6 flex justify-center">
                <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                  {growth >= 0 ? "+" : ""}
                  {growth} prayers offered
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-neutral-200 bg-neutral-50/60 p-5">
              <p className="text-center text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Missing Patterns
              </p>
              {rootCauses.length > 0 ? (
                <div className="mt-4 flex flex-col gap-2">
                  {rootCauses.map((cause, i) => {
                    const color = ROOT_CAUSE_COLORS[i % ROOT_CAUSE_COLORS.length];
                    return (
                      <div
                        key={cause.tag.id}
                        className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3.5"
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
              ) : (
                <p className="mt-4 text-center text-sm text-neutral-400">
                  No reasons logged for missed prayers in this period.
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-neutral-400">No prayers were logged in this period.</p>
        </div>
      )}

      <div className="flex items-center justify-between rounded-full border border-neutral-200 bg-white px-4 py-2 shadow-sm">
        <span className="text-sm font-semibold text-neutral-900">{formatLabel(start, end)}</span>
        <Link
          href="/stats/custom"
          className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
        >
          Change dates
        </Link>
      </div>
    </div>
  );
}

const TILE_TONE: Record<string, { card: string; icon: string }> = {
  amber: { card: "border-amber-200 bg-amber-50", icon: "bg-amber-100 text-amber-600" },
  rose: { card: "border-rose-200 bg-rose-50", icon: "bg-rose-100 text-rose-600" },
  violet: { card: "border-violet-200 bg-violet-50", icon: "bg-violet-100 text-violet-600" },
  neutral: { card: "border-neutral-200 bg-neutral-100", icon: "bg-neutral-200 text-neutral-600" },
};

function Tile({
  tone,
  icon: Icon,
  value,
  label,
  suffix = "",
}: {
  tone: "amber" | "rose" | "violet" | "neutral";
  icon: typeof Flame;
  value: number | string;
  label: string;
  suffix?: string;
}) {
  const style = TILE_TONE[tone];
  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-4 ${style.card}`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${style.icon}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-lg font-extrabold leading-none text-neutral-900">
          {value}
          {typeof value === "number" && suffix}
        </p>
        <p className="mt-0.5 text-xs text-neutral-500">{label}</p>
      </div>
    </div>
  );
}

function GrowthBar({
  value,
  max,
  label,
  active,
}: {
  value: number;
  max: number;
  label: string;
  active: boolean;
}) {
  const heightPct = Math.max((value / max) * 100, value > 0 ? 6 : 3);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex h-32 w-8 items-end rounded-full bg-neutral-200/70">
        <div
          className={`w-full rounded-full ${active ? "bg-emerald-600" : "bg-neutral-300"}`}
          style={{ height: `${heightPct}%` }}
        />
        <span
          className={`absolute left-1/2 h-4 w-4 -translate-x-1/2 rounded-full ${
            active ? "bg-emerald-700" : "bg-neutral-400"
          } ring-4 ring-white`}
          style={{ bottom: `calc(${heightPct}% - 8px)` }}
        />
      </div>
      <p className="text-lg font-extrabold text-neutral-900">{value}</p>
      <p className="text-xs text-neutral-400">{label}</p>
    </div>
  );
}

function RangeRing({ pct, performed, totalSlots }: { pct: number; performed: number; totalSlots: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const r = 84;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;

  return (
    <div className="flex flex-col items-center rounded-3xl bg-white py-2">
      <div className="relative h-48 w-48">
        <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
          <circle cx="100" cy="100" r={r} fill="none" stroke="#eef2ee" strokeWidth="10" />
          <circle
            cx="100"
            cy="100"
            r={r}
            fill="none"
            stroke="#0f7a4c"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-4xl font-extrabold tracking-tight text-neutral-900">{clamped}%</p>
          <span className="mt-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {performed} / {totalSlots}
          </span>
        </div>
      </div>
    </div>
  );
}
