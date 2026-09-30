"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import {
  Ban,
  Check,
  ChevronRight,
  Flame,
  MoreHorizontal,
  Minus,
  Plus,
  Repeat,
  SkipForward,
  Undo2,
  X,
  PartyPopper,
  AlarmClock,
} from "lucide-react";
import { logHabitAction, toggleTaskAction } from "@/lib/habit-actions";
import { colorHex, PRIORITY_META, tint, type DayState } from "@/lib/habits";
import { HabitIcon } from "@/components/habits/habit-icon";
import type { BoardHabit, BoardTask } from "@/lib/habit-board";
import { cn } from "@/lib/utils";

type Filter = "all" | "build" | "break" | "tasks";
type HabitStatus = "done" | "slipped" | "skipped" | "clear";

type Action =
  | { type: "habit"; id: number; status: HabitStatus; value?: number }
  | { type: "task"; id: number; done: boolean };

type State = { habits: BoardHabit[]; tasks: BoardTask[] };

function isComplete(h: BoardHabit) {
  return h.state === "done";
}

function reduce(date: string, today: string) {
  return (state: State, action: Action): State => {
    if (action.type === "task") {
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.id ? { ...t, done: action.done } : t)),
      };
    }
    return {
      ...state,
      habits: state.habits.map((h) => {
        if (h.id !== action.id) return h;
        const wasComplete = isComplete(h);
        let nextState: DayState;
        let value = 0;
        if (action.status === "done") {
          value = action.value ?? h.dailyTarget;
          nextState = value >= h.dailyTarget ? "done" : "partial";
        } else if (action.status === "slipped") nextState = "slipped";
        else if (action.status === "skipped") nextState = "skipped";
        else nextState = h.schedule === "weekly_count" ? "flex" : date === today ? "pending" : "missed";
        const nowComplete = nextState === "done";
        const delta = Number(nowComplete) - Number(wasComplete);
        const weekDone = h.schedule === "weekly_count" ? Math.max(0, h.weekDone + delta) : h.weekDone;
        return {
          ...h,
          state: nextState,
          value,
          weekDone,
          weekMet: h.schedule === "weekly_count" && weekDone >= h.weeklyTarget,
          streak: Math.max(0, h.streak + delta),
        };
      }),
    };
  };
}

