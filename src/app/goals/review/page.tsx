import Link from "next/link";
import { CheckCircle2, MoonStar, TrendingDown } from "lucide-react";
import { loadGoalsData } from "@/lib/goal-data";
import { getReviews } from "@/lib/db/repo-goals";
import { reviewWeekStart, shortDate } from "@/lib/goals";
import { addDays } from "@/lib/date";
import { DeleteReviewButton, ReviewForm } from "@/components/goals/review-form";
import { resolveMember } from "@/lib/goal-member";

export const metadata = { title: "Weekly review" };

/** A two-minute Sunday check-in: what moved, what stalled, and one thing to change. */
export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const member = await resolveMember((await searchParams).member);
  const { today, viewerId, views } = await loadGoalsData();
  const subjectId = member ? member.id : viewerId;
  const reviews = subjectId >= 0 ? await getReviews(subjectId) : [];
  const weekStart = reviewWeekStart(today);
  const weekEnd = addDays(weekStart, 6);
  const current = reviews.find((r) => r.weekStart === weekStart);
  const past = reviews.filter((r) => r.weekStart !== weekStart);

  // Which active goals saw activity during the week being reviewed, and which didn't.
  const active = views.filter((v) => (member ? v.goal.profileId === member.id : v.mine) && v.goal.status === "active");
  const moved = active.filter((v) => v.activity.some((d) => d >= weekStart && d <= weekEnd));
  const stalled = active.filter((v) => !moved.includes(v));

  return (
    <div className="flex flex-col gap-5 md:mx-auto md:max-w-2xl">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-h-muted">
          {shortDate(weekStart)} – {shortDate(weekEnd)}
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight">Weekly review</h1>
        <p className="text-sm text-h-muted">{member ? `${member.name}'s reflections. View only.` : "Look back for two minutes so next week goes better."}</p>
      </div>

      {active.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <section className="h-card flex flex-col gap-2 p-4">
            <h2 className="flex items-center gap-2 text-sm font-extrabold">
              <CheckCircle2 className="h-4 w-4 text-h-good" />
              Moved this week
              <span className="rounded-full bg-h-surface2 px-2 py-0.5 text-[10px]">{moved.length}</span>
            </h2>
            {moved.length === 0 ? (
              <p className="text-xs text-h-muted">Nothing logged on your active goals.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {moved.map((v) => (
                  <li key={v.goal.id}>
                    <Link href={`/goals/${v.goal.id}`} className="block break-words text-xs font-semibold hover:text-h-brand">
                      {v.goal.title} <span className="text-h-muted">· {Math.round(v.info.pct)}%</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="h-card flex flex-col gap-2 p-4">
            <h2 className="flex items-center gap-2 text-sm font-extrabold">
              <TrendingDown className="h-4 w-4 text-h-break" />
              Stalled
              <span className="rounded-full bg-h-surface2 px-2 py-0.5 text-[10px]">{stalled.length}</span>
            </h2>
            {stalled.length === 0 ? (
              <p className="text-xs text-h-muted">Every active goal moved. Nice.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {stalled.map((v) => (
                  <li key={v.goal.id}>
                    <Link href={`/goals/${v.goal.id}`} className="block break-words text-xs font-semibold hover:text-h-brand">
                      {v.goal.title} <span className="text-h-muted">· {Math.round(v.info.pct)}%</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <section className="h-card flex flex-col gap-3 p-4">
        <h2 className="flex items-center gap-2 text-sm font-extrabold">
          <MoonStar className="h-4 w-4 text-h-brand" />
          {member ? `${member.name}'s reflection` : "Your reflection"}
        </h2>
        {member ? (
          current ? (
            <dl className="flex flex-col gap-2 text-sm">
              {current.moved && <Answer label="Moved" text={current.moved} />}
              {current.stalled && <Answer label="Stalled" text={current.stalled} />}
              {current.change && <Answer label="Change" text={current.change} />}
            </dl>
          ) : (
            <p className="text-xs text-h-muted">No reflection written for this week yet.</p>
          )
        ) : (
          <ReviewForm
            key={weekStart}
            weekStart={weekStart}
            saved={!!current}
            initial={{ moved: current?.moved ?? "", stalled: current?.stalled ?? "", change: current?.change ?? "" }}
          />
        )}
      </section>

      {past.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-xs font-extrabold uppercase tracking-wider text-h-muted">Past reviews</h2>
          <ul className="flex flex-col gap-2">
            {past.map((r) => (
              <li key={r.id} className="h-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-extrabold">
                    Week of {shortDate(r.weekStart)}
                  </p>
                  {!member && <DeleteReviewButton weekStart={r.weekStart} />}
                </div>
                <dl className="mt-2 flex flex-col gap-2 text-sm">
                  {r.moved && <Answer label="Moved" text={r.moved} />}
                  {r.stalled && <Answer label="Stalled" text={r.stalled} />}
                  {r.change && <Answer label="Change" text={r.change} />}
                </dl>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Answer({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wide text-h-muted">{label}</dt>
      <dd className="whitespace-pre-wrap break-words">{text}</dd>
    </div>
  );
}
