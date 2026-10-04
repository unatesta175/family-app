import Link from "next/link";
import { CalendarClock, Users } from "lucide-react";
import { colorHex } from "@/lib/habits";
import { shortDate } from "@/lib/goals";
import type { GoalView } from "@/lib/goal-data";
import { EffortBadge, ForecastBadge, GoalTile, NudgeDot, ProgressBar, StatusBadge } from "@/components/goals/goal-parts";

/** One goal as a card: image, title, progress, forecast and the little badges. Pure markup. */
export function GoalCard({ view }: { view: GoalView }) {
  const { goal, info, forecast } = view;
  const hex = colorHex(goal.color);
  return (
    <Link href={`/goals/${goal.id}`} className="h-card group flex flex-col gap-3 overflow-hidden p-4 transition-shadow hover:shadow-lg">
      {goal.imageData && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={goal.imageData} alt="" className="-mx-4 -mt-4 h-28 w-[calc(100%+2rem)] max-w-none object-cover" />
      )}
      <div className="flex items-start gap-3">
        <GoalTile icon={goal.icon} color={goal.color} />
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-extrabold leading-snug">{goal.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={goal.status} />
            <span className="text-[11px] font-semibold text-h-muted">{goal.area}</span>
            {goal.visibility === "shared" && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-h-muted">
                <Users className="h-3 w-3" />
                {view.mine ? "Shared" : view.ownerName}
              </span>
            )}
          </div>
        </div>
        <span className="text-lg font-extrabold tabular-nums leading-none" style={{ color: info.pct >= 100 ? "var(--h-good)" : hex }}>
          {Math.round(info.pct)}%
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <ProgressBar pct={info.pct} color={goal.color} />
        <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-h-muted">
          <span className="truncate">{info.label}</span>
          {goal.targetDate && (
            <span className="inline-flex shrink-0 items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              {shortDate(goal.targetDate)}
            </span>
          )}
        </div>
      </div>

      {(goal.status === "active" || view.nudges.length > 0 || view.effortWeeks > 0) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {goal.status === "active" && <ForecastBadge forecast={forecast} />}
          <EffortBadge weeks={view.effortWeeks} />
          <NudgeDot count={view.nudges.length} />
        </div>
      )}
    </Link>
  );
}