function habitSection(h: BoardHabit, future: boolean): "pending" | "done" | "upcoming" {
  if (future) return "upcoming";
  if (h.state === "done" || h.state === "slipped" || h.state === "skipped") return "done";
  if (h.state === "flex" && h.weekMet) return "done";
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

  function logHabit(id: number, status: HabitStatus, value?: number) {
    startTransition(async () => {
      apply({ type: "habit", id, status, value });
      await logHabitAction({ habitId: id, date, status, value });
    });
  }

  function toggleTask(id: number, done: boolean) {
    startTransition(async () => {
      apply({ type: "task", id, done });
      await toggleTaskAction({ taskId: id, date, done });
    });
  }

  const shownHabits = useMemo(
    () => state.habits.filter((h) => filter === "all" || filter === h.kind),
    [state.habits, filter]
  );
  const shownTasks = filter === "all" || filter === "tasks" ? state.tasks : [];

  const pendingHabits = shownHabits.filter((h) => habitSection(h, future) === "pending");
  const doneHabits = shownHabits.filter((h) => habitSection(h, future) === "done");
  const upcomingHabits = shownHabits.filter((h) => habitSection(h, future) === "upcoming");
  const pendingTasks = shownTasks.filter((t) => !t.done);
  const doneTasks = shownTasks.filter((t) => t.done);

  const counts = {
    all: state.habits.length + state.tasks.length,
    build: state.habits.filter((h) => h.kind === "build").length,
    break: state.habits.filter((h) => h.kind === "break").length,
    tasks: state.tasks.length,
  };

  const pendingCount = pendingHabits.length + pendingTasks.length;
  const doneCount = doneHabits.length + doneTasks.length;
  const everythingDone = !future && pendingCount === 0 && doneCount > 0 && filter === "all";

  return (
    <div className="flex flex-col gap-4">
      {!compact && (
      <div className="scrollbar-hide -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
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
            <HabitRow key={h.id} habit={h} canEdit={false} onLog={logHabit} upcoming />
          ))}
        </Section>
      )}

      {(pendingHabits.length > 0 || pendingTasks.length > 0) && (
        <Section title={date === today ? "To do" : "Not logged"} count={pendingCount}>
          {pendingHabits.map((h) => (
            <HabitRow key={h.id} habit={h} canEdit={canEdit} onLog={logHabit} />
          ))}
          {pendingTasks.map((t) => (
            <TaskRow key={`t${t.id}`} task={t} canEdit={canEdit} onToggle={toggleTask} />
          ))}
        </Section>
      )}

      {future && shownTasks.length > 0 && (
        <Section title="Tasks" count={shownTasks.length}>
          {shownTasks.map((t) => (
            <TaskRow key={`t${t.id}`} task={t} canEdit={false} onToggle={toggleTask} />
          ))}
        </Section>
      )}

      {doneCount > 0 && !future && (
        <Section title="Completed" count={doneCount} muted>
          {doneHabits.map((h) => (
            <HabitRow key={h.id} habit={h} canEdit={canEdit} onLog={logHabit} />
          ))}
          {doneTasks.map((t) => (
            <TaskRow key={`t${t.id}`} task={t} canEdit={canEdit} onToggle={toggleTask} />
          ))}
        </Section>
      )}

      {counts.all > 0 && pendingCount + doneCount + upcomingHabits.length + (future ? shownTasks.length : 0) === 0 && (
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

// --- Habit row -------------------------------------------------------------------------------

function HabitRow({
  habit: h,
  canEdit,
  onLog,
  upcoming,
}: {
  habit: BoardHabit;
  canEdit: boolean;
  onLog: (id: number, status: HabitStatus, value?: number) => void;
  upcoming?: boolean;
}) {
  const hex = colorHex(h.color);
  const [menu, setMenu] = useState(false);
  const isBreak = h.kind === "break";
  const counter = h.dailyTarget > 1;
  const done = h.state === "done";
  const slipped = h.state === "slipped";
  const skipped = h.state === "skipped";
  const logged = done || slipped || skipped || h.state === "partial";

  const circleStyle = done
    ? { background: hex, color: "#fff", borderColor: hex }
    : slipped
      ? { background: "var(--h-bad)", color: "#fff", borderColor: "var(--h-bad)" }
      : { background: tint(hex, 0.12), color: hex, borderColor: tint(hex, 0.35) };

  function primaryTap() {
    if (!canEdit) return;
    if (counter) {
      onLog(h.id, "done", Math.min(h.dailyTarget, h.value + 1));
      return;
    }
    if (done || slipped || skipped) onLog(h.id, "clear");
    else onLog(h.id, "done");
  }

  return (
    <div className="h-card relative flex items-center gap-3 p-3">
      <button
        type="button"
        disabled={!canEdit}
        onClick={primaryTap}
        aria-label={done ? `Undo ${h.name}` : `Mark ${h.name} done`}
        style={circleStyle}
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 transition-transform",
          canEdit && "active:scale-90",
          !canEdit && "cursor-default"
        )}
      >
        {done ? (
          <Check key="c" className="habit-pop h-6 w-6" strokeWidth={3} />
        ) : slipped ? (
          <X className="habit-pop h-6 w-6" strokeWidth={3} />
        ) : skipped ? (
          <SkipForward className="h-5 w-5" />
        ) : (
          <HabitIcon name={h.icon} className="h-5 w-5" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <Link href={`/habits/${h.id}`} className="group flex items-center gap-1">
          <span
            className={cn(
              "truncate text-sm font-bold leading-tight",
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
          {h.categoryName && <span>{h.categoryName}</span>}
          {h.schedule === "weekly_count" ? (
            <span className={cn(h.weekMet && "font-bold text-h-good")}>
              {h.weekDone}/{h.weeklyTarget} this week
            </span>
          ) : (
            h.schedule === "weekdays" && <span>{h.scheduleLabel}</span>
          )}
          {h.streak > 0 && (
            <span className="flex items-center gap-0.5 font-bold text-h-break">
              <Flame className="h-3 w-3" />
              {h.streak}
              {h.streakUnit === "week" ? "w" : "d"}
            </span>
          )}
          {h.state === "missed" && <span className="font-bold text-h-bad">Missed</span>}
        </div>

        {counter && !upcoming && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-h-surface2">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (h.value / h.dailyTarget) * 100)}%`, background: hex }}
              />
            </div>
            <span className="text-[11px] font-bold tabular-nums text-h-muted">
              {h.value}/{h.dailyTarget}
              {h.unit ? ` ${h.unit}` : ""}
            </span>
          </div>
        )}
      </div>

      {canEdit && (
        <div className="flex shrink-0 items-center gap-1">
          {counter && !done && h.value > 0 && (
            <button
              type="button"
              aria-label="Decrease"
              onClick={() => onLog(h.id, "done", h.value - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-h-surface2 text-h-muted"
            >
              <Minus className="h-4 w-4" />
            </button>
          )}
          {counter && !done && (
            <button
              type="button"
              aria-label="Increase"
              onClick={primaryTap}
              style={{ background: tint(hex, 0.14), color: hex }}
              className="flex h-8 w-8 items-center justify-center rounded-full"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            </button>
          )}
          {isBreak && !logged && (
            <button
              type="button"
              onClick={() => onLog(h.id, "done")}
              className="rounded-full bg-h-good/15 px-2.5 py-1 text-[11px] font-bold text-h-good transition-colors hover:bg-h-good/25"
            >
              Clean
            </button>
          )}
          {isBreak && !logged && (
            <button
              type="button"
              onClick={() => onLog(h.id, "slipped")}
              className="rounded-full border border-h-border px-2.5 py-1 text-[11px] font-bold text-h-bad transition-colors hover:bg-h-bad/10"
            >
              Slipped
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
                      label="Skip today"
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
                  {logged && (
                    <MenuItem
                      icon={Undo2}
                      label="Clear entry"
                      onClick={() => {
                        setMenu(false);
                        onLog(h.id, "clear");
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
}: {
  task: BoardTask;
  canEdit: boolean;
  onToggle: (id: number, done: boolean) => void;
}) {
  const pr = PRIORITY_META[t.priority];
  return (
    <div className="h-card flex items-center gap-3 p-3">
      <button
        type="button"
        disabled={!canEdit}
        onClick={() => onToggle(t.id, !t.done)}
        aria-label={t.done ? `Undo ${t.title}` : `Complete ${t.title}`}
        style={t.done ? { background: "var(--h-brand)", borderColor: "var(--h-brand)" } : { borderColor: pr.color }}
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          !canEdit && "cursor-default"
        )}
      >
        {t.done && <Check className="habit-pop h-3.5 w-3.5 text-h-brand-fg" strokeWidth={3.5} />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-bold leading-tight", t.done && "text-h-muted line-through")}>
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
    </div>
  );
}
