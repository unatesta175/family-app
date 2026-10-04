import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock, Download, NotebookPen, Pin, Target } from "lucide-react";
import { loadGoalsData, type GoalView } from "@/lib/goal-data";
import { getReviews } from "@/lib/db/repo-goals";
import { areaMeta, daysUntil, reviewWeekStart, shortDate, STATUS_META } from "@/lib/goals";
import type { GoalStatus } from "@/lib/db/schema";
import { colorHex } from "@/lib/habits";
import { GoalCard } from "@/components/goals/goal-card";
import { GoalTile } from "@/components/goals/goal-parts";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: { key: string; label: string; match: (s: GoalStatus) => boolean }[] = [
  { key: "open", label: "In progress", match: (s) => s === "active" || s === "idea" || s === "paused" },
  { key: "active", label: "Active", match: (s) => s === "active" },
  { key: "idea", label: "Ideas", match: (s) => s === "idea" },
  { key: "paused", label: "Paused", match: (s) => s === "paused" },
  { key: "dropped", label: "Archived", match: (s) => s === "dropped" },
];

export default async function GoalsHomePage({ searchParams }: { searchParams: Promise<{ status?: string; area?: string }> }) {
  const { status: rawStatus, area: rawArea } = await searchParams;
  const { today, viewerId, views } = await loadGoalsData();
  const filter = STATUS_FILTERS.find((f) => f.key === rawStatus) ?? STATUS_FILTERS[0];
  const reviews = viewerId >= 0 ? await getReviews(viewerId) : [];
  const reviewWeek = reviewWeekStart(today);
  const needsReview = views.some((v) => v.mine && v.goal.status === "active") && !reviews.some((r) => r.weekStart === reviewWeek);

  const mine = views.filter((v) => v.mine);
  const familyShared = views.filter((v) => !v.mine && v.goal.status !== "dropped");
  const inFilter = mine.filter((v) => filter.match(v.goal.status));
  const areas = [...new Set(mine.filter((v) => filter.match(v.goal.status)).map((v) => v.goal.area))].sort();
  const area = rawArea && areas.includes(rawArea) ? rawArea : null;
  const shown = inFilter.filter((v) => area === null || v.goal.area === area);

  const active = mine.filter((v) => v.goal.status === "active");
  const achieved = mine.filter((v) => v.goal.status === "achieved");
  const avg = active.length ? Math.round(active.reduce((a, v) => a + v.info.pct, 0) / active.length) : 0;

  // Nudges across every goal of mine, most urgent first.
  const nudges = mine
    .flatMap((v) => v.nudges.map((n) => ({ ...n, view: v })))
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 4);

  // The next few open milestones with a date.
  const nextSteps = active
    .flatMap((v) => v.milestones.filter((m) => !m.doneAt && m.dueDate).map((m) => ({ m, v })))
    .sort((a, b) => (a.m.dueDate! < b.m.dueDate! ? -1 : 1))
    .slice(0, 6);

  const pinned = shown.filter((v) => v.goal.pinned);
  const rest = shown.filter((v) => !v.goal.pinned);
  const byArea = new Map<string, GoalView[]>();
  for (const v of rest) byArea.set(v.goal.area, [...(byArea.get(v.goal.area) ?? []), v]);

  const href = (s: string, a: string | null) => {
    const q = new URLSearchParams();
    if (s !== "open") q.set("status", s);
    if (a) q.set("area", a);
    const qs = q.toString();
    return `/goals${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-5 md:mx-auto md:max-w-4xl">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-h-muted">Your life, on purpose</p>
          <h1 className="text-2xl font-extrabold tracking-tight">Goals</h1>
        </div>
        {mine.length > 0 && (
          <Link
            href="/goals/export"
            prefetch={false}
            className="flex items-center gap-1.5 rounded-xl border border-h-border bg-h-surface px-3 py-2 text-xs font-bold text-h-muted hover:text-h-fg"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Link>
        )}
      </div>

      {mine.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <Stat value={String(active.length)} label="Active" />
          <Stat value={`${avg}%`} label="Avg. progress" />
          <Stat value={String(achieved.length)} label="Achieved" href="/goals/achieved" />
        </div>
      )}

      {needsReview && (
        <Link href="/goals/review" className="h-card flex items-center gap-3 bg-gradient-to-r from-h-brand-soft to-h-surface p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-h-brand text-h-brand-fg">
            <NotebookPen className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold">Time for your weekly review</span>
            <span className="block text-xs text-h-muted">Two minutes: what moved, what stalled, and one thing to change.</span>
          </span>
          <ArrowRight className="h-4 w-4 text-h-brand" />
        </Link>
      )}

      {nudges.length > 0 && (
        <section className="h-card flex flex-col gap-2 p-4" aria-label="Nudges">
          <h2 className="flex items-center gap-2 text-sm font-extrabold">
            <AlertTriangle className="h-4 w-4 text-h-break" />
            Needs your attention
          </h2>
          <ul className="flex flex-col divide-y divide-h-border">
            {nudges.map((n, i) => (
              <li key={`${n.goalId}-${n.kind}-${i}`}>
                <Link href={`/goals/${n.goalId}`} className="flex items-center gap-3 py-2 text-sm hover:text-h-brand">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", n.severity === 3 ? "bg-h-bad" : n.severity === 2 ? "bg-h-break" : "bg-h-brand")} />
                  <span className="min-w-0 flex-1 text-xs font-semibold leading-snug">{n.text}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-h-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {nextSteps.length > 0 && (
        <section aria-label="Next milestones" className="flex flex-col gap-2">
          <h2 className="px-1 text-xs font-extrabold uppercase tracking-wider text-h-muted">Next milestones</h2>
          <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
            {nextSteps.map(({ m, v }) => {
              const left = daysUntil(m.dueDate!, today);
              return (
                <Link
                  key={m.id}
                  href={`/goals/${v.goal.id}`}
                  className="h-card flex w-56 shrink-0 flex-col gap-1 p-3"
                  style={{ borderTop: `3px solid ${colorHex(v.goal.color)}` }}
                >
                  <span className="line-clamp-2 break-words text-sm font-bold leading-snug">{m.title}</span>
                  <span className="truncate text-[11px] font-semibold text-h-muted">{v.goal.title}</span>
                  <span className={cn("mt-1 inline-flex items-center gap-1 text-[11px] font-bold", left < 0 ? "text-h-bad" : "text-h-muted")}>
                    <CalendarClock className="h-3 w-3" />
                    {left < 0 ? `${-left}d overdue` : left === 0 ? "Today" : `${shortDate(m.dueDate!)}`}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {mine.length === 0 ? (
        <div className="h-card flex flex-col items-center gap-3 p-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-h-brand-soft text-h-brand">
            <Target className="h-7 w-7" />
          </span>
          <div>
            <p className="text-base font-extrabold">What do you want from your life?</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-h-muted">
              Write your first goal, or start from a template. Link habits to it and watch your daily effort add up.
            </p>
          </div>
          <p className="text-xs font-semibold text-h-muted">Tap the + button to begin.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <div className="scrollbar-hide -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
              {STATUS_FILTERS.map((f) => {
                const n = mine.filter((v) => f.match(v.goal.status)).length;
                return (
                  <Link
                    key={f.key}
                    href={href(f.key, null)}
                    aria-current={filter.key === f.key ? "page" : undefined}
                    className={cn(
                      "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors",
                      filter.key === f.key ? "border-h-brand bg-h-brand text-h-brand-fg" : "border-h-border bg-h-surface text-h-muted hover:text-h-fg"
                    )}
                  >
                    {f.label}
                    <span className="ml-1.5 opacity-70">{n}</span>
                  </Link>
                );
              })}
            </div>
            {areas.length > 1 && (
              <div className="scrollbar-hide -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0" aria-label="Filter by life area">
                <Link
                  href={href(filter.key, null)}
                  className={cn(
                    "shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-bold",
                    area === null ? "border-h-fg bg-h-fg text-h-bg" : "border-h-border bg-h-surface text-h-muted hover:text-h-fg"
                  )}
                >
                  All areas
                </Link>
                {areas.map((a) => (
                  <Link
                    key={a}
                    href={href(filter.key, a)}
                    className={cn(
                      "shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-bold",
                      area === a ? "border-h-fg bg-h-fg text-h-bg" : "border-h-border bg-h-surface text-h-muted hover:text-h-fg"
                    )}
                  >
                    {a}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {shown.length === 0 && <p className="py-8 text-center text-sm text-h-muted">No goals here yet.</p>}

          {pinned.length > 0 && (
            <Group title="Pinned" icon={<Pin className="h-3.5 w-3.5" />} views={pinned} />
          )}
          {[...byArea.entries()].map(([name, list]) => {
            const meta = areaMeta(name);
            return (
              <Group
                key={name}
                title={name}
                icon={<GoalTile icon={meta.icon} color={meta.color} size="sm" />}
                views={list}
              />
            );
          })}
        </>
      )}

      {familyShared.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-xs font-extrabold uppercase tracking-wider text-h-muted">Shared by your family</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {familyShared.map((v) => (
              <GoalCard key={v.goal.id} view={v} />
            ))}
          </div>
        </section>
      )}

      <p className="px-1 text-center text-[11px] text-h-muted">
        Status: {Object.values(STATUS_META).map((m) => `${m.label} = ${m.hint.toLowerCase()}`).join(" · ")}
      </p>
    </div>
  );
}

function Group({ title, icon, views }: { title: string; icon: React.ReactNode; views: GoalView[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-2 px-1 text-xs font-extrabold uppercase tracking-wider text-h-muted">
        {icon}
        {title}
        <span className="rounded-full bg-h-surface2 px-2 py-0.5 text-[10px]">{views.length}</span>
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {views.map((v) => (
          <GoalCard key={v.goal.id} view={v} />
        ))}
      </div>
    </section>
  );
}

function Stat({ value, label, href }: { value: string; label: string; href?: string }) {
  const body = (
    <>
      <p className="text-2xl font-extrabold leading-none tabular-nums">{value}</p>
      <p className="mt-1 text-[11px] font-semibold text-h-muted">{label}</p>
    </>
  );
  return href ? (
    <Link href={href} className="h-card p-3 transition-shadow hover:shadow-lg">
      {body}
    </Link>
  ) : (
    <div className="h-card p-3">{body}</div>
  );
}
