import { PRAYER_ORDER } from "@/lib/prayers";
import type { PrayerBreakdown } from "@/lib/stats";
import type { Prayer } from "@/lib/db/schema";

export type Difficulty = "easy" | "medium" | "hard";

export type Milestone = {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  unlocked: boolean;
};

export function computeMilestones(input: {
  totalPrayed: number;
  bestStreak: number;
  daysLogged: number;
  prayerBreakdown: Record<Prayer, PrayerBreakdown>;
}): Milestone[] {
  const { totalPrayed, bestStreak, daysLogged, prayerBreakdown } = input;
  const fajrPct = prayerBreakdown.fajr.pct;
  const allAbove80 = PRAYER_ORDER.every((p) => prayerBreakdown[p].pct >= 80);

  return [
    {
      id: "journey_started",
      title: "Journey Started",
      description: "First prayer logged",
      difficulty: "easy",
      unlocked: totalPrayed >= 1,
    },
    {
      id: "prayers_100",
      title: "100 Prayers",
      description: "Logged 100 prayers",
      difficulty: "easy",
      unlocked: totalPrayed >= 100,
    },
    {
      id: "prayers_500",
      title: "500 Prayers",
      description: "Logged 500 prayers",
      difficulty: "medium",
      unlocked: totalPrayed >= 500,
    },
    {
      id: "prayers_1k",
      title: "1K Prayers",
      description: "Logged 1,000 prayers",
      difficulty: "medium",
      unlocked: totalPrayed >= 1000,
    },
    {
      id: "prayers_2_5k",
      title: "2.5K Prayers",
      description: "Logged 2,500 prayers",
      difficulty: "hard",
      unlocked: totalPrayed >= 2500,
    },
    {
      id: "prayers_5k",
      title: "5K Prayers",
      description: "Logged 5,000 prayers",
      difficulty: "hard",
      unlocked: totalPrayed >= 5000,
    },
    {
      id: "prayers_10k",
      title: "10K Prayers",
      description: "Logged 10,000 prayers",
      difficulty: "hard",
      unlocked: totalPrayed >= 10000,
    },
    {
      id: "streak_7",
      title: "7-Day Streak",
      description: "Maintained for 7 consecutive days",
      difficulty: "easy",
      unlocked: bestStreak >= 7,
    },
    {
      id: "streak_30",
      title: "30-Day Streak",
      description: "Maintained for 30 consecutive days",
      difficulty: "medium",
      unlocked: bestStreak >= 30,
    },
    {
      id: "streak_100",
      title: "100-Day Streak",
      description: "Maintained for 100 consecutive days",
      difficulty: "hard",
      unlocked: bestStreak >= 100,
    },
    {
      id: "streak_365",
      title: "Year-Long Streak",
      description: "Maintained for 365 consecutive days",
      difficulty: "hard",
      unlocked: bestStreak >= 365,
    },
    {
      id: "days_100",
      title: "Century Club",
      description: "Logged prayers for 100 days",
      difficulty: "easy",
      unlocked: daysLogged >= 100,
    },
    {
      id: "days_200",
      title: "200 Days Strong",
      description: "Logged prayers for 200 days",
      difficulty: "medium",
      unlocked: daysLogged >= 200,
    },
    {
      id: "days_365",
      title: "One Year Club",
      description: "Logged prayers for 365+ days",
      difficulty: "hard",
      unlocked: daysLogged >= 365,
    },
    {
      id: "dawn_devotee",
      title: "Dawn Devotee",
      description: "Fajr completion at 80%+",
      difficulty: "easy",
      unlocked: fajrPct >= 80,
    },
    {
      id: "master_of_all",
      title: "Master of All",
      description: "All 5 prayers at 80%+ completion",
      difficulty: "hard",
      unlocked: allAbove80,
    },
  ];
}
