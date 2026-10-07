"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, ChevronDown, CircleAlert, FlaskConical, Layers, Quote, ShieldCheck, Target } from "lucide-react";
import { EVIDENCE_META, GROUP_META, MYTHS, SOURCES, TIPS, VERDICT_META, type Evidence, type SourceId, type TipGroup, type Verdict } from "@/lib/habit-science";
import { cn } from "@/lib/utils";

type Tab = "playbook" | "tips" | "myths" | "sources";

const TABS: { key: Tab; label: string }[] = [
  { key: "playbook", label: "Playbook" },
  { key: "tips", label: "Tips" },
  { key: "myths", label: "Myth check" },
  { key: "sources", label: "Sources" },
];

/** "lally2010" -> "Lally 2010". */
function shortCite(id: SourceId): string {
  const m = /^([a-z]+)(\d{4})$/.exec(id);
  return m ? `${m[1][0].toUpperCase()}${m[1].slice(1)} ${m[2]}` : id;
}

const EVIDENCE_STYLE: Record<Evidence, { chip: string; bars: number }> = {
  strong: { chip: "bg-emerald-500/12 text-emerald-700 [.dark_&]:text-emerald-300", bars: 3 },
  moderate: { chip: "bg-amber-500/14 text-amber-700 [.dark_&]:text-amber-300", bars: 2 },
  emerging: { chip: "bg-sky-500/14 text-sky-700 [.dark_&]:text-sky-300", bars: 1 },
};

const VERDICT_STYLE: Record<Verdict, string> = {
  myth: "bg-red-500/12 text-red-700 [.dark_&]:text-red-300",
  oversimplified: "bg-amber-500/14 text-amber-700 [.dark_&]:text-amber-300",
  partly: "bg-sky-500/14 text-sky-700 [.dark_&]:text-sky-300",
  supported: "bg-emerald-500/12 text-emerald-700 [.dark_&]:text-emerald-300",
};

/** How strong the research is, as a label and three bars (so it doesn't rely on colour alone). */
function EvidenceBadge({ level, className }: { level: Evidence; className?: string }) {
  const st = EVIDENCE_STYLE[level];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold", st.chip, className)} title={EVIDENCE_META[level].blurb}>
      <span className="flex items-end gap-[2px]" aria-hidden>
        {[1, 2, 3].map((n) => (
          <span key={n} className={cn("w-[3px] rounded-full bg-current", n === 1 ? "h-1.5" : n === 2 ? "h-2" : "h-2.5", n > st.bars && "opacity-25")} />
        ))}
      </span>
      {EVIDENCE_META[level].label}
    </span>
  );
}

