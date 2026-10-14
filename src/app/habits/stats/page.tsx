import { ScienceLink } from "@/components/habits/science-link";
import { loadHabitData } from "@/lib/habit-data";
import { addDays, todayIso } from "@/lib/date";
import { StatsContent } from "@/components/habits/stats-content";
import Link from "next/link";
import { cn } from "@/lib/utils";

const RANGES = [7, 30, 90] as const;
const TABS = ["overview", "habits", "world", "todo"] as const;
type Tab = (typeof TABS)[number];

export default async function HabitsStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; tab?: string }>;
}) {
  const { range: rawRange, tab: rawTab } = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(rawTab ?? "") ? (rawTab as Tab) : "overview";
  const range = (RANGES as readonly number[]).includes(Number(rawRange)) ? Number(rawRange) : 30;
  const today = todayIso();
  const from = addDays(today, -(range - 1));

  const data = await loadHabitData();

  return (
    <div className="flex flex-col gap-5 md:mx-auto md:max-w-3xl">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-h-muted">{data.profile?.name}</p>
          <h1 className="text-2xl font-extrabold tracking-tight">Statistics</h1>
        </div>
        <div className="flex gap-1 rounded-xl bg-h-surface2 p-1">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/habits/stats?tab=${tab}&range=${r}`}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                r === range ? "bg-h-surface text-h-fg shadow-sm" : "text-h-muted hover:text-h-fg"
              )}
            >
              {r}d
            </Link>
          ))}
        </div>
      </div>

      <StatsContent data={data} today={today} from={from} range={range} tab={tab} />
      <ScienceLink />
    </div>
  );
}
