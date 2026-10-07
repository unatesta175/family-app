import { FocusTree } from "@/components/focus/focus-tree";
import { formatFocus, type SessionLite } from "@/lib/focus";

export type HabitNames = Map<number, string>;

const clockLabel = (ms: number) => new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/** Sessions in the order they were started, with their length, what they were for and whether the tree grew. */
export function SessionList({ sessions, names }: { sessions: SessionLite[]; names: HabitNames }) {
  const done = sessions.filter((s) => s.status !== "active");
  if (done.length === 0) return null;
  return (
    <ul className="flex flex-col divide-y divide-h-border overflow-hidden rounded-2xl border border-h-border bg-h-surface">
      {done.map((s) => (
        <li key={s.id} className="flex items-center gap-3 px-3 py-2.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-lime-100 to-emerald-100 [.dark_&]:from-[#17301f] [.dark_&]:to-[#10261a]">
            <FocusTree progress={s.status === "completed" ? 1 : Math.max(0.25, s.focusedSeconds / s.plannedSeconds)} species={s.species} withered={s.status === "withered"} animate={false} className="h-10 w-10" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-tight">{s.habitId ? (names.get(s.habitId) ?? "Habit") : "Focus session"}</p>
            <p className="text-[11px] text-h-muted">
              {new Date(s.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {clockLabel(s.startedAt)} · {s.status === "completed" ? "grown" : `withered after ${formatFocus(s.focusedSeconds)}`}
            </p>
          </div>
          <span className="shrink-0 text-sm font-extrabold tabular-nums">{formatFocus(s.status === "completed" ? s.plannedSeconds : s.focusedSeconds)}</span>
        </li>
      ))}
    </ul>
  );
}