/** The guide: a playbook, graded tips, a fact-check of popular claims, and the sources behind it all. */
export function ScienceGuide() {
  const [tab, setTab] = useState<Tab>("playbook");
  const [group, setGroup] = useState<TipGroup | "all">("all");
  const [level, setLevel] = useState<Evidence | "all">("all");
  const [verdict, setVerdict] = useState<Verdict | "all">("all");
  const [open, setOpen] = useState<string | null>(null);
  const [jump, setJump] = useState<string | null>(null);

  // Jumping from the playbook to a tip: switch tab, open it, and scroll it into view.
  useEffect(() => {
    if (!jump || tab !== "tips") return;
    const el = document.getElementById(`tip-${jump}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJump(null);
  }, [jump, tab]);

  function openTip(id: string) {
    setGroup("all");
    setLevel("all");
    setOpen(id);
    setTab("tips");
    setJump(id);
  }

  const tips = TIPS.filter((t) => (group === "all" || t.group === group) && (level === "all" || t.evidence === level));
  const myths = MYTHS.filter((m) => verdict === "all" || m.verdict === verdict);
  const studies = Object.keys(SOURCES).length;

  const chip = (active: boolean) => cn("shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors", active ? "border-h-brand bg-h-brand-soft text-h-brand" : "border-h-border bg-h-surface text-h-muted hover:text-h-fg");

  return (
    <div className="flex flex-col gap-5 md:mx-auto md:max-w-3xl">
      {/* hero */}
      <section className="relative overflow-hidden rounded-3xl border border-h-border bg-gradient-to-br from-h-brand-soft via-h-surface to-h-surface p-5 shadow-sm">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-h-brand/10 blur-3xl" />
        <div className="relative flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-h-brand text-h-brand-fg shadow-sm">
            <FlaskConical className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-h-muted">Backed by research</p>
            <h1 className="text-2xl font-extrabold tracking-tight">Habit science</h1>
            <p className="mt-1 text-sm leading-relaxed text-h-muted">What studies actually show about building habits, each tip graded by how strong its evidence is, and popular claims checked against the research.</p>
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-3 gap-2">
          {[
            { n: TIPS.length, label: "Graded tips", icon: Target },
            { n: MYTHS.length, label: "Claims checked", icon: ShieldCheck },
            { n: studies, label: "Studies cited", icon: BookOpen },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-h-border bg-h-surface/80 px-3 py-2.5 backdrop-blur">
              <s.icon className="h-4 w-4 text-h-brand" />
              <p className="mt-1 text-xl font-extrabold leading-none tabular-nums">{s.n}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-h-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* tabs */}
      <div role="tablist" aria-label="Habit science sections" className="grid grid-cols-4 gap-1 rounded-2xl border border-h-border bg-h-surface p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn("rounded-xl px-1 py-2 text-xs font-bold transition-colors sm:text-sm", tab === t.key ? "bg-h-brand text-h-brand-fg shadow-sm" : "text-h-muted hover:bg-h-surface2 hover:text-h-fg")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ---------------------------------------------------------------- Playbook */}
      {tab === "playbook" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-h-border bg-h-surface p-4">
            <p className="text-sm font-extrabold">How we grade the evidence</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {(Object.keys(EVIDENCE_META) as Evidence[]).map((e) => (
                <div key={e} className="rounded-xl bg-h-surface2/70 p-3">
                  <EvidenceBadge level={e} />
                  <p className="mt-1.5 text-[11px] leading-snug text-h-muted">{EVIDENCE_META[e].blurb}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="px-1 text-xs font-extrabold uppercase tracking-wider text-h-muted">A plan that works, in four steps</p>
          <ol className="relative flex flex-col gap-3 pl-1">
            {[
              { n: 1, title: "Plan it", text: "Say exactly what you'll do, and when and where. Add an if-then for the obstacle you expect.", tips: ["if-then", "goals"] },
              { n: 2, title: "Start small and anchor it", text: "A version you can do on your worst day, tied to something you already do.", tips: ["start-small", "cue"] },
              { n: 3, title: "Make it easy, and watch it grow", text: "Set up your surroundings, and record each day so you can see the pattern.", tips: ["friction", "track"] },
              { n: 4, title: "Recover from slips well", text: "One miss doesn't undo you. Decide in advance how you'll return, and be kind to yourself.", tips: ["one-miss", "self-compassion"] },
            ].map((step, i, all) => (
              <li key={step.n} className="relative flex gap-3">
                {i < all.length - 1 && <span className="absolute left-[19px] top-10 h-[calc(100%-1rem)] w-px bg-h-border" aria-hidden />}
                <span className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-h-brand text-sm font-extrabold text-h-brand-fg shadow-sm">{step.n}</span>
                <div className="min-w-0 flex-1 rounded-2xl border border-h-border bg-h-surface p-4">
                  <p className="text-sm font-extrabold">{step.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-h-muted">{step.text}</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {step.tips.map((id) => {
                      const t = TIPS.find((x) => x.id === id)!;
                      return (
                        <button key={id} type="button" onClick={() => openTip(id)} className="inline-flex items-center gap-1 rounded-full bg-h-brand-soft px-3 py-1.5 text-[11px] font-bold text-h-brand hover:opacity-80">
                          {t.title.length > 34 ? `${t.title.slice(0, 33)}…` : t.title}
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </li>
            ))}
          </ol>

          <div className="flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 [.dark_&]:text-amber-300" />
            <div>
              <p className="text-sm font-extrabold">There is no magic day</p>
              <p className="mt-0.5 text-xs leading-relaxed text-h-muted">
                You may have read that a habit becomes automatic after 14 or 21 days. Research doesn&apos;t support a switch like that: it takes about two months for many people, ranging from weeks to most of a year. Effort is highest at the start and fades as you repeat. See the{" "}
                <button type="button" onClick={() => setTab("myths")} className="font-bold text-h-brand underline underline-offset-2">
                  myth check
                </button>
                .
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- Tips */}
      {tab === "tips" && (
        <div className="flex flex-col gap-3">
          <div className="scrollbar-hide -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
            <button type="button" onClick={() => setGroup("all")} className={chip(group === "all")}>
              All <span className="opacity-60">{TIPS.length}</span>
            </button>
            {(Object.keys(GROUP_META) as TipGroup[]).map((g) => (
              <button key={g} type="button" onClick={() => setGroup(group === g ? "all" : g)} className={chip(group === g)}>
                {GROUP_META[g].label} <span className="opacity-60">{TIPS.filter((t) => t.group === g).length}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-h-muted">Evidence</span>
            {(["all", "strong", "moderate", "emerging"] as const).map((e) => (
              <button key={e} type="button" onClick={() => setLevel(e)} className={chip(level === e)}>
                {e === "all" ? "Any" : EVIDENCE_META[e].label}
              </button>
            ))}
          </div>

          {tips.length === 0 && <p className="rounded-2xl border border-dashed border-h-border p-6 text-center text-sm text-h-muted">No tips match these filters.</p>}

          {tips.map((t) => {
            const isOpen = open === t.id;
            return (
              <article key={t.id} id={`tip-${t.id}`} className="scroll-mt-24 overflow-hidden rounded-2xl border border-h-border bg-h-surface shadow-sm">
                <button type="button" onClick={() => setOpen(isOpen ? null : t.id)} aria-expanded={isOpen} className="flex w-full items-start gap-3 p-4 text-left">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-h-brand-soft text-h-brand">
                    <Layers className="h-4.5 w-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-extrabold leading-snug">{t.title}</span>
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-h-muted">{t.summary}</span>
                    <span className="mt-2 flex flex-wrap items-center gap-1.5">
                      <EvidenceBadge level={t.evidence} />
                      <span className="rounded-full bg-h-surface2 px-2.5 py-1 text-[11px] font-semibold text-h-muted">{GROUP_META[t.group].label}</span>
                    </span>
                  </span>
                  <ChevronDown className={cn("mt-1 h-5 w-5 shrink-0 text-h-muted transition-transform", isOpen && "rotate-180")} />
                </button>

                {isOpen && (
                  <div className="flex flex-col gap-4 border-t border-h-border bg-h-surface2/40 p-4">
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-h-muted">Do this</p>
                      <ul className="mt-1.5 flex flex-col gap-1.5">
                        {t.doThis.map((d) => (
                          <li key={d} className="flex gap-2 text-sm leading-snug">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-h-brand" strokeWidth={3} />
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-h-muted">What the research says</p>
                      <p className="mt-1 text-sm leading-relaxed">{t.why}</p>
                    </div>
                    {t.caveat && (
                      <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed">
                        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 [.dark_&]:text-amber-300" />
                        <span>
                          <b>Worth knowing: </b>
                          {t.caveat}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {t.sources.map((s) => (
                          <button key={s} type="button" onClick={() => setTab("sources")} className="rounded-md border border-h-border bg-h-surface px-2 py-0.5 text-[11px] font-bold text-h-muted hover:text-h-fg">
                            {shortCite(s)}
                          </button>
                        ))}
                      </div>
                      {t.inApp && (
                        <Link href={t.inApp.href} className="inline-flex items-center gap-1.5 rounded-full bg-h-brand px-3.5 py-2 text-xs font-extrabold text-h-brand-fg shadow-sm">
                          {t.inApp.label}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* ---------------------------------------------------------------- Myth check */}
      {tab === "myths" && (
        <div className="flex flex-col gap-3">
          <p className="px-1 text-sm leading-relaxed text-h-muted">Popular claims about habits, checked against the published research. A claim can be a myth, an oversimplification, partly true, or supported.</p>
          <div className="scrollbar-hide -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
            <button type="button" onClick={() => setVerdict("all")} className={chip(verdict === "all")}>
              All <span className="opacity-60">{MYTHS.length}</span>
            </button>
            {(Object.keys(VERDICT_META) as Verdict[]).map((v) => (
              <button key={v} type="button" onClick={() => setVerdict(verdict === v ? "all" : v)} className={chip(verdict === v)}>
                {VERDICT_META[v].label} <span className="opacity-60">{MYTHS.filter((m) => m.verdict === v).length}</span>
              </button>
            ))}
          </div>
          {myths.map((m) => (
            <article key={m.id} className="rounded-2xl border border-h-border bg-h-surface p-4 shadow-sm">
              <div className="flex items-start gap-2">
                <Quote className="mt-0.5 h-4 w-4 shrink-0 text-h-muted" />
                <p className="min-w-0 flex-1 text-sm font-bold leading-snug">{m.claim}</p>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-extrabold", VERDICT_STYLE[m.verdict])}>{VERDICT_META[m.verdict].label}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-h-muted">{m.truth}</p>
              {m.sources && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {m.sources.map((s) => (
                    <button key={s} type="button" onClick={() => setTab("sources")} className="rounded-md border border-h-border bg-h-surface2 px-2 py-0.5 text-[11px] font-bold text-h-muted hover:text-h-fg">
                      {shortCite(s)}
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* ---------------------------------------------------------------- Sources */}
      {tab === "sources" && (
        <div className="flex flex-col gap-3">
          <p className="px-1 text-sm leading-relaxed text-h-muted">The studies behind the guide, with what each one found. Exact figures vary between studies and people, so treat them as guidance, and look the papers up if you want the details.</p>
          <ul className="flex flex-col gap-2.5">
            {Object.values(SOURCES).map((s) => (
              <li key={s.id} className="rounded-2xl border border-h-border bg-h-surface p-4 shadow-sm">
                <p className="text-xs font-extrabold text-h-brand">{shortCite(s.id)}</p>
                <p className="mt-1 text-[13px] font-semibold leading-snug">{s.cite}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-h-muted">{s.finding}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="px-2 text-center text-[11px] leading-relaxed text-h-muted">General guidance based on published research, not medical or professional advice. Individual results vary.</p>
    </div>
  );
}
