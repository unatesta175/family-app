import { AlertTriangle, Lightbulb, Sparkles, TrendingUp } from "lucide-react";
import type { InsightSeverity, PrayerInsight } from "@/lib/prayer-insights";
import { cn } from "@/lib/utils";

const SEVERITY_STYLE: Record<InsightSeverity, { ring: string; iconBg: string; icon: typeof Lightbulb }> = {
  critical: { ring: "ring-rose-100", iconBg: "bg-rose-50 text-rose-600", icon: AlertTriangle },
  warning: { ring: "ring-amber-100", iconBg: "bg-amber-50 text-amber-600", icon: AlertTriangle },
  info: { ring: "ring-sky-100", iconBg: "bg-sky-50 text-sky-600", icon: Lightbulb },
  positive: { ring: "ring-emerald-100", iconBg: "bg-emerald-50 text-emerald-600", icon: TrendingUp },
};

/** Proactive, prioritised insights — what to act on now. Nothing shows until there's enough data. */
export function PrayerInsightsCard({ insights }: { insights: PrayerInsight[] }) {
  if (insights.length === 0) return null;
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-neutral-100 px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-neutral-900">Insights</p>
          <p className="text-xs text-neutral-400">Personalised from your record</p>
        </div>
      </div>
      <ul className="flex flex-col divide-y divide-neutral-100">
        {insights.map((insight) => {
          const style = SEVERITY_STYLE[insight.severity];
          const Icon = style.icon;
          return (
            <li key={insight.key} className="flex items-start gap-3 px-4 py-3">
              <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1", style.iconBg, style.ring)}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-900">{insight.title}</p>
                <p className="text-xs text-neutral-500">{insight.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
