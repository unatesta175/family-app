"use client";

import { useEffect, useMemo, useOptimistic, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import {
  Ban,
  Check,
  ChevronDown,
  ChevronRight,
  Flame,
  ListChecks,
  MoreHorizontal,
  Minus,
  Pause,
  Play,
  Plus,
  Repeat,
  RotateCcw,
  SkipForward,
  Undo2,
  X,
  PartyPopper,
  AlarmClock,
  CornerDownRight,
  Layers,
  Target,
} from "lucide-react";
import { logHabitAction, skipTaskAction, toggleTaskAction } from "@/lib/habit-actions";
import {
  STATUS_COLOR,
  STREAK_UNIT_SHORT,
  WEEKDAY_SHORT,
  colorHex,
  formatClock,
  formatDuration,
  formatNumber,
  formatTimeOfDay,
  PRIORITY_META,
  statusStyle,
  targetMet,
  timeOffGoal,
  tint,
  type DayState,
} from "@/lib/habits";
import { readTimerStart, startTimer, stopTimer, subscribeTimers } from "@/lib/habit-timer";
import { HabitIcon } from "@/components/habits/habit-icon";
import { Checkbox } from "@/components/habits/ui/checkbox";
import { ConfirmDialog } from "@/components/habits/confirm-dialog";
import { ProgressDialog } from "@/components/habits/progress-dialog";
import { StatusGuideButton } from "@/components/habits/status-guide";
import type { BoardGoal, BoardHabit, BoardTask } from "@/lib/habit-board";
import { parseIso } from "@/lib/date";
import { cn } from "@/lib/utils";

type Filter = "all" | "build" | "break" | "tasks";
type HabitStatus = "done" | "slipped" | "skipped" | "missed" | "clear";

type Action =
  | { type: "habit"; id: number; status: HabitStatus; value?: number; checked?: string[] }
  | { type: "task"; id: number; done: boolean }
  | { type: "task_skip"; id: number; skipped: boolean };

type State = { habits: BoardHabit[]; tasks: BoardTask[] };

type LogFn = (id: number, status: HabitStatus, value?: number, checked?: string[]) => void;

function isComplete(h: BoardHabit) {
  return h.state === "done";
}

function reduce(date: string, today: string) {
  return (state: State, action: Action): State => {
    if (action.type === "task") {
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.id ? { ...t, done: action.done, skipped: action.done ? false : t.skipped } : t)),
      };
    }
    if (action.type === "task_skip") {
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.id ? { ...t, skipped: action.skipped, done: action.skipped ? false : t.done } : t)),
      };
    }
    return {
      ...state,
      habits: state.habits.map((h) => {
        if (h.id !== action.id) return h;
        const wasComplete = isComplete(h);
        const isPeriod = h.schedule === "weekly_count";
        // Where an entry lands when it's cleared (or never logged).
        const empty: DayState = isPeriod ? "flex" : h.flexible ? (date === today ? "pending" : "flex") : date === today ? "pending" : "missed";
        let nextState: DayState;
        let value = 0;
        let checklist = h.checklist.map((i) => ({ ...i, checked: false }));

        if (action.status === "done") {
          if (h.evalType === "yes_no") {
            value = 1;
            nextState = "done";
          } else if (h.evalType === "checklist") {
            const ids = new Set(action.checked ?? []);
            checklist = h.checklist.map((i) => ({ ...i, checked: ids.has(i.id) }));
            value = checklist.filter((i) => i.checked).length;
            nextState = value === 0 ? empty : value >= h.dailyTarget ? "done" : "partial";
          } else {
            value = action.value ?? h.dailyTarget;
            nextState =
              value === 0 && h.targetOp !== "at_most" && h.evalType !== "time_of_day"
                ? empty
                : targetMet(h, value)
                  ? "done"
                  : h.evalType === "time_of_day"
                    ? h.kind === "break"
                      ? "slipped"
                      : "missed"
                    : "partial";
          }
        } else if (action.status === "slipped") nextState = "slipped";
        else if (action.status === "skipped") nextState = "skipped";
        else if (action.status === "missed") nextState = "missed";
        else nextState = empty;

        const nowComplete = nextState === "done";
        const delta = Number(nowComplete) - Number(wasComplete);
        const periodDone = isPeriod ? Math.max(0, h.periodDone + delta) : h.periodDone;
        return {
          ...h,
          state: nextState,
          value,
          checklist,
          periodDone,
          periodMet: isPeriod && periodDone >= h.periodTarget,
          logged: action.status !== "clear",
          streak: Math.max(0, h.streak + delta),
        };
      }),
    };
  };
}

