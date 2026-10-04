import Link from "next/link";
import { Archive, Award, Trophy } from "lucide-react";
import { loadGoalsData } from "@/lib/goal-data";
import { shortDate } from "@/lib/goals";
import { daysBetween } from "@/lib/habits";
import { GoalTile } from "@/components/goals/goal-parts";

export const metadata = { title: "Achieved" };

/** The wall of goals you've achieved, and the archive of ones you dropped. */
export default async function AchievedPage() {
  const { today, views } = await loadGoalsData();
  const mine = views.filter((v) => v.mine);
  const achieved = mine
    .filter((v) => v.goal.status === "achieved")
    .sort((a, b) => ((a.goal.achievedAt ?? "") < (b.goal.achievedAt ?? "") ? 1 : -1));
  const dropped = mine.filter((v) => v.goal.status === "dropped");
  const thisYear = achieved.filter((v) => (v.goal.achievedAt ?? "").startsWith(today.slice(0, 4))).length;

  return (
    <div className="flex flex-col gap-5 md:mx-auto md:max-w-3xl">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-h-muted">Celebrate the wins</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Achieved</h1>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="h-card flex items-center gap-3 p-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-h-good/15 text-h-good">
            <Trophy className="h-5 w-5" />
          </span>
          <div>
            <p className="text-2xl font-extrabold leading-none tabular-nums">{achieved.length}</p>
            <p className="mt-1 text-[11px] font-semibold text-h-muted">Goals achieved</p>
          </div>
        </div>
        <div className="h-card flex items-center gap-3 p-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-h-brand-soft text-h-brand">
            <Award className="h-5 w-5" />
          </span>
          <div>
            <p className="text-2xl font-extrabold leading-none tabular-nums">{thisYear}</p>
            <p className="mt-1 text-[11px] font-semibold text-h-muted">This year</p>
          </div>
        </div>
      </div>

      {achieved.length === 0 ? (
        <div className="h-card flex flex-col items-center gap-2 p-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-h-good/15 text-h-good">
            <Trophy className="h-7 w-7" />
          </span>
          <p className="text-base font-extrabold">Your wall is waiting</p>
          <p className="text-sm text-h-muted">When a goal reaches 100%, mark it achieved and it earns its place here.</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {achieved.map((v) => {
            const days = v.goal.achievedAt ? daysBetween(v.goal.startDate, v.goal.achievedAt) : null;
            return (
              <li key={v.goal.id}>
                <Link href={`/goals/${v.goal.id}`} className="h-card flex h-full items-start gap-3 bg-gradient-to-br from-h-good/10 to-h-surface p-4 transition-shadow hover:shadow-lg">
                  <GoalTile icon={v.goal.icon} color={v.goal.color} />
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-extrabold leading-snug">{v.goal.title}</span>
                    <span className="mt-1 block text-[11px] font-semibold text-h-muted">
                      {v.goal.area}
                      {v.goal.achievedAt && ` · Achieved ${shortDate(v.goal.achievedAt)}`}
                    </span>
                    {days !== null && days > 0 && <span className="mt-0.5 block text-[11px] font-semibold text-h-good">Took {days} day{days === 1 ? "" : "s"}</span>}
                  </span>
                  <Trophy className="h-5 w-5 shrink-0 text-h-good" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {dropped.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 px-1 text-xs font-extrabold uppercase tracking-wider text-h-muted">
            <Archive className="h-3.5 w-3.5" />
            Archive
            <span className="rounded-full bg-h-surface2 px-2 py-0.5 text-[10px]">{dropped.length}</span>
          </h2>
          <ul className="h-card divide-y divide-h-border">
            {dropped.map((v) => (
              <li key={v.goal.id}>
                <Link href={`/goals/${v.goal.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-h-surface2">
                  <GoalTile icon={v.goal.icon} color={v.goal.color} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-h-muted">{v.goal.title}</span>
                  <span className="text-[11px] font-semibold text-h-muted">{Math.round(v.info.pct)}%</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="px-1 text-[11px] text-h-muted">Open an archived goal and change its status to bring it back.</p>
        </section>
      )}
    </div>
  );
}
