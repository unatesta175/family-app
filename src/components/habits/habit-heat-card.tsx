import Link from "next/link";
import { Flame } from "lucide-react";
import { HabitIcon } from "@/components/habits/habit-icon";
import { MONTH_SHORT, STATUS_COLOR, STREAK_UNIT_SHORT, colorHex, tint, type DayState, type StreakResult } from "@/lib/habits";
import type { HeatCell } from "@/lib/habit-stats";
import { parseIso } from "@/lib/date";

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""]; // Sunday first, like the grid

const TODAY_LABEL: Partial<Record<DayState, { text: string; color: string | null }>> = {
  done: { text: "Done today", color: STATUS_COLOR.done },
  partial: { text: "In progress", color: STATUS_COLOR.partial },
  slipped: { text: "Slipped", color: STATUS_COLOR.slipped },
  missed: { text: "Missed", color: STATUS_COLOR.missed },
  skipped: { text: "Skipped", color: STATUS_COLOR.skipped },
  pending: { text: "Due today", color: STATUS_COLOR.pending },
};

function cellStyle(state: DayState): React.CSSProperties {
  switch (state) {
    case "done":
      return { background: STATUS_COLOR.done };
    case "partial":
      return { background: STATUS_COLOR.partial };
    case "slipped":
      return { background: STATUS_COLOR.slipped };
    case "missed":
      return { background: STATUS_COLOR.missed };
    case "skipped":
      return { background: STATUS_COLOR.skipped };
    case "pending":
    case "flex":
      return { background: "var(--h-surface)", boxShadow: `inset 0 0 0 1.5px ${STATUS_COLOR.pending}` };
    case "upcoming":
      return { background: "transparent", boxShadow: "inset 0 0 0 1px var(--h-border)" };
    default:
      return { background: "color-mix(in srgb, var(--h-surface-2) 70%, transparent)" };
  }
}

/**
 * One habit as a card: its name and streak, today's status, and a GitHub-style grid of the last
 * weeks, one square per day in the shared status colours. Pure markup, renders on the server.
 */
export function HabitHeatCard({
  id,
  name,
  icon,
  color,
  kind,
  weeks,
  streak,
  today,
}: {
  id: number;
  name: string;
  icon: string;
  color: string;
  kind: "build" | "break";
  weeks: HeatCell[][];
  streak: StreakResult;
  today: string;
}) {
  const hex = colorHex(color);
  const cells = weeks.flat();
  const done = cells.filter((c) => c.state === "done").length;
  const judged = cells.filter((c) => ["done", "partial", "missed", "slipped"].includes(c.state)).length;
  const rate = judged === 0 ? null : Math.round((done / judged) * 100);
  const todayState = cells.find((c) => c.date === today)?.state;
  const todayInfo = todayState ? TODAY_LABEL[todayState] : undefined;

  // A month label above the first week that starts in a new month.
  const months = weeks.map((col, i) => {
    const m = parseIso(col[0].date).getMonth();
    const prev = i > 0 ? parseIso(weeks[i - 1][0].date).getMonth() : -1;
    return m !== prev ? MONTH_SHORT[m] : "";
  });

  return (
    <Link href={`/habits/${id}`} className="h-card flex min-w-0 flex-col gap-3 overflow-hidden p-3.5 transition-shadow hover:shadow-md sm:p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: tint(hex, 0.15), color: hex }}>
          <HabitIcon name={icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold leading-tight">{name}</p>
          <p className="mt-0.5 flex items-center gap-2 text-[11px] font-semibold text-h-muted">
            <span className={kind === "break" ? "text-h-break" : "text-h-brand"}>{kind === "break" ? "Break" : "Build"}</span>
            {todayInfo && (
              <span className="flex items-center gap-1">
                {todayInfo.color && <span className="h-1.5 w-1.5 rounded-full" style={{ background: todayInfo.color }} />}
                {todayInfo.text}
              </span>
            )}
          </p>
        </div>
        <span
          className="flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1 text-sm font-extrabold tabular-nums"
          style={streak.current > 0 ? { background: tint("#f59e0b", 0.16), color: "#d97706" } : { background: "var(--h-surface-2)", color: "var(--h-muted)" }}
          title="Current streak"
        >
          <Flame className="h-4 w-4" />
          {streak.current}
          <span className="text-[10px] font-bold opacity-70">{STREAK_UNIT_SHORT[streak.unit]}</span>
        </span>
      </div>

      <div className="flex min-w-0 gap-1.5">
        <div className="grid shrink-0 grid-rows-[auto_repeat(7,1fr)] gap-[2px] sm:gap-[3px] text-[9px] font-semibold leading-none text-h-muted">
          <span className="h-3" />
          {DAY_LABELS.map((d, i) => (
            <span key={i} className="flex items-center">
              {d}
            </span>
          ))}
        </div>
        <div className="grid min-w-0 flex-1 gap-[2px] sm:gap-[3px]" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
          {months.map((m, i) => (
            <span key={`m${i}`} className="h-3 overflow-visible whitespace-nowrap text-[9px] font-semibold leading-none text-h-muted">
              {m}
            </span>
          ))}
          {Array.from({ length: 7 }, (_, row) =>
            weeks.map((col, i) => {
              const c = col[row];
              return (
                <span
                  key={c.date}
                  title={`${c.date} · ${c.state}`}
                  style={{ ...cellStyle(c.state), gridColumn: i + 1, gridRow: row + 2 }}
                  className={`aspect-square rounded-[2px] sm:rounded-[3px] ${c.date === today ? "ring-2 ring-h-fg/70 ring-offset-1 ring-offset-h-surface" : ""}`}
                />
              );
            })
          )}
        </div>
      </div>

      <p className="text-[11px] font-medium text-h-muted">
        <span className="font-extrabold text-h-fg">{done}</span> {kind === "break" ? "clean" : "done"} in {weeks.length} weeks
        {rate !== null && (
          <>
            {" · "}
            <span className="font-extrabold text-h-fg">{rate}%</span> success
          </>
        )}
        {streak.best > streak.current && (
          <>
            {" · "}best <span className="font-extrabold text-h-fg">{streak.best}</span>
            {STREAK_UNIT_SHORT[streak.unit]}
          </>
        )}
      </p>
    </Link>
  );
}