function habitSection(h: BoardHabit, future: boolean, isToday: boolean): "pending" | "done" | "upcoming" | "notstarted" {
  if (future) return "upcoming";
  if (h.state === "prestart") return "notstarted";
  if (h.state === "done" || h.state === "slipped" || h.state === "skipped") return "done";
  // Today can only be "missed" by an explicit mark, so it's handled; past days stay in "Not logged".
  if (h.state === "missed" && isToday) return "done";
  if (h.state === "flex" && h.periodMet) return "done";
  return "pending";
}

export function TodayBoard({
  date,
  today,
  readOnly,
  habits,
  tasks,
  compact = false,
}: {
  date: string;
  today: string;
  readOnly: boolean;
  habits: BoardHabit[];
  tasks: BoardTask[];
  /** Hide the filter chips (used where the board is embedded, e.g. the stats page). */
  compact?: boolean;
}) {
  const future = date > today;
  const canEdit = !readOnly && !future;
  const [state, apply] = useOptimistic<State, Action>({ habits, tasks }, reduce(date, today));
  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState<string | null>(null); // null = every category
  // "All categories" can show the list grouped under category headings; tapping it again flattens it.
  const [grouped, setGrouped] = useState(false);

  const logHabit: LogFn = (id, status, value, checked) => {
    startTransition(async () => {
      apply({ type: "habit", id, status, value, checked });
      await logHabitAction({ habitId: id, date, status, value, checked });
    });
  };

  function toggleTask(id: number, done: boolean) {
    startTransition(async () => {
      apply({ type: "task", id, done });
      await toggleTaskAction({ taskId: id, date, done });
    });
  }

  function skipTask(id: number, skipped: boolean) {
    startTransition(async () => {
      apply({ type: "task_skip", id, skipped });
      await skipTaskAction({ taskId: id, date, skipped });
    });
  }

  // Categories that actually appear on this day, with how many items each holds.
  const categoryChips = useMemo(() => {
    const counts = new Map<string, number>();
    const bump = (name: string | null) => counts.set(name ?? "", (counts.get(name ?? "") ?? 0) + 1);
    for (const h of state.habits) if (h.state !== "prestart") bump(h.categoryName);
    for (const t of state.tasks) bump(t.categoryName);
    const named = [...counts.entries()].filter(([n]) => n !== "").sort((a, b) => a[0].localeCompare(b[0]));
    return { named, none: counts.get("") ?? 0 };
  }, [state.habits, state.tasks]);
  // "" stands for "no category".
  const inCategory = (name: string | null) => category === null || (name ?? "") === category;

  const shownHabits = useMemo(
    () => state.habits.filter((h) => (filter === "all" || filter === h.kind) && inCategory(h.categoryName)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.habits, filter, category]
  );
  const shownTasks = (filter === "all" || filter === "tasks" ? state.tasks : []).filter((t) => inCategory(t.categoryName));

  const pendingHabits = shownHabits.filter((h) => habitSection(h, future, date === today) === "pending");
  const doneHabits = shownHabits.filter((h) => habitSection(h, future, date === today) === "done");
  const upcomingHabits = shownHabits.filter((h) => habitSection(h, future, date === today) === "upcoming");
  const notStartedHabits = shownHabits.filter((h) => habitSection(h, future, date === today) === "notstarted");
  const pendingTasks = shownTasks.filter((t) => !t.done && !t.skipped);
  const doneTasks = shownTasks.filter((t) => t.done || t.skipped);

  // Habits that haven't started yet on this date aren't part of the day's list, so they aren't counted.
  const started = state.habits.filter((h) => h.state !== "prestart");
  const counts = {
    all: started.length + state.tasks.length,
    build: started.filter((h) => h.kind === "build").length,
    break: started.filter((h) => h.kind === "break").length,
    tasks: state.tasks.length,
  };

  const useGroups = grouped && category === null && !future && !compact && categoryChips.named.length > 0;
  const groups = useGroups
    ? [...categoryChips.named.map(([name]) => name), ""].map((name) => {
        const match = (c: string | null) => (c ?? "") === name;
        const pending = [...pendingHabits.filter((h) => match(h.categoryName)).map((h) => ({ kind: "h" as const, h })), ...pendingTasks.filter((t) => match(t.categoryName)).map((t) => ({ kind: "t" as const, t }))];
        const done = [...doneHabits.filter((h) => match(h.categoryName)).map((h) => ({ kind: "h" as const, h })), ...doneTasks.filter((t) => match(t.categoryName)).map((t) => ({ kind: "t" as const, t }))];
        return { name: name || "No category", pending, done };
      }).filter((g) => g.pending.length + g.done.length > 0)
    : [];

  const pendingCount = pendingHabits.length + pendingTasks.length;
  const doneCount = doneHabits.length + doneTasks.length;
  const everythingDone = !future && pendingCount === 0 && doneCount > 0 && filter === "all";

  return (
    <div className="flex flex-col gap-4">
      {!compact && (
      <div className="flex items-center gap-2">
      <div className="scrollbar-hide -mx-4 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
        {(
          [
            { key: "all", label: "All" },
            { key: "build", label: "Build" },
            { key: "break", label: "Break" },
            { key: "tasks", label: "Tasks" },
          ] as const
        ).map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors",
              filter === f.key
                ? "border-h-brand bg-h-brand text-h-brand-fg"
                : "border-h-border bg-h-surface text-h-muted hover:text-h-fg"
            )}
          >
            {f.label}
            <span className="ml-1.5 opacity-70">{counts[f.key]}</span>
          </button>
        ))}
      </div>
      <StatusGuideButton />
      </div>
      )}


      {!compact && (categoryChips.named.length > 0) && (
        <div className="scrollbar-hide -mx-4 flex items-center gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0" aria-label="Filter by category">
          {[
            { key: null as string | null, label: "All categories", n: null as number | null },
            ...categoryChips.named.map(([name, n]) => ({ key: name as string | null, label: name, n })),
            ...(categoryChips.none > 0 ? [{ key: "" as string | null, label: "No category", n: categoryChips.none }] : []),
          ].map((c) => (
            <button
              key={c.key ?? "all"}
              type="button"
              onClick={() => {
                if (c.key === null) {
                  if (category === null) setGrouped((g) => !g);
                  else {
                    setCategory(null);
                    setGrouped(true);
                  }
                } else setCategory(c.key);
              }}
              aria-pressed={category === c.key}
              title={c.key === null ? (category === null && grouped ? "Grouped by category — tap to ungroup" : "Tap to group by category") : undefined}
              className={cn(
                "shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors",
                category === c.key
                  ? "border-h-fg bg-h-fg text-h-bg"
                  : "border-h-border bg-h-surface text-h-muted hover:text-h-fg"
              )}
            >
              {c.key === null && category === null && grouped && <Layers className="mr-1 inline h-3 w-3 align-[-1px]" />}
              {c.label}
              {c.n !== null && <span className="ml-1 opacity-60">{c.n}</span>}
            </button>
          ))}
        </div>
      )}

      {everythingDone && (
        <div className="h-card flex items-center gap-3 bg-gradient-to-r from-h-brand-soft to-h-surface p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-h-brand text-h-brand-fg">
            <PartyPopper className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-extrabold">All clear for today</p>
            <p className="text-xs text-h-muted">Everything on your list is handled. Nice work.</p>
          </div>
        </div>
      )}

      {upcomingHabits.length > 0 && (
        <Section title="Scheduled" count={upcomingHabits.length}>
          {upcomingHabits.map((h) => (
            <HabitRow key={h.id} habit={h} date={date} today={today} canEdit={false} onLog={logHabit} upcoming />
          ))}
        </Section>
      )}

      {useGroups &&
        groups.map((g) => (
          <Section key={g.name} title={g.name} count={g.pending.length + g.done.length}>
            {[...g.pending, ...g.done].map((it) =>
              it.kind === "h" ? (
                <HabitRow key={`h${it.h.id}`} habit={it.h} date={date} today={today} canEdit={canEdit} onLog={logHabit} />
              ) : (
                <TaskRow key={`t${it.t.id}`} task={it.t} canEdit={canEdit} onToggle={toggleTask} onSkip={skipTask} />
              )
            )}
          </Section>
        ))}

      {!useGroups && (pendingHabits.length > 0 || pendingTasks.length > 0) && (
        <Section title={date === today ? "To do" : "Not logged"} count={pendingCount}>
          {pendingHabits.map((h) => (
            <HabitRow key={h.id} habit={h} date={date} today={today} canEdit={canEdit} onLog={logHabit} />
          ))}
          {pendingTasks.map((t) => (
            <TaskRow key={`t${t.id}`} task={t} canEdit={canEdit} onToggle={toggleTask} onSkip={skipTask} />
          ))}
        </Section>
      )}

      {future && shownTasks.length > 0 && (
        <Section title="Tasks" count={shownTasks.length}>
          {shownTasks.map((t) => (
            <TaskRow key={`t${t.id}`} task={t} canEdit={false} onToggle={toggleTask} onSkip={skipTask} />
          ))}
        </Section>
      )}

      {!useGroups && doneCount > 0 && !future && (
        <Section title="Completed" count={doneCount} muted>
          {doneHabits.map((h) => (
            <HabitRow key={h.id} habit={h} date={date} today={today} canEdit={canEdit} onLog={logHabit} />
          ))}
          {doneTasks.map((t) => (
            <TaskRow key={`t${t.id}`} task={t} canEdit={canEdit} onToggle={toggleTask} onSkip={skipTask} />
          ))}
        </Section>
      )}

      {notStartedHabits.length > 0 && (
        <Section title="Not started yet" count={notStartedHabits.length} muted>
          <p className="-mt-1 px-1 text-[11px] leading-snug text-h-muted">
            These start later. Logging one here moves its start date back to this day.
          </p>
          {notStartedHabits.map((h) => (
            <HabitRow key={h.id} habit={h} date={date} today={today} canEdit={canEdit} onLog={logHabit} />
          ))}
        </Section>
      )}

      {counts.all > 0 && pendingCount + doneCount + upcomingHabits.length + (future ? shownTasks.length : 0) === 0 && notStartedHabits.length === 0 && (
        <p className="py-8 text-center text-sm text-h-muted">Nothing in this filter for this day.</p>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  muted,
  children,
}: {
  title: string;
  count: number;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-center gap-2 px-1 text-xs font-extrabold uppercase tracking-wider text-h-muted">
        {title}
        <span className="rounded-full bg-h-surface2 px-2 py-0.5 text-[10px]">{count}</span>
      </h3>
      <div className={cn("flex flex-col gap-2", muted && "opacity-90")}>{children}</div>
    </section>
  );
}

