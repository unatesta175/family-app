import { Globe2 } from "lucide-react";
import { formatTopPercent } from "@/lib/world-rank";
import { cn } from "@/lib/utils";

/** A habit's estimated world standing, small enough to sit in any row or card header. */
export type HabitRank = { top: number; tier: string };

export function RankChip({ rank, className }: { rank: HabitRank; className?: string }) {
  return (
    <span
      title={`Estimated world standing for this habit: Top ${formatTopPercent(rank.top)} (${rank.tier})`}
      className={cn("inline-flex shrink-0 items-center gap-0.5 rounded-md bg-h-brand-soft px-1.5 py-px text-[10px] font-extrabold tabular-nums text-h-brand", className)}
    >
      <Globe2 className="h-2.5 w-2.5" />
      Top {formatTopPercent(rank.top)}
    </span>
  );
}
