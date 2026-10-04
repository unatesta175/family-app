import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { loadGoalsData } from "@/lib/goal-data";
import { getNotes } from "@/lib/db/repo-goals";
import { shortDate, STATUS_META, TRACKING_META } from "@/lib/goals";
import { formatNumber } from "@/lib/habits";
import { PrintButton } from "@/components/goals/print-button";

/** A clean, printable summary of one goal. Use the browser's "Save as PDF" to keep a copy. */
export default async function GoalPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const { today, viewerId, views } = await loadGoalsData();
  const view = views.find((v) => v.goal.id === id);
  if (!view) notFound();
  const { goal, info, forecast } = view;
  const notes = await getNotes(goal.id);
  const unit = goal.targetUnit ? ` ${goal.targetUnit}` : "";

  return (
    <article className="flex flex-col gap-5 md:mx-auto md:max-w-3xl print:max-w-none">
      <div className="no-print flex items-center justify-between gap-3">
        <Link href={`/goals/${goal.id}`} className="flex items-center gap-1 text-xs font-bold text-h-muted hover:text-h-fg">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to goal
        </Link>
        <PrintButton />
      </div>

      <header className="border-b border-h-border pb-4">
        <p className="text-xs font-bold uppercase tracking-wider text-h-muted">
          {goal.area} · {STATUS_META[goal.status].label} · {goal.visibility === "shared" ? "Shared with family" : "Private"}
        </p>
        <h1 className="mt-1 break-words text-3xl font-extrabold tracking-tight">{goal.title}</h1>
        {goal.why && <p className="mt-2 whitespace-pre-wrap text-sm text-h-muted">{goal.why}</p>}
        {goal.quote && <p className="mt-2 text-sm italic text-h-muted">&ldquo;{goal.quote}&rdquo;</p>}
      </header>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Fact label="Progress" value={`${Math.round(info.pct)}%`} />
        <Fact label="Tracked by" value={TRACKING_META[goal.tracking].label} />
        <Fact label="Started" value={shortDate(goal.startDate)} />
        <Fact label="Target" value={goal.targetDate ? shortDate(goal.targetDate) : "No date"} />
      </dl>
      <p className="text-sm font-semibold">
        {info.label}
        {goal.status !== "achieved" && <span className="ml-2 font-medium text-h-muted">· {forecast.text}</span>}
        {goal.achievedAt && <span className="ml-2 font-medium text-h-muted">· Achieved {shortDate(goal.achievedAt)}</span>}
      </p>

      {view.milestones.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wider text-h-muted">Milestones</h2>
          <ul className="divide-y divide-h-border border-y border-h-border text-sm">
            {view.milestones.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-3 py-2">
                <span className="break-words">
                  {m.doneAt ? "☑" : "☐"} {m.title}
                </span>
                <span className="shrink-0 text-xs text-h-muted">{m.doneAt ? `Done ${shortDate(m.doneAt)}` : m.dueDate ? `Due ${shortDate(m.dueDate)}` : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view.habits.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wider text-h-muted">Linked habits</h2>
          <ul className="divide-y divide-h-border border-y border-h-border text-sm">
            {view.habits.map((h) => (
              <li key={h.habitId} className="flex justify-between gap-3 py-2">
                <span>
                  {h.name}
                  {h.ownerId !== viewerId && <span className="text-h-muted"> ({h.ownerName})</span>}
                </span>
                <span className="text-xs text-h-muted">
                  {h.checkins} check-ins · {h.streak}d streak
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view.progress.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wider text-h-muted">Progress log</h2>
          <ul className="divide-y divide-h-border border-y border-h-border text-sm">
            {view.progress.map((p) => (
              <li key={p.id} className="flex justify-between gap-3 py-2">
                <span>
                  +{formatNumber(p.value)}
                  {unit}
                  {p.note && <span className="text-h-muted"> · {p.note}</span>}
                </span>
                <span className="shrink-0 text-xs text-h-muted">
                  {shortDate(p.date)} · {p.who}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {notes.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wider text-h-muted">Journal</h2>
          <ul className="flex flex-col gap-3 text-sm">
            {notes.map((n) => (
              <li key={n.id} className="border-l-2 border-h-border pl-3">
                <p className="whitespace-pre-wrap break-words">{n.body}</p>
                <p className="mt-0.5 text-xs text-h-muted">{n.createdAt.slice(0, 10)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="border-t border-h-border pt-3 text-xs text-h-muted">Printed {shortDate(today)} from Istiqamahly Goals</footer>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-h-surface2 px-3 py-2">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-h-muted">{label}</dt>
      <dd className="mt-0.5 font-extrabold">{value}</dd>
    </div>
  );
}
