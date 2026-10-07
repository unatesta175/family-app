import { FlaskConical } from "lucide-react";
import { EVIDENCE_META, START_TIPS, type Evidence } from "@/lib/habit-science";
import { cn } from "@/lib/utils";

const EVIDENCE_STYLE: Record<Evidence, string> = {
  strong: "bg-emerald-500/12 text-emerald-700 [.dark_&]:text-emerald-300",
  moderate: "bg-amber-500/14 text-amber-700 [.dark_&]:text-amber-300",
  emerging: "bg-sky-500/14 text-sky-700 [.dark_&]:text-sky-300",
};

/** The 20 tips for getting started on something you keep putting off. */
export function ScienceGuide() {
  return (
    <div className="flex flex-col gap-4 md:mx-auto md:max-w-3xl">
      <section className="relative overflow-hidden rounded-3xl border border-h-border bg-gradient-to-br from-h-brand-soft via-h-surface to-h-surface p-5 shadow-sm">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-h-brand/10 blur-3xl" />
        <div className="relative flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-h-brand text-h-brand-fg shadow-sm">
            <FlaskConical className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-h-muted">Stop procrastinating</p>
            <h1 className="text-2xl font-extrabold tracking-tight">20 ways to start</h1>
            <p className="mt-1 text-sm leading-relaxed text-h-muted">Starting is the hardest part. These are the tricks with the best research behind them, most useful first.</p>
          </div>
        </div>
      </section>

      <ol className="flex flex-col gap-3">
        {START_TIPS.map((t, i) => (
          <li key={t.id} className="flex gap-3 rounded-2xl border border-h-border bg-h-surface p-4 shadow-sm">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-h-brand-soft text-sm font-extrabold tabular-nums text-h-brand">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-extrabold leading-snug">{t.title}</p>
              <p className="mt-1 text-sm font-semibold leading-snug">{t.action}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-h-muted">{t.why}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-extrabold", EVIDENCE_STYLE[t.evidence])} title={EVIDENCE_META[t.evidence].blurb}>
                  {EVIDENCE_META[t.evidence].label} evidence
                </span>
                <span className="text-[11px] text-h-muted">{t.basis}</span>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <p className="px-2 text-center text-[11px] leading-relaxed text-h-muted">General guidance from published research, written from memory, so check the details of any study you plan to rely on. Not professional advice.</p>
    </div>
  );
}
