import Link from "next/link";
import { FocusTree } from "@/components/focus/focus-tree";
import { addDays, parseIso } from "@/lib/date";
import { MONTH_SHORT, WEEKDAY_SHORT, weekDates } from "@/lib/habits";
import { formatFocus, type DayTotals, type SessionLite } from "@/lib/focus";
import { cn } from "@/lib/utils";

export type HabitNames = Map<number, string>;

const clockLabel = (ms: number) => new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/**
 * One day's garden. Every finished session is a full tree and every given-up one a stump. The plot is
 * always a few tiles bigger than the trees in it and grows a row at a time, so there is no limit.
 */
export function DayGarden({ day, names }: { day: DayTotals | undefined; names: HabitNames }) {
  const sessions = day?.sessions ?? [];
  // 12 tiles fit whole rows at 4 and 6 columns; one spare row of room is always kept.
  const tiles = Math.max(12, Math.ceil((sessions.length + 3) / 12) * 12);
  return (
    <div className="rounded-3xl border border-emerald-200/70 bg-gradient-to-b from-emerald-50 to-emerald-100/70 p-3 shadow-sm dark:border-[#21392f] dark:from-[#0f221d] dark:to-[#0b1814]">
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
        {Array.from({ length: tiles }, (_, i) => {
          const s = sessions[i];
          return (
            <div
              key={i}
              title={s ? `${clockLabel(s.startedAt)} · ${formatFocus(s.focusedSeconds)}${s.habitId ? ` · ${names.get(s.habitId) ?? ""}` : ""}${s.status === "withered" ? " · withered" : ""}` : undefined}
              className={cn("relative aspect-square overflow-hidden rounded-xl", s ? "bg-gradient-to-b from-emerald-100 to-emerald-200/80 dark:from-[#14302a] dark:to-[#10261f]" : "border border-dashed border-emerald-300/50 dark:border-[#21392f]")}
            >
              {s && <FocusTree progress={s.status === "completed" ? 1 : Math.max(0.2, s.focusedSeconds / s.plannedSeconds)} species={s.species} withered={s.status === "withered"} animate={false} className="absolute inset-0 h-full w-full" />}
            </div>
          );
        })}
      </div>
      {sessions.length === 0 && <p className="px-2 pb-1 pt-3 text-center text-xs font-medium text-h-muted">Nothing planted yet. Start a session and the first tree goes here.</p>}
    </div>
  );
}

/** The sessions of a day, newest last, with their length and what they were for. */
export function SessionList({ sessions, names }: { sessions: SessionLite[]; names: HabitNames }) {
  if (sessions.length === 0) return null;
  return (
    <ul className="flex flex-col divide-y divide-h-border overflow-hidden rounded-2xl border border-h-border bg-h-surface">
      {sessions.map((s) => (
        <li key={s.id} className="flex items-center gap-3 px-3 py-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-100 dark:bg-[#14302a]">
            <FocusTree progress={s.status === "completed" ? 1 : Math.max(0.2, s.focusedSeconds / s.plannedSeconds)} species={s.species} withered={s.status === "withered"} animate={false} className="h-9 w-9" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-tight">{s.habitId ? (names.get(s.habitId) ?? "Habit") : "Focus session"}</p>
            <p className="text-[11px] text-h-muted">
              {clockLabel(s.startedAt)} · {s.status === "completed" ? "grown" : `withered after ${formatFocus(s.focusedSeconds)}`}
            </p>
          </div>
          <span className="shrink-0 text-sm font-extrabold tabular-nums">{formatFocus(s.status === "completed" ? s.plannedSeconds : s.focusedSeconds)}</span>
        </li>
      ))}
    </ul>
  );
}

/** A small garden of tiny trees for a day, with "+n" for the ones that do not fit. */
export function MiniGarden({ day, max = 12, cols = "grid-cols-4" }: { day: DayTotals | undefined; max?: number; cols?: string }) {
  const sessions = day?.sessions ?? [];
  if (sessions.length === 0) return <div className="flex h-10 items-center justify-center text-[11px] font-medium text-h-muted/60">empty</div>;
  const shown = sessions.slice(0, max);
  return (
    <div className={cn("grid gap-0.5", cols)}>
      {shown.map((s) => (
        <div key={s.id} className="aspect-square overflow-hidden rounded-md bg-emerald-100/70 dark:bg-[#14302a]">
          <FocusTree progress={s.status === "completed" ? 1 : Math.max(0.2, s.focusedSeconds / s.plannedSeconds)} species={s.species} withered={s.status === "withered"} animate={false} className="h-full w-full" />
        </div>
      ))}
      {sessions.length > max && <div className="flex aspect-square items-center justify-center rounded-md bg-h-surface2 text-[10px] font-extrabold text-h-muted">+{sessions.length - max}</div>}
    </div>
  );
}

const href = (view: string, date: string) => `/focus/grove?view=${view}&date=${date}`;