// --- Timer -----------------------------------------------------------------------------------

/** Re-renders every second while `active`, so a running timer's readout ticks. */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

/** The running timer for one habit on one day, shared across tabs via localStorage. */
function useHabitTimer(habitId: number, date: string) {
  const startedAt = useSyncExternalStore(
    subscribeTimers,
    () => readTimerStart(habitId, date),
    () => null
  );
  const now = useNow(startedAt !== null);
  const elapsed = startedAt === null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000));
  return { running: startedAt !== null, elapsed };
}

// --- Habit row -------------------------------------------------------------------------------

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-h-surface2">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }} />
    </div>
  );
}

/** Click-to-edit number (an amount, or minutes for timers). Enter / blur saves, Escape cancels. */
function InlineValue({
  initial,
  suffix,
  onCommit,
  onCancel,
  allowNegative = false,
}: {
  allowNegative?: boolean;
  initial: number;
  suffix: string;
  onCommit: (n: number) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(formatNumber(initial));
  function commit() {
    const n = Number(draft.replace(",", "."));
    if (Number.isFinite(n) && (allowNegative || n >= 0)) onCommit(n);
    else onCancel();
  }
  return (
    <span className="flex items-center gap-1">
      <input
        autoFocus
        value={draft}
        inputMode="decimal"
        aria-label="Value"
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") onCancel();
        }}
        className="w-16 rounded-md border border-h-brand bg-h-surface2 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-h-fg outline-none"
      />
      <span className="text-[11px] font-bold text-h-muted">{suffix}</span>
    </span>
  );
}

