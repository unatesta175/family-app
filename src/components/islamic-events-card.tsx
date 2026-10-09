import Link from "next/link";
import { CalendarDays, ChevronRight, Moon, Sparkles, Star } from "lucide-react";
import { eventsOn, ramadanProgress, upcomingEvents, type EventCategory, type IslamicEvent } from "@/lib/islamic-events";
import { toHijri } from "@/lib/hijri";
import { cn } from "@/lib/utils";

const CATEGORY_STYLE: Record<EventCategory, { pill: string; dot: string; icon: typeof Moon }> = {
  fasting: { pill: "bg-emerald-50 text-emerald-700 ring-emerald-100", dot: "bg-emerald-500", icon: Moon },
  celebration: { pill: "bg-rose-50 text-rose-700 ring-rose-100", dot: "bg-rose-500", icon: Sparkles },
  virtue: { pill: "bg-amber-50 text-amber-700 ring-amber-100", dot: "bg-amber-500", icon: Star },
};

function countdown(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 30) return `in ${days} days`;
  const months = Math.round(days / 30);
  return months <= 1 ? "in about a month" : `in about ${months} months`;
}

/** The Islamic calendar at a glance: the Hijri date, today's sacred days and recommended fasts, a
 *  Ramadan progress strip when it applies, and a countdown to what's coming up. Pure/server-rendered. */
export function IslamicEventsCard({ now }: { now: Date }) {
  const hijri = toHijri(now);
  const today = eventsOn(now);
  const ramadan = ramadanProgress(now);
  // Don't echo an event in "upcoming" if it's already happening today.
  const todayKeys = new Set(today.map((e) => e.key));
  const upcoming = upcomingEvents(now).filter((e) => !(e.daysUntil === 0 && todayKeys.has(e.key))).slice(0, 3);

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <Link href="/calendar" className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3 transition-colors hover:bg-neutral-50">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <CalendarDays className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-neutral-900">Islamic calendar</p>
            <p className="text-xs text-neutral-400">{hijri.day} {hijri.monthName} {hijri.year} AH</p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
      </Link>

      <div className="flex flex-col gap-3 p-4">
        {ramadan.active && (
          <div className="rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-3.5 text-white">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-bold"><Moon className="h-4 w-4" /> Ramadan</p>
              <p className="text-xs font-semibold text-emerald-50">Day {ramadan.day} of ~30{ramadan.isLastTen ? " · last ten" : ""}</p>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, (ramadan.day / 30) * 100)}%` }} />
            </div>
          </div>
        )}

        {today.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-neutral-400">Today</p>
            <div className="flex flex-col gap-1.5">
              {today.map((e) => (
                <EventRow key={e.key} event={e} />
              ))}
            </div>
          </div>
        )}

        {upcoming.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-neutral-400">Coming up</p>
            <ul className="flex flex-col divide-y divide-neutral-100">
              {upcoming.map((e) => {
                const style = CATEGORY_STYLE[e.category];
                return (
                  <li key={e.key} className="flex items-center justify-between gap-3 py-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", style.dot)} />
                      <span className="truncate text-sm font-medium text-neutral-800">{e.name}</span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-neutral-400">
                      {e.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {countdown(e.daysUntil)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {today.length === 0 && !ramadan.active && upcoming.length === 0 && (
          <p className="text-xs text-neutral-400">No special days right now.</p>
        )}
      </div>
    </section>
  );
}

function EventRow({ event }: { event: IslamicEvent }) {
  const style = CATEGORY_STYLE[event.category];
  const Icon = style.icon;
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-neutral-50 px-3 py-2.5">
      <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ring-1", style.pill)}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-neutral-900">
          {event.name}
          {event.fasting && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">Fasting</span>}
        </p>
        <p className="text-xs text-neutral-500">{event.blurb}</p>
      </div>
    </div>
  );
}
