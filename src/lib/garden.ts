import { PRAYER_ORDER, STATUS_QUALITY, isPerformed } from "@/lib/prayers";
import type { DayLogMap } from "@/lib/streaks";

export type GardenStage = "empty" | "seed" | "sprout" | "sapling" | "tree" | "flowering";

/**
 * Maps a day's completion % to a growth stage. With 5 prayers each stage is
 * exactly one more prayer completed (20% increments), so size differences
 * between stages should read as one full prayer's worth of growth.
 */
export function gardenStage(pct: number): GardenStage {
  if (pct <= 0) return "empty";
  if (pct <= 20) return "seed";
  if (pct <= 40) return "sprout";
  if (pct <= 60) return "sapling";
  if (pct <= 80) return "tree";
  return "flowering";
}

/**
 * A day's quality (0-100): the average STATUS_QUALITY across only the prayers logged so far,
 * independent of `gardenStage`, which separately shows how many were performed (via size).
 * Unlogged prayers are excluded from the average rather than counted as 0 — otherwise a single
 * on-time Fajr early in the day would score as if it were mostly missed, when really nothing
 * else has happened yet. Two days can both be "4/5 performed" (same stage/size) yet score very
 * differently here (4x on_time_jamaah vs 4x qada) — that's the whole point.
 */
export function gardenQuality(day: DayLogMap): number {
  const logged = PRAYER_ORDER.filter((p) => (day[p] ?? "not_yet") !== "not_yet");
  if (logged.length === 0) return 0;
  const total = logged.reduce((sum, p) => sum + STATUS_QUALITY[day[p]!], 0);
  return Math.round(total / logged.length);
}

export type GardenCondition = "golden" | "thriving" | "healthy" | "stressed" | "wilting";

/**
 * Buckets are deliberately coarse (not a smooth gradient) so the difference
 * between two trees reads at a glance instead of needing a side-by-side
 * comparison. Only called for a "growing" plot (see gardenPlotState) — a day
 * with any actively-missed prayer never reaches a tree at all.
 *
 * `day`, when passed, is checked first: if every prayer performed so far was
 * on_time_jamaah, the tree is "golden" regardless of the quality score — on
 * time alone already maxes out the quality gradient (see STATUS_QUALITY), so
 * jamaah needs its own tier above "thriving" to read as a distinct reward.
 */
export function gardenCondition(quality: number, day?: DayLogMap): GardenCondition {
  if (day) {
    const performed = PRAYER_ORDER.filter((p) => isPerformed(day[p] ?? "not_yet"));
    if (performed.length > 0 && performed.every((p) => day[p] === "on_time_jamaah")) {
      return "golden";
    }
  }
  if (quality >= 85) return "thriving";
  if (quality >= 60) return "healthy";
  if (quality >= 35) return "stressed";
  return "wilting";
}

export const GARDEN_CONDITION_META: Record<
  GardenCondition,
  { label: string; hint: string; swatch: string }
> = {
  golden: { label: "Golden", hint: "All on time + jamaah", swatch: "bg-[#eab308]" },
  thriving: { label: "Thriving", hint: "All on time", swatch: "bg-[#15803d]" },
  healthy: { label: "Healthy", hint: "Solid, on-time prayers", swatch: "bg-[#3aa354]" },
  stressed: { label: "Stressed", hint: "Mixed with late/qada", swatch: "bg-[#c2a83f]" },
  wilting: { label: "Wilting", hint: "Mostly late or qada", swatch: "bg-[#b3752c]" },
};

/**
 * 3D canopy/trunk palette per condition, shared so the legend swatch and the tree render match.
 * `emissiveIntensity`/`metalness` default to a modest glow (0.25 / 0) when omitted; golden turns
 * both way up so it actually reads as shining metal instead of a slightly-brighter leaf color.
 */
export const CONDITION_PALETTE: Record<
  GardenCondition,
  {
    canopyA: string;
    canopyB: string;
    canopyC: string;
    trunk: string;
    droop: boolean;
    glow: boolean;
    emissiveIntensity?: number;
    metalness?: number;
  }
> = {
  golden: {
    canopyA: "#d9a520",
    canopyB: "#ffbf00",
    canopyC: "#ffe066",
    trunk: "#e8c247",
    droop: false,
    glow: true,
    emissiveIntensity: 0.5,
    metalness: 0.7,
  },
  thriving: { canopyA: "#15803d", canopyB: "#1fa851", canopyC: "#29c463", trunk: "#6b4527", droop: false, glow: true },
  healthy: { canopyA: "#2f8a44", canopyB: "#3aa354", canopyC: "#49ab5b", trunk: "#6b4527", droop: false, glow: false },
  stressed: { canopyA: "#8a9a3f", canopyB: "#a7b34f", canopyC: "#c2c666", trunk: "#7a6135", droop: false, glow: false },
  wilting: { canopyA: "#a3672a", canopyB: "#b98338", canopyC: "#c9994a", trunk: "#6b5334", droop: true, glow: false },
};

/**
 * The plot's headline state, checked in this order — a single missed prayer
 * is enough to override tree growth entirely, so this is a hard gate rather
 * than folded into the quality gradient above.
 */
export type PlotState = "empty" | "growing" | "tombstoned" | "burning";

export function gardenPlotState(day: DayLogMap): PlotState {
  const missedCount = PRAYER_ORDER.filter((p) => day[p] === "missed").length;
  if (missedCount >= 5) return "burning";
  if (missedCount >= 1) return "tombstoned";
  const performedCount = PRAYER_ORDER.filter((p) => isPerformed(day[p] ?? "not_yet")).length;
  return performedCount > 0 ? "growing" : "empty";
}

export const GARDEN_STAGE_EMOJI: Record<GardenStage, string> = {
  empty: "▫️",
  seed: "🌱",
  sprout: "🌿",
  sapling: "🌾",
  tree: "🌳",
  flowering: "🌸",
};

export type GardenTier = "none" | "bronze" | "silver" | "gold";

/**
 * A fully-grown (100%) day gets a bigger flourish the longer the streak
 * leading up to it, so the garden keeps escalating instead of every perfect
 * day looking identical.
 */
export function gardenTier(streakLen: number): GardenTier {
  if (streakLen >= 14) return "gold";
  if (streakLen >= 7) return "silver";
  if (streakLen >= 3) return "bronze";
  return "none";
}

export const GARDEN_TIER_META: Record<GardenTier, { label: string; hint: string }> = {
  none: { label: "Full bloom", hint: "5/5, first day of a streak" },
  bronze: { label: "Bronze bloom", hint: "3+ day streak" },
  silver: { label: "Silver bloom", hint: "7+ day streak" },
  gold: { label: "Golden bloom", hint: "14+ day streak" },
};

export const GARDEN_STAGE_META: Record<
  GardenStage,
  { label: string; range: string; swatch: string }
> = {
  empty: { label: "No prayers yet", range: "0/5", swatch: "bg-neutral-200" },
  seed: { label: "Budding sprout", range: "1/5", swatch: "bg-emerald-300" },
  sprout: { label: "Young plant", range: "2/5", swatch: "bg-emerald-400" },
  sapling: { label: "Sapling", range: "3/5", swatch: "bg-emerald-500" },
  tree: { label: "Growing tree", range: "4/5", swatch: "bg-emerald-600" },
  flowering: { label: "Full bloom tree", range: "5/5", swatch: "bg-rose-400" },
};
