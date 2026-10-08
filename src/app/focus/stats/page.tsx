import Link from "next/link";
import { Award, Clock, Flame, Percent, Timer, Trees } from "lucide-react";
import { addDays, parseIso } from "@/lib/date";
import { focusToday, tzOffset } from "@/lib/focus-date";
import { focusViewer } from "@/lib/focus-view";
import { getHabits } from "@/lib/db/repo-habits";
import { getFocusSessionsInRange, settleActiveSession, toLite } from "@/lib/db/repo-focus";
import { byDay, focusStreak, formatFocus, hourDistribution, summarize } from "@/lib/focus";
import { MONTH_SHORT } from "@/lib/habits";
import { FocusViewerBanner } from "@/components/focus/focus-members";
import { cn } from "@/lib/utils";

export const metadata = { title: "Focus stats" };

const RANGES = [
  { days: 7, label: "7d" },
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
  { days: 365, label: "1y" },
] as const;

type Bar = { label: string; seconds: number; trees: number; title: string };

export default async function FocusStatsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range: rawRange } = await searchParams;
  const range = RANGES.find((r) => String(r.days) === rawRange)?.days ?? 30;
  const { ownId, viewedId, readOnly, viewedName } = await focusViewer();
  const profileId = viewedId;
  if (!readOnly) await settleActiveSession(profileId);

  const today = await focusToday();
  const tz = await tzOffset();
  const from = addDays(today, -(range - 1));
  const [sessions, habits] = await Promise.all([getFocusSessionsInRange(profileId, from, today), getHabits(profileId, { includeArchived: true })]);
  const names = new Map(habits.map((h) => [h.id, h.name]));
  const lite = sessions.map(toLite);
  const days = byDay(lite);
  const sum = summarize(lite);
  const streak = focusStreak(days, today, addDays);

  // Bars: a day each up to a month, a week each for 90 days, a month each for a year.
  const bars: Bar[] = [];
  if (range <= 30) {
    for (let i = range - 1; i >= 0; i--) {
      const d = addDays(today, -i);
      const t = days.get(d);
      bars.push({ label: String(parseIso(d).getDate()), seconds: t?.seconds ?? 0, trees: t?.trees ?? 0, title: d });
    }
  } else if (range === 90) {
    for (let w = 12; w >= 0; w--) {
      const end = addDays(today, -w * 7);
      let seconds = 0;
      let trees = 0;
      for (let i = 0; i < 7; i++) {
        const t = days.get(addDays(end, -i));
        seconds += t?.seconds ?? 0;
        trees += t?.trees ?? 0;
      }
      bars.push({ label: parseIso(addDays(end, -6)).toLocaleDateString("en-US", { month: "short", day: "numeric" }), seconds, trees, title: `Week ending ${end}` });
    }
  } else {
    const now = parseIso(today);
    for (let m = 11; m >= 0; m--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      let seconds = 0;
      let trees = 0;
      for (const t of days.values()) {
        if (!t.date.startsWith(key)) continue;
        seconds += t.seconds;
        trees += t.trees;
      }
      bars.push({ label: MONTH_SHORT[dt.getMonth()], seconds, trees, title: key });
    }
  }
  const maxBar = Math.max(1, ...bars.map((b) => b.seconds));

  const hours = hourDistribution(lite, tz);
  const maxHour = Math.max(1, ...hours);
  const bestHour = hours.some((h) => h > 0) ? hours.indexOf(Math.max(...hours)) : -1;
  const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "am" : "pm"}`;

  // Time per habit.
  const perHabit = new Map<string, number>();
  for (const s of lite) {
    if (s.status === "active") continue;
    const key = s.habitId ? (names.get(s.habitId) ?? "Habit") : "No habit";
    perHabit.set(key, (perHabit.get(key) ?? 0) + s.focusedSeconds);
  }
  const habitRows = [...perHabit.entries()].sort((a, b) => b[1] - a[1]);
  const maxHabit = Math.max(1, ...habitRows.map((r) => r[1]));

  const bestDay = [...days.values()].sort((a, b) => b.seconds - a.seconds)[0];
  const mostTrees = [...days.values()].sort((a, b) => b.trees - a.trees)[0];

  return (
    <div className="flex flex-col gap-5 md:mx-auto md:max-w-3xl">
      {readOnly && <FocusViewerBanner name={viewedName} ownId={ownId} />}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-h-muted">{readOnly ? `${viewedName}'s focus` : "Where your focus goes"}</p>
          <h1 className="text-2xl font-extrabold tracking-tight">Focus stats</h1>
        </div>
        <div className="flex gap-1 rounded-xl bg-h-surface2 p-1">
          {RANGES.map((r) => (
            <Link key={r.days} href={`/focus/stats?range=${r.days}`} className={cn("rounded-lg px-3 py-1.5 text-xs font-bold transition-all", r.days === range ? "bg-h-surface text-h-fg shadow-sm" : "text-h-muted hover:text-h-fg")}>
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {sum.sessions === 0 ? (
        <div className="h-card flex flex-col items-center gap-2 p-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-h-brand-soft text-h-brand">
            <Trees className="h-7 w-7" />
          </span>
          <p className="text-base font-extrabold">Nothing to chart yet</p>
          <p className="text-sm text-h-muted">Finish a focus session and your time, trees and best hours show up here.</p>
          <Link href="/focus" className="mt-1 rounded-xl bg-h-brand px-4 py-2 text-sm font-extrabold text-h-brand-fg">
            Start a session
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Tile icon={Clock} value={formatFocus(sum.seconds)} label="Total focus" />
            <Tile icon={Trees} value={String(sum.trees)} label={`Trees grown${sum.withered ? ` · ${sum.withered} withered` : ""}`} />
            <Tile icon={Timer} value={formatFocus(sum.avgSeconds)} label="Average session" />
            <Tile icon={Percent} value={sum.finishRate === null ? "–" : `${sum.finishRate}%`} label="Sessions finished" />
            <Tile icon={Award} value={formatFocus(sum.longest)} label="Longest session" />
            <Tile icon={Flame} value={`${streak}d`} label="Focus streak" />
          </div>

          <section className="h-card p-4">
            <h2 className="text-sm font-extrabold">Focus time</h2>
            <p className="mb-3 text-[11px] text-h-muted">{range <= 30 ? "Per day" : range === 90 ? "Per week" : "Per month"}</p>
            <div className="flex h-36 items-end gap-[3px]">
              {bars.map((b, i) => (
                <div key={i} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${b.title}: ${formatFocus(b.seconds)}, ${b.trees} tree${b.trees === 1 ? "" : "s"}`}>
                  <div className={cn("w-full rounded-t-md", b.seconds > 0 ? "bg-h-brand" : "bg-h-surface2")} style={{ height: `${b.seconds > 0 ? Math.max(4, (b.seconds / maxBar) * 100) : 3}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex gap-[3px] text-[9px] font-semibold text-h-muted">
              {bars.map((b, i) => (
                <span key={i} className="min-w-0 flex-1 truncate text-center">
                  {range <= 30 && range > 7 && i % 5 !== 0 ? "" : b.label}
                </span>
              ))}
            </div>
          </section>

          <section className="h-card p-4">
            <h2 className="text-sm font-extrabold">When you focus</h2>
            <p className="mb-3 text-[11px] text-h-muted">{bestHour >= 0 ? `You focus most around ${hourLabel(bestHour)}.` : "Time of day, across all sessions."}</p>
            <div className="flex h-24 items-end gap-[3px]">
              {hours.map((h, i) => (
                <div key={i} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${hourLabel(i)}: ${formatFocus(h)}`}>
                  <div className={cn("w-full rounded-t-sm", i === bestHour ? "bg-h-brand" : h > 0 ? "bg-h-brand/45" : "bg-h-surface2")} style={{ height: `${h > 0 ? Math.max(6, (h / maxHour) * 100) : 3}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[9px] font-semibold text-h-muted">
              {["12am", "6am", "12pm", "6pm", "11pm"].map((l) => (
                <span key={l}>{l}</span>
              ))}
            </div>
          </section>

          {habitRows.length > 0 && (
            <section className="h-card flex flex-col gap-3 p-4">
              <h2 className="text-sm font-extrabold">By habit</h2>
              {habitRows.map(([name, seconds]) => (
                <div key={name}>
                  <div className="mb-1 flex items-center justify-between text-xs font-bold">
                    <span className="truncate">{name}</span>
                    <span className="tabular-nums text-h-muted">{formatFocus(seconds)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-h-surface2">
                    <div className="h-full rounded-full bg-h-brand" style={{ width: `${(seconds / maxHabit) * 100}%` }} />
                  </div>
                </div>
              ))}
            </section>
          )}

          <section className="h-card flex flex-col gap-2 p-4">
            <h2 className="text-sm font-extrabold">Records in this range</h2>
            {bestDay && (
              <Record label="Best day" value={`${formatFocus(bestDay.seconds)} on ${parseIso(bestDay.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`} />
            )}
            {mostTrees && mostTrees.trees > 0 && <Record label="Most trees in a day" value={`${mostTrees.trees} on ${parseIso(mostTrees.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`} />}
            <Record label="Days with a tree" value={String([...days.values()].filter((d) => d.trees > 0).length)} />
          </section>
        </>
      )}
    </div>
  );
}

function Tile({ icon: Icon, value, label }: { icon: React.ComponentType<{ className?: string }>; value: string; label: string }) {
  return (
    <div className="h-card flex flex-col gap-2 p-3">
      <Icon className="h-4 w-4 text-h-brand" />
      <div>
        <p className="text-xl font-extrabold leading-none tabular-nums">{value}</p>
        <p className="mt-1 text-[11px] font-semibold text-h-muted">{label}</p>
      </div>
    </div>
  );
}

function Record({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-h-surface2 px-3 py-2 text-sm">
      <span className="font-semibold text-h-muted">{label}</span>
      <span className="font-extrabold tabular-nums">{value}</span>
    </div>
  );
}
