import { FocusTree } from "@/components/focus/focus-tree";
import { formatClockTime, formatFocus, sessionTrees, tierInfo, type SessionLite } from "@/lib/focus";

export type HabitNames = Map<number, string>;

/** Sessions in the order they were started, with their length, what they were for and the trees they grew. */
export function SessionList({ sessions, names, tz }: { sessions: SessionLite[]; names: HabitNames; tz: number }) {
  const done = sessions.filter((s) => s.status !== "active");
  if (done.length === 0) return null;
  return (
    <ul className="flex flex-col divide-y divide-h-border overflow-hidden rounded-2xl border border-h-border bg-h-surface">
      {done.map((s) => {
        const trees = sessionTrees(s);
        const grown = trees.filter((t) => t.grown);
        // The headline tree: the biggest grown block, or the stump if nothing finished.
        const lead = grown.reduce((m, t) => (t.tier > m.tier ? t : m), grown[0] ?? trees[0]);
        const multi = trees.length > 1;
        const detail = s.status === "completed"
          ? multi
            ? `${grown.length} ${tierInfo(lead.tier).name.toLowerCase()}${grown.length === 1 ? "" : "s"}`
            : tierInfo(lead.tier).name.toLowerCase()
          : grown.length > 0
            ? `${grown.length} grown · withered after ${formatFocus(s.focusedSeconds)}`
            : `withered after ${formatFocus(s.focusedSeconds)}`;
        return (
          <li key={s.id} className="flex items-center gap-3 px-3 py-2.5">
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-lime-100 to-emerald-100 [.dark_&]:from-[#17301f] [.dark_&]:to-[#10261a]">
              <FocusTree progress={lead?.grown ? 1 : Math.max(0.25, s.focusedSeconds / s.plannedSeconds)} species={s.species} tier={lead?.tier ?? 1} withered={!lead?.grown && s.status === "withered"} animate={false} className="h-10 w-10" />
              {multi && <span className="absolute bottom-0 right-0 rounded-tl-md bg-h-brand px-1 text-[9px] font-extrabold leading-tight text-h-brand-fg">×{trees.length}</span>}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold leading-tight">{s.habitId ? (names.get(s.habitId) ?? "Habit") : "Focus session"}</p>
              <p className="text-[11px] text-h-muted">
                {new Date(s.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {formatClockTime(s.startedAt, tz)} · {detail}
              </p>
            </div>
            <span className="shrink-0 text-sm font-extrabold tabular-nums">{formatFocus(s.status === "completed" ? s.plannedSeconds : s.focusedSeconds)}</span>
          </li>
        );
      })}
    </ul>
  );
}
