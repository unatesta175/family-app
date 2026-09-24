import { getActiveProfileId } from "@/lib/session";
import { getAllLogsByDate } from "@/lib/db/repo";
import { todayIso } from "@/lib/date";
import { dayCompletionPct, currentStreak, bestStreak, streakLengthEndingOn } from "@/lib/streaks";
import {
  gardenStage,
  gardenTier,
  gardenQuality,
  gardenCondition,
  gardenPlotState,
  type GardenStage,
  type GardenTier,
  type GardenCondition,
  type PlotState,
} from "@/lib/garden";
import { GardenClient } from "@/components/garden/garden-client";
import type { Prayer, Status } from "@/lib/db/schema";

export default async function GardenPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const profileId = await getActiveProfileId();
  const { month } = await searchParams;
  const today = todayIso();
  const [ty, tm] = today.split("-").map(Number);

  const targetMonth = month ? month : `${ty}-${String(tm).padStart(2, "0")}`;
  const [year, monthNum] = targetMonth.split("-").map(Number);

  const logsByDate = await getAllLogsByDate(profileId);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const firstWeekday = new Date(year, monthNum - 1, 1).getDay();

  const prevMonth = new Date(year, monthNum - 2, 1);
  const nextMonth = new Date(year, monthNum, 1);
  const prevParam = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
  const nextParam = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;
  const canGoNext = nextMonth <= new Date(ty, tm - 1, 1);

  const monthLabel = new Date(year, monthNum - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const cells: {
    date: string | null;
    stage: GardenStage;
    pct: number;
    quality: number;
    condition: GardenCondition;
    plotState: PlotState;
    bonus: boolean;
    tier: GardenTier;
  }[] = [];
  const dayDetails: Record<
    string,
    {
      pct: number;
      quality: number;
      condition: GardenCondition;
      plotState: PlotState;
      prayers: Partial<Record<Prayer, Status>>;
    }
  > = {};

  for (let i = 0; i < firstWeekday; i++)
    cells.push({
      date: null,
      stage: "empty",
      pct: 0,
      quality: 0,
      condition: "healthy",
      plotState: "empty",
      bonus: false,
      tier: "none",
    });

  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(monthNum).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const day = logsByDate[date] ?? {};
    const pct = date <= today ? dayCompletionPct(day) : 0;
    const hasJamaah = Object.values(day).some((s) => s === "jamaah" || s === "on_time_jamaah");
    const stage = date <= today ? gardenStage(pct) : "empty";
    const quality = date <= today ? gardenQuality(day) : 0;
    const condition = gardenCondition(quality, day);
    const plotState = date <= today ? gardenPlotState(day) : "empty";
    // Streak/jamaah flourishes only apply to a plot that's actually growing a tree.
    const tier = plotState === "growing" && stage === "flowering" ? gardenTier(streakLengthEndingOn(logsByDate, date)) : "none";
    const bonus = plotState === "growing" && pct === 100 && hasJamaah;
    cells.push({ date, stage, pct, quality, condition, plotState, bonus, tier });
    if (date <= today) dayDetails[date] = { pct, quality, condition, plotState, prayers: day };
  }

  const monthDays = cells.filter((c) => c.date);
  const grown = monthDays.filter((c) => c.pct === 100 && c.plotState === "growing").length;

  return (
    <GardenClient
      cells={cells}
      todayDate={today}
      dayDetails={dayDetails}
      monthLabel={monthLabel}
      prevParam={prevParam}
      nextParam={nextParam}
      canGoNext={canGoNext}
      grown={grown}
      currentStreak={currentStreak(logsByDate, today)}
      bestStreak={bestStreak(logsByDate)}
    />
  );
}
