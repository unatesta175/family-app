import Link from "next/link";
import { ChevronLeft, ChevronRight, Crown, Flame, Leaf, Timer, Trees } from "lucide-react";
import { addDays, parseIso } from "@/lib/date";
import { focusToday, tzOffset } from "@/lib/focus-date";
import { focusViewer } from "@/lib/focus-view";
import { getHabits } from "@/lib/db/repo-habits";
import { cfgFromRow, getActiveFocusSessions, getFocusSessionsInRange, settleActiveSessions, toLite } from "@/lib/db/repo-focus";
import { byDay, byHabit, canCreditFocusTime, focusStreak, formatFocus } from "@/lib/focus";
import { nowMs } from "@/lib/now";
import { TodaySessionHistory } from "@/components/focus/today-session-history";
import { FocusMemberStrip, FocusViewerBanner, type FocusMemberCard } from "@/components/focus/focus-members";
import { GardenView } from "@/components/focus/garden-view";
import { FocusTree } from "@/components/focus/focus-tree";
import { StartPanel } from "@/components/focus/start-panel";
import { SessionTray } from "@/components/focus/session-tray";

export const metadata = { title: "Focus" };

export default async function FocusHomePage({ searchParams }: { searchParams: Promise<{ habit?: string; date?: string }> }) {
  const { habit: rawHabit, date: rawDate } = await searchParams;
  const { ownId, viewedId, readOnly, members, viewedName } = await focusViewer();

  const today = await focusToday();
  const tz = await tzOffset();
  // The day the "grove" card below is showing — today by default, or an earlier day the visitor paged back to.
  const viewDate = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) && rawDate <= today ? rawDate : today;
  const atToday = viewDate === today;
  // Only settle (a write) your own sessions; another member's are read as-is.
  const activeSessions = readOnly ? await getActiveFocusSessions(viewedId) : await settleActiveSessions(viewedId);
  const [habits, recent, viewRows] = await Promise.all([
    getHabits(viewedId),
    getFocusSessionsInRange(viewedId, addDays(today, -60), today),
    atToday ? Promise.resolve(null) : getFocusSessionsInRange(viewedId, viewDate, viewDate),
  ]);
  // A private habit's name is only shown to its own owner — never on another member's view of this page.
  const names = new Map(habits.filter((h) => !readOnly || !h.private).map((h) => [h.id, h.name]));
  const pickableHabits = habits.filter((h) => !h.systemKey && canCreditFocusTime(h)).map((h) => ({ id: h.id, name: h.name, color: h.color, hidden: h.hidden }));
  // Preselect whichever habit the last session was for, so starting again doesn't ask twice.
  const lastHabitId = [...recent].reverse().find((s) => s.habitId !== null)?.habitId ?? null;
  const days = byDay(recent.map(toLite));
  const todayTotals = days.get(today);
  const streak = focusStreak(days, today, addDays);
  // The habit with the most focused time today, for the top banner.
  const topHabitToday = byHabit(todayTotals?.sessions ?? []).find((h) => h.habitId !== null);
  // The sessions for whichever day the grove card is on: today's totals (already fetched above) or a fresh fetch for an earlier day.
  const viewSessions = atToday ? (todayTotals?.sessions ?? []) : (viewRows ?? []).map(toLite);
  const groveLink = (d: string) => `/focus?date=${d}`;
  const prevDate = addDays(viewDate, -1);
  const nextDate = addDays(viewDate, 1);
  const canNextDate = nextDate <= today;
  const viewDateLabel = atToday ? "Today" : parseIso(viewDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // Each circle member's trees and focus time today, for the switcher.
  const memberCards: FocusMemberCard[] = await Promise.all(
    members.map(async (m) => {
      const d = byDay((await getFocusSessionsInRange(m.id, today, today)).map(toLite)).get(today);
      return { id: m.id, name: m.name, trees: d?.trees ?? 0, seconds: d?.seconds ?? 0 };
    })
  );

  return (
    <div className="flex flex-col gap-5 md:mx-auto md:max-w-xl">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-h-muted">Deep work, one tree at a time</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Focus</h1>
      </div>

      {readOnly && <FocusViewerBanner name={viewedName} ownId={ownId} />}

      {topHabitToday && (
        <div className="h-card flex items-center gap-3 p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-h-brand-soft text-h-brand">
            <Crown className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold">{names.get(topHabitToday.habitId!) ?? "Habit"}</p>
            <p className="text-[11px] font-semibold text-h-muted">Top habit today</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-extrabold tabular-nums">{formatFocus(topHabitToday.seconds)}</p>
            <p className="text-[11px] font-semibold text-h-muted">
              {topHabitToday.sessions} session{topHabitToday.sessions === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      )}

      <FocusMemberStrip members={memberCards} viewedId={viewedId} />

      <div className="grid grid-cols-3 gap-2">
        <Tile icon={Trees} value={String(todayTotals?.trees ?? 0)} label="Trees today" />
        <Tile icon={Timer} value={formatFocus(todayTotals?.seconds ?? 0)} label="Focused today" />
        <Tile icon={Flame} value={`${streak}d`} label="Focus streak" />
      </div>

      {activeSessions.length > 0 ? (
        readOnly ? (
          <div className="h-card flex items-center gap-4 overflow-hidden bg-gradient-to-br from-h-brand-soft to-h-surface p-4">
            <FocusTree progress={0.55} species={activeSessions[0].species} className="h-20 w-16 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-extrabold">
                <Leaf className="h-4 w-4 text-h-brand" />
                {viewedName} is focusing now
              </p>
              <p className="text-xs text-h-muted">
                {activeSessions.length > 1
                  ? `${activeSessions.length} sessions going at once.`
                  : `${formatFocus(activeSessions[0].plannedSeconds)} session${activeSessions[0].habitId ? ` for ${names.get(activeSessions[0].habitId) ?? "a habit"}` : ""}. A tree is growing.`}
              </p>
            </div>
          </div>
        ) : (
          <SessionTray
            serverNow={nowMs()}
            sessions={activeSessions.map((s) => ({
              id: s.id,
              habitName: s.habitId ? (names.get(s.habitId) ?? "Habit") : null,
              species: s.species,
              mode: s.mode,
              cfg: cfgFromRow(s),
              startedAt: s.startedAt,
              plannedSeconds: s.plannedSeconds,
              pausedSeconds: s.pausedSeconds,
              pausedAt: s.pausedAt,
              openEnded: s.openEnded,
            }))}
          />
        )
      ) : readOnly ? (
        <div className="h-card flex flex-col items-center gap-1 p-6 text-center">
          <Leaf className="h-6 w-6 text-h-muted" />
          <p className="text-sm font-bold">{viewedName} isn&apos;t focusing right now</p>
          <p className="text-xs text-h-muted">Their grove and stats are below.</p>
        </div>
      ) : null}

      {!readOnly && (
        <>
          {activeSessions.length > 0 && <p className="px-1 text-xs font-extrabold uppercase tracking-wider text-h-muted">Start another session</p>}
          <StartPanel habits={pickableHabits} defaultHabitId={rawHabit && /^\d+$/.test(rawHabit) ? Number(rawHabit) : lastHabitId} />
        </>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-h-muted">{readOnly ? `${viewedName}'s grove` : "Grove"}</h2>
          <Link href="/focus/grove" className="text-xs font-bold text-h-brand">
            Open grove
          </Link>
        </div>
        <div className="flex items-center justify-between gap-2 px-1">
          <Link href={groveLink(prevDate)} aria-label="Previous day" className="flex h-8 w-8 items-center justify-center rounded-full bg-h-surface2 text-h-muted transition-colors hover:bg-h-surface2/70 hover:text-h-fg">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="text-center">
            <p className="text-sm font-bold text-h-fg">{viewDateLabel}</p>
            {!atToday && (
              <Link href={groveLink(today)} className="text-[11px] font-bold text-h-brand">
                Jump to today
              </Link>
            )}
          </div>
          {canNextDate ? (
            <Link href={groveLink(nextDate)} aria-label="Next day" className="flex h-8 w-8 items-center justify-center rounded-full bg-h-surface2 text-h-muted transition-colors hover:bg-h-surface2/70 hover:text-h-fg">
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full text-h-muted/30">
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </div>
        <div className="overflow-hidden rounded-3xl bg-gradient-to-b from-[#1c5a45] to-[#123f31] p-4 shadow-md">
          <GardenView sessions={viewSessions} className="mx-auto w-full max-w-sm" />
        </div>
        <TodaySessionHistory sessions={viewSessions} names={names} tz={tz} readOnly={readOnly} />
      </section>
    </div>
  );
}

function Tile({ icon: Icon, value, label }: { icon: React.ComponentType<{ className?: string }>; value: string; label: string }) {
  return (
    <div className="h-card flex flex-col items-start gap-2 p-3">
      <Icon className="h-4 w-4 text-h-brand" />
      <div>
        <p className="text-xl font-extrabold leading-none tabular-nums">{value}</p>
        <p className="mt-1 text-[11px] font-semibold text-h-muted">{label}</p>
      </div>
    </div>
  );
}
