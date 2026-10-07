import Link from "next/link";
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, LayoutGrid, Sun } from "lucide-react";
import { getOwnProfileId } from "@/lib/auth";
import { addDays, addMonths, parseIso, todayIso } from "@/lib/date";
import { getHabits } from "@/lib/db/repo-habits";
import { getFocusSessionsInRange, settleActiveSession, toLite } from "@/lib/db/repo-focus";
import { byDay, formatFocus, summarize } from "@/lib/focus";
import { weekDates } from "@/lib/habits";
import { DayGarden, MonthView, SessionList, WeekView, YearView } from "@/components/focus/grove-views";
import { cn } from "@/lib/utils";

export const metadata = { title: "Grove" };

const VIEWS = [
  { key: "day", label: "Day", icon: Sun },
  { key: "week", label: "Week", icon: CalendarDays },
  { key: "month", label: "Month", icon: CalendarRange },
  { key: "year", label: "Year", icon: LayoutGrid },
] as const;
type View = (typeof VIEWS)[number]["key"];

export default async function GrovePage({ searchParams }: { searchParams: Promise<{ view?: string; date?: string }> }) {
  const { view: rawView, date: rawDate } = await searchParams;
  const view: View = VIEWS.some((v) => v.key === rawView) ? (rawView as View) : "day";
  const today = todayIso();
  const date = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) && rawDate <= today ? rawDate : today;

  const profileId = await getOwnProfileId();
  if (profileId === null) return <p className="h-card p-6 text-center text-sm text-h-muted">No profile for this account.</p>;
  await settleActiveSession(profileId);

  // The range the view covers, and the date the previous / next buttons move to.
  let from = date;
  let to = date;
  let prev = addDays(date, -1);
  let next = addDays(date, 1);
  let title = parseIso(date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  if (view === "week") {
    const w = weekDates(date);
    from = w[0];
    to = w[6];
    prev = addDays(from, -7);
    next = addDays(from, 7);
    const f = (iso: string) => parseIso(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    title = `${f(from)} – ${f(to)}`;
  } else if (view === "month") {
    from = `${date.slice(0, 7)}-01`;
    to = `${date.slice(0, 7)}-31`;
    prev = addMonths(from, -1);
    next = addMonths(from, 1);
    title = parseIso(from).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } else if (view === "year") {
    const y = date.slice(0, 4);
    from = `${y}-01-01`;
    to = `${y}-12-31`;
    prev = `${Number(y) - 1}-01-01`;
    next = `${Number(y) + 1}-01-01`;
    title = y;
  }
  const canNext = next <= today;

  const [sessions, habits] = await Promise.all([getFocusSessionsInRange(profileId, from, to), getHabits(profileId, { includeArchived: true })]);
  const names = new Map(habits.map((h) => [h.id, h.name]));
  const lite = sessions.map(toLite);
  const days = byDay(lite);
  const sum = summarize(lite);
  const link = (v: string, d: string) => `/focus/grove?view=${v}&date=${d}`;

  return (
    <div className="flex flex-col gap-4 md:mx-auto md:max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-h-muted">Everything you have grown</p>
          <h1 className="text-2xl font-extrabold tracking-tight">Grove</h1>
        </div>
        <div role="tablist" aria-label="Range" className="flex rounded-full border border-h-border bg-h-surface p-0.5 shadow-sm">
          {VIEWS.map((v) => (
            <Link
              key={v.key}
              role="tab"
              aria-selected={view === v.key}
              href={link(v.key, date)}
              className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors", view === v.key ? "bg-h-brand text-h-brand-fg shadow-sm" : "text-h-muted hover:text-h-fg")}
            >
              <v.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{v.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="h-card flex items-center justify-between gap-2 p-2">
        <Link href={link(view, prev)} aria-label="Previous" className="flex h-9 w-9 items-center justify-center rounded-xl text-h-muted hover:bg-h-surface2">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="text-center">
          <p className="text-sm font-extrabold">{title}</p>
          {(view === "day" ? date !== today : !(from <= today && today <= to)) ? (
            <Link href={link(view, today)} className="text-[11px] font-bold text-h-brand">
              Jump to today
            </Link>
          ) : (
            <p className="text-[11px] font-bold text-h-brand">Now</p>
          )}
        </div>
        {canNext ? (
          <Link href={link(view, next)} aria-label="Next" className="flex h-9 w-9 items-center justify-center rounded-xl text-h-muted hover:bg-h-surface2">
            <ChevronRight className="h-5 w-5" />
          </Link>
        ) : (
          <span className="flex h-9 w-9 items-center justify-center text-h-border">
            <ChevronRight className="h-5 w-5" />
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat value={String(sum.trees)} label={sum.trees === 1 ? "Tree grown" : "Trees grown"} />
        <Stat value={formatFocus(sum.seconds)} label="Focused" />
        <Stat value={sum.withered > 0 ? String(sum.withered) : "0"} label="Withered" />
      </div>

      {view === "day" && (
        <>
          <DayGarden day={days.get(date)} names={names} />
          <SessionList sessions={days.get(date)?.sessions ?? []} names={names} />
        </>
      )}
      {view === "week" && <WeekView date={date} today={today} days={days} />}
      {view === "month" && <MonthView date={date} today={today} days={days} />}
      {view === "year" && <YearView year={Number(date.slice(0, 4))} today={today} days={days} />}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="h-card p-3">
      <p className="text-xl font-extrabold leading-none tabular-nums">{value}</p>
      <p className="mt-1 text-[11px] font-semibold text-h-muted">{label}</p>
    </div>
  );
}
