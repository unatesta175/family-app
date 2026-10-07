import Link from "next/link";
import { ChevronLeft, ChevronRight, Leaf, Sprout } from "lucide-react";
import { getOwnProfileId } from "@/lib/auth";
import { addDays, addMonths, parseIso, todayIso } from "@/lib/date";
import { getHabits } from "@/lib/db/repo-habits";
import { getFocusSessionsInRange, settleActiveSession, toLite } from "@/lib/db/repo-focus";
import { byDay, hourDistribution, summarize } from "@/lib/focus";
import { MONTH_SHORT, WEEKDAY_SHORT, weekDates } from "@/lib/habits";
import { Distribution, type DistBar } from "@/components/focus/distribution";
import { GardenView } from "@/components/focus/garden-view";
import { SessionList } from "@/components/focus/grove-views";
import { cn } from "@/lib/utils";

export const metadata = { title: "Grove" };

const VIEWS = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
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

  // The range the view covers, and where the previous / next buttons go.
  let from = date;
  let to = date;
  let prev = addDays(date, -1);
  let next = addDays(date, 1);
  let title = date === today ? `${parseIso(date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} (Today)` : parseIso(date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  if (view === "week") {
    const w = weekDates(date);
    from = w[0];
    to = w[6];
    prev = addDays(from, -7);
    next = addDays(from, 7);
    const f = (iso: string) => parseIso(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    title = `${f(from)} – ${f(to)}, ${to.slice(0, 4)}`;
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
  const atNow = view === "day" ? date === today : from <= today && today <= to;

  const [sessions, habits] = await Promise.all([getFocusSessionsInRange(profileId, from, to), getHabits(profileId, { includeArchived: true })]);
  const names = new Map(habits.map((h) => [h.id, h.name]));
  const lite = sessions.map(toLite);
  const days = byDay(lite);
  const sum = summarize(lite);
  const link = (v: string, d: string) => `/focus/grove?view=${v}&date=${d}`;

  // The distribution chart: by hour for a day, by day for a week or month, by month for a year.
  let bars: DistBar[] = [];
  const chartTitle = "Focused Time Distribution";
  if (view === "day") {
    bars = hourDistribution(lite).map((s, h) => ({ label: `${String(h).padStart(2, "0")}`, seconds: s, title: `${String(h).padStart(2, "0")}:00`, showLabel: h % 6 === 0 }));
  } else if (view === "week") {
    bars = weekDates(date).map((d) => ({ label: WEEKDAY_SHORT[parseIso(d).getDay()], seconds: days.get(d)?.seconds ?? 0, title: d }));
  } else if (view === "month") {
    const dim = new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0).getDate();
    bars = Array.from({ length: dim }, (_, i) => {
      const d = `${date.slice(0, 7)}-${String(i + 1).padStart(2, "0")}`;
      return { label: String(i + 1), seconds: days.get(d)?.seconds ?? 0, title: d, showLabel: (i + 1) % 5 === 1 };
    });
  } else {
    bars = MONTH_SHORT.map((label, m) => {
      const key = `${date.slice(0, 4)}-${String(m + 1).padStart(2, "0")}`;
      let seconds = 0;
      for (const t of days.values()) if (t.date.startsWith(key)) seconds += t.seconds;
      return { label: label.slice(0, 3), seconds, title: key };
    });
  }

  return (
    <div className="-mx-4 flex flex-col gap-4 md:mx-auto md:max-w-3xl">
      {/* forest header: range tabs, date, and the garden itself */}
      <section className="overflow-hidden bg-gradient-to-b from-[#1c5a45] via-[#17503d] to-[#123f31] px-4 pb-6 pt-4 text-white shadow-lg md:rounded-[2rem]">
        <div role="tablist" aria-label="Range" className="grid grid-cols-4 gap-1 rounded-2xl bg-black/20 p-1">
          {VIEWS.map((v) => (
            <Link
              key={v.key}
              role="tab"
              aria-selected={view === v.key}
              href={link(v.key, date)}
              className={cn("rounded-xl py-2 text-center text-sm font-bold transition-colors", view === v.key ? "bg-white text-[#14503b] shadow" : "text-white/85 hover:bg-white/10")}
            >
              {v.label}
            </Link>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <Link href={link(view, prev)} aria-label="Previous" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="text-center">
            <p className="text-sm font-bold">{title}</p>
            {!atNow && (
              <Link href={link(view, today)} className="text-[11px] font-bold text-lime-200">
                Jump to today
              </Link>
            )}
          </div>
          {canNext ? (
            <Link href={link(view, next)} aria-label="Next" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
              <ChevronRight className="h-5 w-5" />
            </Link>
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full text-white/25">
              <ChevronRight className="h-5 w-5" />
            </span>
          )}
        </div>

        <div className="mx-auto mt-2 max-w-lg">
          <GardenView
            sessions={lite}
            overlay={
          <div className="absolute bottom-1 right-1 flex items-center gap-3 rounded-full bg-black/25 px-3 py-1.5 text-sm font-extrabold backdrop-blur-sm">
            <span className="flex items-center gap-1" title="Trees grown">
              <Sprout className="h-4 w-4 text-lime-300" />
              {sum.trees}
            </span>
            <span className="flex items-center gap-1" title="Trees that withered">
              <Leaf className="h-4 w-4 text-amber-300" />
              {sum.withered}
            </span>
          </div>
            }
          />
        </div>
      </section>

      <div className="flex flex-col gap-4 px-4 md:px-0">
        <Distribution title={chartTitle} bars={bars} />
        {sum.sessions > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="px-1 text-xs font-extrabold uppercase tracking-wider text-h-muted">Sessions</h2>
            <SessionList sessions={lite} names={names} />
          </section>
        )}
        {sum.sessions === 0 && <p className="rounded-2xl border border-dashed border-h-border p-6 text-center text-sm text-h-muted">No trees in this {view === "day" ? "day" : view}. Start a session and the first one is planted here.</p>}
      </div>
    </div>
  );
}
