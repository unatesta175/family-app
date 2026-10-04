import Link from "next/link";
import { ArrowRight, Target } from "lucide-react";
import type { GoalView } from "@/lib/goal-data";
import { shortDate } from "@/lib/goals";
import { GoalTile, ProgressBar } from "@/components/goals/goal-parts";

/** What the goal needs next: its next dated milestone, or a nudge towards the way it is tracked. */
function nextStep(v: GoalView): string {
  const open = v.milestones.filter((m) => !m.doneAt);
  const dated = open.filter((m) => m.dueDate).sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))[0];
  if (dated) return `Next: ${dated.title} (${shortDate(dated.dueDate!)})`;
  if (v.goal.tracking === "measure") return "Log some progress today";
  if (v.goal.tracking === "habits") return v.habits.length ? "Check in on a linked habit" : "Link a habit to start counting";
  return open[0] ? `Next: ${open[0].title}` : "Add your first milestone";
}

/** The top goals on the habit Today page, with what moves each one. Server-safe markup. */
export function GoalsFocus({ views }: { views: GoalView[] }) {
  const focus = views.filter((v) => v.mine && v.goal.status === "active").slice(0, 3);
  if (focus.length === 0) return null;
  return (
    <section className="h-card flex flex-col gap-3 p-4" aria-label="Goals focus">
      <header className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-h-brand-soft text-h-brand">
          <Target className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-extrabold tracking-tight">Goals focus</h2>
        <Link href="/goals" className="ml-auto flex items-center gap-1 text-[11px] font-bold text-h-brand">
          All goals
          <ArrowRight className="h-3 w-3" />
        </Link>
      </header>
      <ul className="flex flex-col gap-3">
        {focus.map((v) => (
          <li key={v.goal.id}>
            <Link href={`/goals/${v.goal.id}`} className="flex items-center gap-3">
              <GoalTile icon={v.goal.icon} color={v.goal.color} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-bold">{v.goal.title}</span>
                  <span className="text-xs font-extrabold tabular-nums text-h-muted">{Math.round(v.info.pct)}%</span>
                </span>
                <ProgressBar pct={v.info.pct} color={v.goal.color} className="mt-1 h-1.5" />
                <span className="mt-1 block truncate text-[11px] font-medium text-h-muted">{nextStep(v)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
