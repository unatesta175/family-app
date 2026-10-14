import Link from "next/link";
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Grid3x3 } from "lucide-react";
import { loadHabitData } from "@/lib/habit-data";
import { weekDates } from "@/lib/habits";
import { addDays, addMonths, parseIso, todayIso } from "@/lib/date";
import { WeekContent } from "@/components/habits/week-content";
import { HiddenHabitsToggle } from "@/components/hidden-habits-toggle";
import { cn } from "@/lib/utils";

export default async function HabitsWeekPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string; month?: string }>;
}) {
  const { date: rawDate, view: rawView, month: rawMonth } = await searchParams;
  const view: "week" | "month" | "heatmap" = rawView === "heatmap" ? "heatmap" : rawView === "month" ? "month" : "week";
  const monthView = view === "month";
  const today = todayIso();
  const anchor = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : today;
  const dates = weekDates(anchor);
  const isCurrentWeek = dates.includes(today);

  const data = await loadHabitData();

  const monthKey = rawMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(rawMonth) ? rawMonth : today.slice(0, 7);
  const monthFirst = `${monthKey}-01`;
  const monthDays = new Date(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5)), 0).getDate();
  const monthDates = Array.from({ length: monthDays }, (_, i) => `${monthKey}-${String(i + 1).padStart(2, "0")}`);
  const monthLabel = parseIso(monthFirst).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const fmt = (iso: string) => parseIso(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className={cn("flex min-w-0 max-w-full flex-col gap-5 overflow-x-clip md:mx-auto", monthView ? "md:max-w-none lg:h-[calc(100dvh-8.5rem)] lg:gap-3" : "md:max-w-3xl")}>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-h-muted">{data.profile?.name}</p>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h1 className="text-2xl font-extrabold tracking-tight">Progress</h1>
          {monthView && (
            <div className="flex items-center gap-1 rounded-full border border-h-border bg-h-surface p-0.5 shadow-sm">
              <Link href={`/habits/week?view=month&month=${addMonths(monthFirst, -1).slice(0, 7)}`} aria-label="Previous month" className="flex h-8 w-8 items-center justify-center rounded-full text-h-muted hover:bg-h-surface2">
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <div className="min-w-32 text-center leading-tight">
                <p className="text-sm font-extrabold">{monthLabel}</p>
                {monthKey !== today.slice(0, 7) && (
                  <Link href="/habits/week?view=month" className="text-[10px] font-bold text-h-brand">
                    Jump to this month
                  </Link>
                )}
              </div>
              <Link href={`/habits/week?view=month&month=${addMonths(monthFirst, 1).slice(0, 7)}`} aria-label="Next month" className="flex h-8 w-8 items-center justify-center rounded-full text-h-muted hover:bg-h-surface2">
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div role="tablist" aria-label="Display" className="flex rounded-full border border-h-border bg-h-surface p-0.5 shadow-sm">
              {(
                [
                  { key: "week", label: "Week", icon: CalendarDays, href: "/habits/week" },
                  { key: "month", label: "Month", icon: CalendarRange, href: "/habits/week?view=month" },
                  { key: "heatmap", label: "Heatmap", icon: Grid3x3, href: "/habits/week?view=heatmap" },
                ] as const
              ).map((v) => {
                const active = v.key === view;
                return (
                  <Link
                    key={v.key}
                    role="tab"
                    aria-selected={active}
                    href={v.href}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                      active ? "bg-h-brand text-h-brand-fg shadow-sm" : "text-h-muted hover:text-h-fg"
                    )}
                  >
                    <v.icon className="h-3.5 w-3.5" />
                    {v.label}
                  </Link>
                );
              })}
            </div>
            <HiddenHabitsToggle />
          </div>
        </div>
      </div>

      {view === "week" && (
      <div className="h-card flex items-center justify-between gap-2 p-2">
        <Link
          href={`/habits/week?date=${addDays(dates[0], -7)}`}
          aria-label="Previous week"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-h-muted hover:bg-h-surface2"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="text-center">
          <p className="text-sm font-extrabold">
            {fmt(dates[0])} – {fmt(dates[6])}
          </p>
          {isCurrentWeek ? (
            <p className="text-[11px] font-bold text-h-brand">This week</p>
          ) : (
            <Link href="/habits/week" className="text-[11px] font-bold text-h-brand">
              Jump to this week
            </Link>
          )}
        </div>
        <Link
          href={`/habits/week?date=${addDays(dates[0], 7)}`}
          aria-label="Next week"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-h-muted hover:bg-h-surface2"
        >
          <ChevronRight className="h-5 w-5" />
        </Link>
      </div>
      )}

      <WeekContent data={data} view={view} today={today} anchor={anchor} dates={dates} monthKey={monthKey} monthDays={monthDays} monthDates={monthDates} />
    </div>
  );
}