function GoalChip({ goal, color }: { goal: BoardGoal; color: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg bg-h-surface2 px-2 py-1.5">
      <div className="flex items-baseline justify-between gap-2 text-[10px] font-bold">
        <span className="text-h-muted">{goal.label}</span>
        <span className={cn("tabular-nums", goal.met ? "text-h-good" : "text-h-fg")}>
          {goal.current} <span className="font-medium text-h-muted">/ {goal.target}</span>
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-h-border">
        <div className="h-full rounded-full" style={{ width: `${goal.pct}%`, background: goal.met ? "var(--h-good)" : color }} />
      </div>
    </div>
  );
}

function HabitRow({
  habit: h,
  date,
  today,
  canEdit,
  onLog,
  upcoming,
}: {
  habit: BoardHabit;
  date: string;
  today: string;
  canEdit: boolean;
  onLog: LogFn;
  upcoming?: boolean;
}) {
  const hex = colorHex(h.color);
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const timer = useHabitTimer(h.id, date);

  const isBreak = h.kind === "break";
  const numeric = h.evalType === "numeric";
  const isTimer = h.evalType === "timer";
  const checklist = h.evalType === "checklist";
  const timeOfDay = h.evalType === "time_of_day";
  const measured = numeric || isTimer;
  const atMost = h.targetOp === "at_most";
  const anyAmount = h.targetOp === "any";

  const done = h.state === "done";
  const slipped = h.state === "slipped";
  const skipped = h.state === "skipped";
  const partial = h.state === "partial";
  const missed = h.state === "missed";
  const logged = done || slipped || skipped || partial || missed;
  // Numeric, timer and checklist habits are adjusted in a dialog instead of a one-tap toggle.
  const adjustable = measured || checklist || timeOfDay;
  const over = partial && atMost && measured;
  // A logged time that misses the goal shows how far off it was (the day itself counts as missed or slipped).
  const lateBy = timeOfDay && (partial || ((missed || slipped) && h.value > 0)) ? timeOffGoal(h, h.value) : null;

  // A running timer adds its live seconds on top of what's already logged.
  const liveValue = isTimer && timer.running ? h.value + timer.elapsed : h.value;
  const checkedIds = h.checklist.filter((i) => i.checked).map((i) => i.id);

  // Status colours are fixed (green done, amber partial, red slipped, purple missed, blue skipped);
  // only a day with no status yet wears the habit's own colour.
  const circleStyle = done
    ? statusStyle("done", true)
    : slipped
      ? statusStyle("slipped", true)
      : partial
        ? statusStyle("partial", false)
        : missed
          ? statusStyle("missed", false)
          : skipped
            ? statusStyle("skipped", false)
            : { background: tint(hex, 0.12), color: hex, borderColor: tint(hex, 0.35) };

  function toggleTimer() {
    if (!canEdit) return;
    if (timer.running) {
      const total = h.value + stopTimer(h.id, date);
      onLog(h.id, "done", total);
    } else if (done) {
      onLog(h.id, "clear");
    } else {
      startTimer(h.id, date);
    }
  }

  function increase() {
    if (canEdit) onLog(h.id, "done", Math.round((h.value + 1) * 100) / 100);
  }

  /** Tapping the habit's icon: adjust the amount, or cycle done -> missed -> pending for a plain tick. */
  function primaryTap() {
    if (!canEdit) return;
    if (adjustable) return setDialog(true);
    // Tap cycles: empty -> done -> slipped -> missed -> skipped -> empty. A day that only looks missed
    // (nothing logged) has no entry yet, so its next step is done.
    if (done) onLog(h.id, "slipped");
    else if (slipped) onLog(h.id, "missed");
    else if (missed) onLog(h.id, h.logged ? "skipped" : "done");
    else if (skipped) onLog(h.id, "clear");
    else onLog(h.id, "done");
  }

  function resetProgress() {
    stopTimer(h.id, date); // drop a running timer too
    onLog(h.id, "clear");
  }

  function toggleItem(id: string, on: boolean) {
    if (!canEdit) return;
    const next = on ? [...checkedIds, id] : checkedIds.filter((x) => x !== id);
    onLog(h.id, "done", undefined, next);
  }

  const carried = h.carriedFrom ? WEEKDAY_SHORT[parseIso(h.carriedFrom).getDay()] : null;

  return (
    <div className="h-card relative flex flex-col gap-2 p-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={!canEdit}
          onClick={primaryTap}
          aria-label={
            adjustable
              ? `Log progress for ${h.name}`
              : logged
                ? `Change status of ${h.name}`
                : `Mark ${h.name} done`
          }
          style={circleStyle}
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 transition-transform",
            canEdit && "active:scale-90",
            !canEdit && "cursor-default"
          )}
        >
          {done ? (
            <Check key="c" className="habit-pop h-6 w-6" strokeWidth={3} />
          ) : slipped || missed ? (
            <X className="habit-pop h-6 w-6" strokeWidth={3} />
          ) : skipped ? (
            <SkipForward className="h-5 w-5" />
          ) : checklist ? (
            <ListChecks className="h-5 w-5" />
          ) : (
            <HabitIcon name={h.icon} className="h-5 w-5" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <Link href={`/habits/${h.id}`} className="group flex items-center gap-1">
            <span
              className={cn(
                "break-words text-sm font-bold leading-snug",
                (done || skipped) && "text-h-muted line-through decoration-h-muted/50"
              )}
            >
              {h.name}
            </span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-h-muted opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium text-h-muted">
            <span
              className="rounded-md px-1.5 py-px font-bold"
              style={
                isBreak
                  ? { background: "var(--h-break-soft)", color: "var(--h-break)" }
                  : { background: "var(--h-brand-soft)", color: "var(--h-brand)" }
              }
            >
              {isBreak ? "Break" : "Build"}
            </span>
            {h.priority > 0 && (
              <span className="rounded-md bg-h-surface2 px-1.5 py-px font-bold text-h-fg" title={`Priority ${h.priority}`}>
                P{h.priority}
              </span>
            )}
            {h.categoryName && <span>{h.categoryName}</span>}
            {h.lifeGoal && (
              <Link
                href={`/goals/${h.lifeGoal.id}`}
                title={`Contributes to the goal: ${h.lifeGoal.title}`}
                className="inline-flex max-w-40 items-center gap-1 truncate rounded-md px-1.5 py-px font-bold"
                style={{ background: tint(colorHex(h.lifeGoal.color), 0.14), color: colorHex(h.lifeGoal.color) }}
              >
                <Target className="h-3 w-3 shrink-0" />
                <span className="truncate">{h.lifeGoal.title}</span>
              </Link>
            )}
            {h.schedule === "weekly_count" ? (
              <span className={cn(h.periodMet && "font-bold text-h-good")}>
                {h.periodDone}/{h.periodTarget} this {h.periodUnit}
              </span>
            ) : (
              h.schedule !== "daily" && <span>{h.scheduleLabel}</span>
            )}
            {h.state === "prestart" && (
              <span className="font-bold text-h-muted">
                Starts {parseIso(h.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
            {carried && (
              <span className="flex items-center gap-0.5 font-bold text-h-break">
                <CornerDownRight className="h-3 w-3" />
                From {carried}
              </span>
            )}
            {h.streak > 0 && (
              <span className="flex items-center gap-0.5 font-bold text-h-break">
                <Flame className="h-3 w-3" />
                {h.streak}
                {STREAK_UNIT_SHORT[h.streakUnit]}
              </span>
            )}
            {h.state === "missed" && !lateBy && <span className="font-bold" style={{ color: STATUS_COLOR.missed }}>Missed</span>}
            {over && <span className="font-bold" style={{ color: STATUS_COLOR.partial }}>Over limit</span>}
            {lateBy && (
              <span className="font-bold" style={{ color: STATUS_COLOR.partial }}>
                {lateBy.kind === "late" ? `Late by ${formatDuration(lateBy.minutes * 60)}` : lateBy.kind === "early" ? `${formatDuration(lateBy.minutes * 60)} too early` : "Off the goal time"}
              </span>
            )}
          </div>

          {timeOfDay && !upcoming && (
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => setDialog(true)}
              title="Tap to log the time"
              className={cn("mt-2 whitespace-nowrap text-[11px] font-bold tabular-nums", "text-h-muted", canEdit && "rounded-md hover:text-h-fg")}
            >
              {done || partial || ((missed || slipped) && h.value > 0) ? formatTimeOfDay(h.value) : "Not logged"}
              {h.targetLabel && <span className="font-medium"> / {h.targetLabel}</span>}
            </button>
          )}

          {measured && !upcoming && (
            <div className="mt-2 flex items-center gap-2">
              {!anyAmount && (
                <ProgressBar
                  pct={h.dailyTarget > 0 ? (liveValue / h.dailyTarget) * 100 : 0}
                  color={over || (atMost && liveValue > h.dailyTarget) ? STATUS_COLOR.partial : hex}
                />
              )}
              {editing && canEdit ? (
                <InlineValue
                  initial={isTimer ? Math.round(liveValue / 60) : liveValue}
                  suffix={isTimer ? "min" : (h.unit ?? "")}
                  allowNegative={numeric}
                  onCancel={() => setEditing(false)}
                  onCommit={(n) => {
                    setEditing(false);
                    onLog(h.id, "done", isTimer ? Math.round(n * 60) : n);
                  }}
                />
              ) : (
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setEditing(true)}
                  title="Tap to enter a value"
                  className={cn(
                    "whitespace-nowrap text-[11px] font-bold tabular-nums text-h-muted",
                    canEdit && "rounded-md px-1 hover:bg-h-surface2 hover:text-h-fg"
                  )}
                >
                  {isTimer ? (
                    <span className={cn(timer.running && "text-h-brand")}>{formatClock(liveValue)}</span>
                  ) : (
                    <>
                      {formatNumber(h.value)}
                      {h.unit ? ` ${h.unit}` : ""}
                    </>
                  )}
                  {!anyAmount && h.targetLabel && <span className="font-medium"> / {h.targetLabel}</span>}
                </button>
              )}
            </div>
          )}

          {checklist && !upcoming && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="mt-2 flex w-full items-center gap-2"
            >
              <ProgressBar pct={h.dailyTarget > 0 ? (h.value / h.dailyTarget) * 100 : 0} color={hex} />
              <span className="flex items-center gap-0.5 whitespace-nowrap text-[11px] font-bold tabular-nums text-h-muted">
                {h.value}/{h.dailyTarget}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
              </span>
            </button>
          )}
        </div>

        {canEdit && (
          <div className="flex shrink-0 items-center gap-1">
            {numeric && (
              <button
                type="button"
                aria-label="Decrease"
                onClick={() => onLog(h.id, "done", Math.round((h.value - 1) * 100) / 100)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-h-surface2 text-h-muted disabled:opacity-40"
              >
                <Minus className="h-4 w-4" />
              </button>
            )}
            {numeric && (
              <button
                type="button"
                aria-label="Increase"
                onClick={increase}
                style={{ background: tint(hex, 0.14), color: hex }}
                className="flex h-8 w-8 items-center justify-center rounded-full"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
              </button>
            )}
            {isTimer && date === today && (
              <button
                type="button"
                aria-label={timer.running ? `Pause ${h.name}` : `Start ${h.name}`}
                onClick={toggleTimer}
                style={timer.running ? { background: hex, color: "#fff" } : { background: tint(hex, 0.14), color: hex }}
                className="flex h-8 w-8 items-center justify-center rounded-full"
              >
                {timer.running ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
              </button>
            )}
            {numeric && atMost && !logged && h.value === 0 && (
              <button
                type="button"
                onClick={() => onLog(h.id, "done", 0)}
                className="rounded-full bg-h-good/15 px-2.5 py-1 text-[11px] font-bold text-h-good transition-colors hover:bg-h-good/25"
              >
                None
              </button>
            )}
            <div className="relative">
              <button
                type="button"
                aria-label="More"
                onClick={() => setMenu((v) => !v)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-h-muted hover:bg-h-surface2"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
                  <div className="habit-sheet-in absolute right-0 top-9 z-50 w-44 rounded-xl border border-h-border bg-h-surface p-1 shadow-xl">
                    {!skipped && (
                      <MenuItem
                        icon={SkipForward}
                        label={date === today ? "Skip today" : "Skip this day"}
                        onClick={() => {
                          setMenu(false);
                          onLog(h.id, "skipped");
                        }}
                      />
                    )}
                    {isBreak && !slipped && (
                      <MenuItem
                        icon={Ban}
                        label="Mark slipped"
                        danger
                        onClick={() => {
                          setMenu(false);
                          onLog(h.id, "slipped");
                        }}
                      />
                    )}
                    {!isBreak && !missed && (
                      <MenuItem
                        icon={X}
                        label="Mark missed"
                        danger
                        onClick={() => {
                          setMenu(false);
                          stopTimer(h.id, date);
                          onLog(h.id, "missed");
                        }}
                      />
                    )}
                    {(logged || timer.running) && (
                      <MenuItem
                        icon={RotateCcw}
                        label="Reset progress"
                        onClick={() => {
                          setMenu(false);
                          setConfirmReset(true);
                        }}
                      />
                    )}
                    <Link
                      href={`/habits/${h.id}`}
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold hover:bg-h-surface2"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                      Details & history
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {checklist && expanded && !upcoming && (
        <ul className="flex flex-col gap-0.5 rounded-xl bg-h-surface2 p-1.5">
          {h.checklist.map((item) => (
            <li key={item.id}>
              <label className={cn("flex items-center gap-3 rounded-lg px-2 py-2", canEdit ? "cursor-pointer hover:bg-h-surface" : "cursor-default")}>
                <Checkbox
                  color={hex}
                  checked={item.checked}
                  disabled={!canEdit}
                  onCheckedChange={(c) => toggleItem(item.id, c === true)}
                />
                <span className={cn("text-sm font-semibold", item.checked && "text-h-muted line-through")}>{item.title}</span>
              </label>
            </li>
          ))}
        </ul>
      )}

      {h.goals.length > 0 && !upcoming && (
        <div className={cn("grid gap-1.5", h.goals.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
          {h.goals.map((g) => (
            <GoalChip key={g.label} goal={g} color={hex} />
          ))}
        </div>
      )}

      {dialog && (
        <ProgressDialog
          name={h.name}
          dateLabel={parseIso(date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          color={h.color}
          spec={{ evalType: h.evalType, targetOp: h.targetOp, dailyTarget: h.dailyTarget, unit: h.unit, checklist: h.checklist }}
          initialValue={checklist ? 0 : liveValue}
          initialChecked={checkedIds}
          onClose={() => setDialog(false)}
          onSave={({ value, checked }) => {
            stopTimer(h.id, date); // the entered time replaces a running timer
            onLog(h.id, "done", value, checked);
          }}
          breakHabit={isBreak}
          onMissed={() => {
            stopTimer(h.id, date);
            onLog(h.id, isBreak ? "slipped" : "missed");
          }}
          onSkip={() => {
            stopTimer(h.id, date);
            onLog(h.id, "skipped");
          }}
          onReset={resetProgress}
        />
      )}

      {confirmReset && (
        <ConfirmDialog
          title="Reset progress?"
          message={`This clears everything logged for ${h.name} on ${parseIso(date).toLocaleDateString("en-US", { month: "long", day: "numeric" })}. You can't undo it.`}
          confirmLabel="Reset"
          onClose={() => setConfirmReset(false)}
          onConfirm={resetProgress}
        />
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold hover:bg-h-surface2",
        danger && "text-h-bad"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

// --- Task row --------------------------------------------------------------------------------

export function TaskRow({
  task: t,
  canEdit,
  onToggle,
  onSkip,
}: {
  task: BoardTask;
  canEdit: boolean;
  onToggle: (id: number, done: boolean) => void;
  /** Set a repeating task aside for this day (or bring it back). */
  onSkip?: (id: number, skipped: boolean) => void;
}) {
  const pr = PRIORITY_META[t.priority];
  return (
    <div className="h-card flex items-center gap-3 p-3">
      <button
        type="button"
        disabled={!canEdit}
        onClick={() => onToggle(t.id, !t.done)}
        aria-label={t.done ? `Undo ${t.title}` : `Complete ${t.title}`}
        style={t.done ? { background: "var(--h-brand)", borderColor: "var(--h-brand)" } : t.skipped ? statusStyle("skipped", false) : { borderColor: pr.color }}
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          !canEdit && "cursor-default"
        )}
      >
        {t.done && <Check className="habit-pop h-3.5 w-3.5 text-h-brand-fg" strokeWidth={3.5} />}
        {t.skipped && <SkipForward className="h-3 w-3" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("line-clamp-3 break-words text-sm font-bold leading-tight", t.done && "text-h-muted line-through", t.skipped && "text-h-muted")}>
          {t.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium text-h-muted">
          <span className="rounded-md bg-h-surface2 px-1.5 py-px font-bold">Task</span>
          {t.recurring && (
            <span className="flex items-center gap-0.5">
              <Repeat className="h-3 w-3" />
              {t.recurrenceLabel}
            </span>
          )}
          {t.categoryName && <span>{t.categoryName}</span>}
          {t.skipped && (
            <span className="flex items-center gap-0.5 font-bold" style={{ color: STATUS_COLOR.skipped }}>
              <SkipForward className="h-3 w-3" />
              Skipped today
            </span>
          )}
          {t.overdue && (
            <span className="flex items-center gap-0.5 font-bold text-h-bad">
              <AlarmClock className="h-3 w-3" />
              Overdue
            </span>
          )}
          <span className="flex items-center gap-1" title={`${pr.label} priority`}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: pr.color }} />
            {pr.label}
          </span>
        </div>
      </div>
      {t.recurring && onSkip && canEdit && !t.done && (
        <button
          type="button"
          onClick={() => onSkip(t.id, !t.skipped)}
          aria-label={t.skipped ? `Bring back ${t.title} today` : `Skip ${t.title} today`}
          title={t.skipped ? "Bring it back for today" : "Skip for today"}
          className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-h-surface2 px-2.5 text-[11px] font-bold text-h-muted hover:text-h-fg"
        >
          {t.skipped ? <Undo2 className="h-3.5 w-3.5" /> : <SkipForward className="h-3.5 w-3.5" />}
          {t.skipped ? "Undo" : "Skip"}
        </button>
      )}
    </div>
  );
}
