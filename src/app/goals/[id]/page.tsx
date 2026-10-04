import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, CalendarClock, Flag, Link2, ListChecks, Sparkles, Target, TrendingUp, Trophy, Users } from "lucide-react";
import { loadGoalsData } from "@/lib/goal-data";
import { getHabits } from "@/lib/db/repo-habits";
import { getNotes } from "@/lib/db/repo-goals";
import { goalToForm } from "@/lib/goal-form-values";
import { areaMeta, daysUntil, shortDate, TRACKING_META } from "@/lib/goals";
import { formatNumber } from "@/lib/habits";
import { Ring } from "@/components/habits/ring";
import { EffortBadge, ForecastBadge, GoalTile, StatusBadge } from "@/components/goals/goal-parts";
import { GoalActionsBar } from "@/components/goals/goal-actions-bar";
import { MilestoneList } from "@/components/goals/milestone-list";
import { ProgressPanel } from "@/components/goals/progress-panel";
import { LinkedHabits } from "@/components/goals/linked-habits";
import { GoalJournal } from "@/components/goals/goal-journal";
import { colorHex } from "@/lib/habits";
import { cn } from "@/lib/utils";

export default async function GoalDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id: rawId } = await params;
  const { tab: rawTab } = await searchParams;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const tab = rawTab === "journal" ? "journal" : "overview";

  const { today, viewerId, views } = await loadGoalsData();
  const view = views.find((v) => v.goal.id === id);
  if (!view) notFound(); // private goals of others, other households, or a missing goal all look the same

  const { goal, info, forecast, mine } = view;
  const hex = colorHex(goal.color);
  const area = areaMeta(goal.area);
  const left = goal.targetDate ? daysUntil(goal.targetDate, today) : null;

  const notes = await getNotes(goal.id);
  const names = new Map(views.flatMap((v) => v.contributions.map((c) => [c.profileId, c.name] as const)));
  const myHabits = await getHabits(viewerId);
  const linkedIds = new Set(view.habits.map((h) => h.habitId));
  const linkable = myHabits.filter((h) => !linkedIds.has(h.id)).map((h) => ({ id: h.id, name: h.name }));

  // Recent wins: finished milestones and logged progress, newest first.
  const wins = [
    ...view.milestones.filter((m) => m.doneAt).map((m) => ({ date: m.doneAt!, text: `Finished: ${m.title}` })),
    ...view.progress.map((p) => ({
      date: p.date,
      text: `+${formatNumber(p.value)}${goal.targetUnit ? ` ${goal.targetUnit}` : ""}${p.note ? `: ${p.note}` : ""}${p.profileId === viewerId ? "" : ` (${p.who})`}`,
    })),
  ]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 6);

  const tabs = [
    { key: "overview", label: "Overview", icon: Target, href: `/goals/${goal.id}` },
    { key: "journal", label: `Journal${notes.length ? ` · ${notes.length}` : ""}`, icon: BookOpen, href: `/goals/${goal.id}?tab=journal` },
  ] as const;

  return (
    <div className="flex flex-col gap-5 md:mx-auto md:max-w-3xl">
      <Link href="/goals" className="flex w-fit items-center gap-1 text-xs font-bold text-h-muted hover:text-h-fg">
        <ArrowLeft className="h-3.5 w-3.5" />
        All goals
      </Link>

      {goal.imageData && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={goal.imageData} alt="" className="h-44 w-full rounded-3xl object-cover" />
      )}

      <div className="flex items-start gap-4">
        <GoalTile icon={goal.icon} color={goal.color} size="lg" />
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-extrabold leading-tight tracking-tight">{goal.title}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={goal.status} />
            <span className="text-xs font-semibold text-h-muted">{goal.area}</span>
            <span className="text-xs font-semibold text-h-muted">· {TRACKING_META[goal.tracking].label}</span>
            {goal.visibility === "shared" && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-h-muted">
                <Users className="h-3 w-3" />
                {mine ? "Shared" : `By ${view.ownerName}`}
              </span>
            )}
            <EffortBadge weeks={view.effortWeeks} />
          </div>
          {goal.why && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-h-muted">{goal.why}</p>}
          {goal.quote && <p className="mt-2 border-l-2 pl-3 text-sm italic text-h-muted" style={{ borderColor: hex }}>{goal.quote}</p>}
        </div>
      </div>

      {mine && (
        <GoalActionsBar
          form={goalToForm(goal)}
          status={goal.status}
          pinned={goal.pinned}
          visibility={goal.visibility}
          reached={info.pct >= 100 && goal.status !== "achieved"}
        />
      )}

      <nav className="flex gap-1 rounded-xl bg-h-surface2 p-1" aria-label="Goal sections">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all",
              tab === t.key ? "bg-h-surface text-h-fg shadow-sm" : "text-h-muted hover:text-h-fg"
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "journal" ? (
        <GoalJournal
          goalId={goal.id}
          canWrite
          isOwner={mine}
          entries={notes.map((n) => ({ id: n.id, body: n.body, mood: n.mood, createdAt: n.createdAt, who: names.get(n.profileId) ?? "Someone", mine: n.profileId === viewerId }))}
        />
      ) : (
        <>
          <section className="h-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <Ring pct={info.pct} size={116} stroke={11} color={info.pct >= 100 ? "var(--h-good)" : hex}>
                <span className="text-3xl font-extrabold tabular-nums">{Math.round(info.pct)}%</span>
              </Ring>
              <div className="min-w-0 sm:hidden">
                <p className="text-sm font-extrabold leading-tight">{info.label}</p>
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="hidden text-base font-extrabold leading-tight sm:block">{info.label}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {goal.status !== "achieved" && <ForecastBadge forecast={forecast} />}
                {goal.status === "achieved" && goal.achievedAt && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-h-good/12 px-2 py-0.5 text-[11px] font-bold text-h-good">
                    <Trophy className="h-3 w-3" />
                    Achieved {shortDate(goal.achievedAt)}
                  </span>
                )}
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-h-surface2 px-3 py-2">
                  <dt className="flex items-center gap-1 font-bold uppercase tracking-wide text-h-muted">
                    <Flag className="h-3 w-3" />
                    Started
                  </dt>
                  <dd className="mt-0.5 font-extrabold">{shortDate(goal.startDate)}</dd>
                </div>
                <div className="rounded-xl bg-h-surface2 px-3 py-2">
                  <dt className="flex items-center gap-1 font-bold uppercase tracking-wide text-h-muted">
                    <CalendarClock className="h-3 w-3" />
                    Target
                  </dt>
                  <dd className="mt-0.5 font-extrabold">
                    {goal.targetDate ? shortDate(goal.targetDate) : "No date"}
                    {left !== null && goal.status === "active" && (
                      <span className={cn("ml-1.5 text-[11px] font-bold", left < 0 ? "text-h-bad" : "text-h-muted")}>
                        {left < 0 ? `${-left}d late` : `${left}d left`}
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          {view.nudges.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {view.nudges.map((n, i) => (
                <li key={i} className="flex items-start gap-2 rounded-xl bg-h-break-soft px-3 py-2 text-xs font-semibold leading-snug text-h-break">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {n.text}
                </li>
              ))}
            </ul>
          )}

          {goal.visibility === "shared" && view.contributions.length > 0 && (
            <Section icon={Users} title="Together" hex={hex}>
              <ul className="flex flex-col divide-y divide-h-border">
                {view.contributions.map((c) => (
                  <li key={c.profileId} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="font-bold">
                      {c.name}
                      {c.mine && <span className="ml-1.5 text-[11px] font-semibold text-h-muted">you</span>}
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-h-muted">
                      {goal.tracking === "measure" || c.amount > 0 ? `${formatNumber(c.amount)}${goal.targetUnit ? ` ${goal.targetUnit}` : ""} · ` : ""}
                      {c.checkins} check-ins
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section icon={ListChecks} title="Milestones" hex={hex} hint={goal.tracking === "milestones" ? "Progress is the share you've finished." : undefined}>
            <MilestoneList
              goalId={goal.id}
              color={goal.color}
              today={today}
              canEdit={mine}
              milestones={view.milestones.map((m) => ({ id: m.id, title: m.title, dueDate: m.dueDate, doneAt: m.doneAt }))}
            />
          </Section>

          {goal.tracking === "measure" && (
            <Section icon={TrendingUp} title="Progress log" hex={hex}>
              <ProgressPanel
                goalId={goal.id}
                unit={goal.targetUnit}
                today={today}
                canLog
                isOwner={mine}
                entries={view.progress.map((p) => ({ id: p.id, value: p.value, note: p.note, date: p.date, who: p.who, mine: p.profileId === viewerId }))}
              />
            </Section>
          )}

          <Section icon={Link2} title="Linked habits" hex={hex} hint={goal.tracking === "habits" ? (goal.habitKind === "streak" ? "Progress is the best current streak among these." : "Progress is the total check-ins across these.") : undefined}>
            <LinkedHabits goalId={goal.id} habits={view.habits} linkable={linkable} canContribute isOwner={mine} />
          </Section>

          {wins.length > 0 && (
            <Section icon={Trophy} title="Recent wins" hex={hex}>
              <ul className="flex flex-col divide-y divide-h-border">
                {wins.map((w, i) => (
                  <li key={i} className="flex items-start gap-3 py-2 text-sm">
                    <span className="mt-0.5 w-20 shrink-0 text-[11px] font-bold text-h-muted">{shortDate(w.date)}</span>
                    <span className="min-w-0 break-words font-semibold">{w.text}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <p className="text-center text-[11px] text-h-muted">Life area: {area.name}</p>
        </>
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  hex,
  hint,
  children,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  hex: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="h-card flex flex-col gap-3 p-4">
      <header className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${hex}24`, color: hex }}>
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-extrabold tracking-tight">{title}</h2>
        {hint && <span className="ml-auto hidden text-[11px] text-h-muted sm:block">{hint}</span>}
      </header>
      {children}
    </section>
  );
}