/** Seven small gardens, one per day of the week. */
export function WeekView({ date, today, days }: { date: string; today: string; days: Map<string, DayTotals> }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {weekDates(date).map((d) => {
        const t = days.get(d);
        return (
          <Link key={d} href={href("day", d)} className={cn("h-card flex flex-col gap-2 p-2.5 transition-shadow hover:shadow-md", d === today && "ring-2 ring-h-brand")}>
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-extrabold">{WEEKDAY_SHORT[parseIso(d).getDay()]}</span>
              <span className="text-[11px] font-bold text-h-muted">{parseIso(d).getDate()}</span>
            </div>
            <MiniGarden day={t} max={12} cols="grid-cols-4" />
            <p className="text-[11px] font-bold tabular-nums text-h-muted">
              {t ? `${t.trees} tree${t.trees === 1 ? "" : "s"} · ${formatFocus(t.seconds)}` : "No focus"}
            </p>
          </Link>
        );
      })}
    </div>
  );
}

/** The month as a calendar: each day shows its trees and how much time went in. */
export function MonthView({ date, today, days }: { date: string; today: string; days: Map<string, DayTotals> }) {
  const first = `${date.slice(0, 7)}-01`;
  const dim = new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0).getDate();
  const lead = parseIso(first).getDay();
  const maxSeconds = Math.max(1, ...[...days.values()].map((d) => d.seconds));
  return (
    <div className="h-card p-3">
      <div className="grid grid-cols-7 gap-1 pb-1.5 text-center text-[10px] font-bold uppercase text-h-muted">
        {WEEKDAY_SHORT.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: lead }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {Array.from({ length: dim }, (_, i) => {
          const d = `${date.slice(0, 7)}-${String(i + 1).padStart(2, "0")}`;
          const t = days.get(d);
          const heat = t ? Math.max(0.12, Math.min(0.55, (t.seconds / maxSeconds) * 0.55)) : 0;
          return (
            <Link
              key={d}
              href={href("day", d)}
              style={t ? { background: `color-mix(in srgb, var(--h-brand) ${Math.round(heat * 100)}%, var(--h-surface))` } : undefined}
              className={cn("flex min-h-16 flex-col justify-between rounded-xl border p-1.5 transition-transform hover:scale-[1.03] sm:min-h-20", t ? "border-transparent" : "border-h-border bg-h-surface", d === today && "ring-2 ring-h-brand")}
            >
              <span className="text-[11px] font-bold">{i + 1}</span>
              {t ? (
                <span className="text-[10px] font-extrabold leading-tight tabular-nums">
                  {t.trees > 0 && <span>{t.trees}🌳</span>}
                  {t.withered > 0 && <span className="ml-1 opacity-60">{t.withered}🥀</span>}
                  <span className="block font-bold opacity-70">{formatFocus(t.seconds)}</span>
                </span>
              ) : (
                <span />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** The year as twelve months of squares, darker where more time went in. */
export function YearView({ year, today, days }: { year: number; today: string; days: Map<string, DayTotals> }) {
  const maxSeconds = Math.max(1, ...[...days.values()].map((d) => d.seconds));
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {MONTH_SHORT.map((label, m) => {
        const key = `${year}-${String(m + 1).padStart(2, "0")}`;
        const dim = new Date(year, m + 1, 0).getDate();
        const lead = new Date(year, m, 1).getDay();
        let trees = 0;
        let seconds = 0;
        for (let d = 1; d <= dim; d++) {
          const t = days.get(`${key}-${String(d).padStart(2, "0")}`);
          if (t) {
            trees += t.trees;
            seconds += t.seconds;
          }
        }
        return (
          <Link key={key} href={href("month", `${key}-01`)} className="h-card flex flex-col gap-2 p-3 transition-shadow hover:shadow-md">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-extrabold">{label}</span>
              <span className="text-[11px] font-bold tabular-nums text-h-muted">{trees > 0 ? `${trees} 🌳 · ${formatFocus(seconds)}` : "quiet"}</span>
            </div>
            <div className="grid grid-cols-7 gap-[3px]">
              {Array.from({ length: lead }, (_, i) => (
                <span key={`b${i}`} />
              ))}
              {Array.from({ length: dim }, (_, i) => {
                const d = `${key}-${String(i + 1).padStart(2, "0")}`;
                const t = days.get(d);
                const pct = t ? Math.round(Math.max(0.2, t.seconds / maxSeconds) * 100) : 0;
                return (
                  <span
                    key={d}
                    title={t ? `${d}: ${t.trees} trees, ${formatFocus(t.seconds)}` : d}
                    style={t ? { background: `color-mix(in srgb, var(--h-brand) ${pct}%, var(--h-surface-2))` } : undefined}
                    className={cn("aspect-square rounded-[3px] bg-h-surface2", d === today && "ring-1 ring-h-fg")}
                  />
                );
              })}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export { addDays };
