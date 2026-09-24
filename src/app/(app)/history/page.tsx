import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsUpDown, CalendarPlus, ChevronDown, Clock3 } from "lucide-react";
import { getActiveProfileId } from "@/lib/session";
import { getOwnProfileId } from "@/lib/auth";
import { getAllLogsByDate, getLogTagsMap, getQadaOwedByPrayer, getProfile } from "@/lib/db/repo";
import { todayIso, parseIso, addDays, addMonths } from "@/lib/date";
import { PRAYER_ORDER, PRAYER_META, isPerformed, detailStatusLabel } from "@/lib/prayers";
import { computeMonthCalendar } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { EditDayButton } from "@/components/edit-day-button";
import { ClearDayButton } from "@/components/clear-day-button";
import type { Status } from "@/lib/db/schema";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const NEEDS_REASON: Status[] = ["missed", "late", "qada"];

function weekDatesAround(dateIso: string): string[] {
  const dow = parseIso(dateIso).getDay();
  const start = addDays(dateIso, -dow);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const profileId = await getActiveProfileId();
  const ownProfileId = await getOwnProfileId();
  const readOnly = ownProfileId !== null && profileId !== ownProfileId;
  const { date: rawDate, view: rawView } = await searchParams;
  const today = todayIso();
  const selectedDate = rawDate && rawDate <= today ? rawDate : today;
  const view: "week" | "month" = rawView === "month" ? "month" : "week";

  const [logsByDate, logTagsMap, qadaOwed, profile] = await Promise.all([
    getAllLogsByDate(profileId),
    getLogTagsMap(profileId),
    getQadaOwedByPrayer(profileId),
    getProfile(profileId),
  ]);
  const haydEnabled = profile?.gender === "female" && !!profile.haydMode;

  const totalQadaOwed = Object.values(qadaOwed).reduce((a, b) => a + b, 0);

  function dayCompletion(date: string): { pct: number; hasLog: boolean } {
    const day = logsByDate[date] ?? {};
    const hasLog = Object.keys(day).length > 0;
    const performed = PRAYER_ORDER.filter((p) => isPerformed(day[p] ?? "not_yet")).length;
    return { pct: hasLog ? Math.round((performed / PRAYER_ORDER.length) * 100) : 0, hasLog };
  }

  const monthLabel = parseIso(selectedDate).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const prevHref =
    view === "week"
      ? `/history?date=${addDays(selectedDate, -7)}&view=week`
      : `/history?date=${addMonths(selectedDate, -1)}&view=month`;
  const nextHref =
    view === "week"
      ? `/history?date=${addDays(selectedDate, 7)}&view=week`
      : `/history?date=${addMonths(selectedDate, 1)}&view=month`;
  const toggleHref = `/history?date=${selectedDate}&view=${view === "week" ? "month" : "week"}`;

  const weekDates = weekDatesAround(selectedDate);
  const monthOffset =
    (parseIso(today).getFullYear() * 12 + parseIso(today).getMonth()) -
    (parseIso(selectedDate).getFullYear() * 12 + parseIso(selectedDate).getMonth());
  const monthCalendar = view === "month" ? computeMonthCalendar(logsByDate, today, monthOffset) : null;

  const dayLog = logsByDate[selectedDate] ?? {};
  const hasLog = Object.keys(dayLog).length > 0;
  const missedCount = PRAYER_ORDER.filter((p) => (dayLog[p] ?? "not_yet") === "missed").length;
  const doneCount = PRAYER_ORDER.filter((p) => isPerformed(dayLog[p] ?? "not_yet")).length;
  const successPct = Math.round((doneCount / PRAYER_ORDER.length) * 100);
  const weekdayLabel = parseIso(selectedDate).toLocaleDateString("en-US", { weekday: "long" });
  const fullDateLabel = parseIso(selectedDate).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  function DayCell({ date, href, size, disabled }: { date: string; href: string; size: number; disabled?: boolean }) {
    const isSelected = date === selectedDate;
    const isToday = date === today;
    const { pct, hasLog } = dayCompletion(date);
    const r = (size - 5) / 2;
    const c = 2 * Math.PI * r;
    const offset = c - (Math.max(pct, hasLog ? 4 : 0) / 100) * c;

    return (
      <Link
        href={href}
        style={{ width: size, height: size }}
        className={cn(
          "relative mx-auto mt-1 flex items-center justify-center rounded-full text-sm font-semibold transition-colors",
          isSelected
            ? "bg-emerald-700 text-white"
            : isToday
              ? "bg-emerald-100 text-emerald-700"
              : "text-neutral-700 hover:bg-neutral-50",
          disabled && "pointer-events-none opacity-30"
        )}
      >
        {!isSelected && hasLog && (
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef2ee" strokeWidth="2.5" />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={pct >= 100 ? "#0f7a4c" : "#f5a623"}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
            />
          </svg>
        )}
        <span className="relative z-10">{parseIso(date).getDate()}</span>
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-neutral-900">History</h1>
        {!readOnly && (
          <Link
            href="/history/bulk"
            className="flex h-9 w-9 items-center justify-center rounded-full text-emerald-700 hover:bg-emerald-50"
            aria-label="Bulk log or clear multiple days"
          >
            <CalendarPlus className="h-5 w-5" />
          </Link>
        )}
      </div>

      {totalQadaOwed > 0 && (
        <div className="rounded-2xl bg-amber-50 p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold text-amber-900">Qada owed &mdash; {totalQadaOwed} total</p>
          <div className="flex flex-wrap gap-2">
            {PRAYER_ORDER.filter((p) => qadaOwed[p] > 0).map((p) => (
              <span key={p} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-amber-800">
                {PRAYER_META[p].label}: {qadaOwed[p]}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between rounded-full bg-neutral-50 px-2 py-2">
          <div className="flex items-center gap-1">
            <Link
              href={prevHref}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-500 shadow-sm hover:text-emerald-700"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link
              href={toggleHref}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-500 shadow-sm hover:text-emerald-700"
              aria-label={view === "week" ? "Expand to month" : "Collapse to week"}
            >
              <ChevronsUpDown className="h-4 w-4" />
            </Link>
          </div>
          <p className="text-sm font-bold text-neutral-900">{monthLabel}</p>
          <Link
            href={nextHref}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-500 shadow-sm hover:text-emerald-700"
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {view === "week" ? (
          <div className="mt-3 grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_LABELS.map((label, i) => (
              <p key={label} className={cn("text-[10px] font-semibold", i === 0 || i === 6 ? "text-emerald-600" : "text-neutral-400")}>
                {label}
              </p>
            ))}
            {weekDates.map((date) => (
              <DayCell key={date} date={date} href={`/history?date=${date}&view=week`} size={36} />
            ))}
          </div>
        ) : (
          monthCalendar && (
            <div className="mt-3 grid grid-cols-7 gap-1 text-center">
              {["M", "T", "W", "T", "F", "S", "S"].map((label, i) => (
                <p key={i} className="text-[10px] font-semibold text-neutral-400">
                  {label}
                </p>
              ))}
              {Array.from({ length: monthCalendar.leadingBlanks }).map((_, i) => (
                <div key={`blank-${i}`} />
              ))}
              {monthCalendar.cells.map((cell) => (
                <DayCell
                  key={cell.date}
                  date={cell.date}
                  href={`/history?date=${cell.date}&view=week`}
                  size={32}
                  disabled={cell.date > today}
                />
              ))}
            </div>
          )
        )}
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">{weekdayLabel}</p>
            <p className="text-xl font-extrabold text-neutral-900">{fullDateLabel}</p>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-2">
              {hasLog && <ClearDayButton profileId={profileId} date={selectedDate} />}
              <EditDayButton profileId={profileId} date={selectedDate} dayLog={dayLog} haydEnabled={haydEnabled} />
            </div>
          )}
        </div>

        {hasLog ? (
          <>
            <div className="mt-4 flex items-center justify-around rounded-full bg-neutral-50 py-3">
              <span className="flex items-center gap-1.5 text-sm font-bold text-rose-600">
                <span className="text-rose-500">&times;</span> {missedCount}
                <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Missed</span>
              </span>
              <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-700">
                <span className="text-emerald-600">&#10003;</span> {doneCount}
                <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Done</span>
              </span>
              <span className="flex items-center gap-1.5 text-sm font-bold text-amber-600">
                {successPct}%
                <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Success</span>
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {PRAYER_ORDER.map((prayer) => {
                const status = dayLog[prayer] ?? "not_yet";
                const meta = PRAYER_META[prayer];
                const Icon = meta.icon;
                const tags = logTagsMap[`${selectedDate}_${prayer}`] ?? [];
                const showChevron = NEEDS_REASON.includes(status);
                const statusColor =
                  status === "missed"
                    ? "text-rose-600"
                    : status === "not_yet"
                      ? "text-neutral-400"
                      : "text-emerald-700";

                return (
                  <div key={prayer} className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", meta.bg)}>
                        <Icon className={cn("h-5 w-5", meta.fg)} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-neutral-900">{meta.label}</p>
                        <div className="flex items-center gap-1.5">
                          <span className={cn("text-xs font-medium", statusColor)}>{detailStatusLabel(status)}</span>
                          {tags.length === 1 && (
                            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                              {tags[0].label}
                            </span>
                          )}
                          {tags.length > 1 && (
                            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                              {tags.length} Reasons
                            </span>
                          )}
                        </div>
                      </div>
                      {showChevron && <ChevronDown className="h-4 w-4 shrink-0 text-neutral-300" />}
                    </div>
                    {showChevron && tags.length > 0 && (
                      <div className="ml-[52px] flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="rounded-full bg-neutral-50 px-2.5 py-1 text-[11px] font-medium text-neutral-600"
                          >
                            {tag.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <Clock3 className="h-6 w-6 text-emerald-300" strokeWidth={1.5} />
            </div>
            <p className="text-base font-bold text-neutral-900">Uncharted Day</p>
            <p className="max-w-xs text-sm text-neutral-400">
              This day has no records. You can explore another date or log your prayers for this day manually.
            </p>
            {!readOnly && (
              <EditDayButton
                profileId={profileId}
                date={selectedDate}
                dayLog={dayLog}
                haydEnabled={haydEnabled}
                className="mt-2 flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                <CalendarPlus className="h-4 w-4" />
                Log This Day
              </EditDayButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
