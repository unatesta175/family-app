import { addDays } from "@/lib/date";
import { computeStreak, dayState, totalDone, type HabitLite, type HabitLogMap } from "@/lib/habits";

/**
 * "Where do I stand in the world?" An estimate, not a measurement.
 *
 * There is no global dataset behind this: no company publishes how disciplined 8 billion people are.
 * So the app models it. Roughly half of the planet is out of reach (children, people with no time or
 * freedom to build routines), so the pool it compares you with is about 4 billion people who could
 * be working on habits. Research on habit formation (about two months to automate one, and most
 * resolutions fading within weeks) says staying consistent is rare, so the share of people who keep
 * it up falls off very fast. The model turns your logged consistency into a 0 to 1000 "discipline
 * score", then reads it off a curve of anchors: a first good start is top 50%, a month of showing up
 * about top 20%, four months of near-perfect consistency about top 1%, and only a year of it across
 * several habits reaches the top 100.
 */
export const WORLD_POOL = 4_000_000_000;
export const WORLD_POPULATION = 8_100_000_000;

/** How many recent days count towards the consistency part of the score. */
export const STANDING_WINDOW = 120;

export type StandingInput = {
  /** Days in the window with at least one habit done. */
  activeDays: number;
  /** 0-1: done / counted across every habit and day in the window. */
  rate: number;
  /** Longest current streak across habits, in days. */
  streakDays: number;
  /** Habits with a real track record (7+ days done in the window). */
  habitCount: number;
  /** Every completed check-in, ever. */
  totalCheckins: number;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** 0-1000. Consistency over four months, the current streak, how many habits, and sheer volume. */
export function disciplineScore(i: StandingInput): number {
  const consistency = 400 * clamp01(i.activeDays / STANDING_WINDOW) * Math.pow(clamp01(i.rate), 1.5);
  const streak = 350 * clamp01(i.streakDays / STANDING_WINDOW);
  const breadth = 150 * clamp01(i.habitCount / 5);
  const volume = 100 * clamp01(i.totalCheckins / 1500);
  return consistency + streak + breadth + volume;
}

/** [score, top percent of the pool]. Read off in log space, so each step feels like a real jump. */
const ANCHORS: [number, number][] = [
  [0, 50],
  [40, 40],
  [120, 25],
  [250, 12],
  [400, 5],
  [550, 2.5],
  [700, 1.5],
  [850, 1],
  [920, 0.1],
  [960, 0.001],
  [985, 0.00001],
  [1000, 0.0000025], // 100 people out of 4 billion
];

/** The share of the pool you are ahead of the rest of, as "top X%". */
export function topPercent(score: number): number {
  const s = Math.max(0, Math.min(1000, score));
  for (let i = 1; i < ANCHORS.length; i++) {
    const [s1, p1] = ANCHORS[i];
    if (s <= s1) {
      const [s0, p0] = ANCHORS[i - 1];
      const t = (s - s0) / (s1 - s0);
      return Math.pow(10, Math.log10(p0) + t * (Math.log10(p1) - Math.log10(p0)));
    }
  }
  return ANCHORS[ANCHORS.length - 1][1];
}

export const TIERS = [
  { name: "Starter", top: 100 },
  { name: "Builder", top: 50 },
  { name: "Consistent", top: 25 },
  { name: "Disciplined", top: 10 },
  { name: "Elite", top: 2.5 },
  { name: "Master", top: 1 },
  { name: "Legend", top: 0.001 },
  { name: "World class", top: 0.0000025 },
] as const;

export type Standing = {
  /** False until the first habit is done: there is nobody to compare yet. */
  ranked: boolean;
  score: number;
  /** Top X percent of the pool. */
  topPercent: number;
  /** Estimated place among the pool, 1 = the best. */
  rank: number;
  tier: string;
  next: { tier: string; topPercent: number; hint: string } | null;
};

export function formatTopPercent(p: number): string {
  if (p >= 10) return `${Math.round(p)}%`;
  if (p >= 1) return `${Math.round(p * 10) / 10}%`;
  if (p >= 0.01) return `${Math.round(p * 100) / 100}%`;
  if (p >= 0.0001) return `${Math.round(p * 10000) / 10000}%`;
  return `${p.toPrecision(2)}%`;
}

/** "#40,000,000", or "#100" at the very top. */
export function formatRank(rank: number): string {
  return `#${Math.max(1, Math.round(rank)).toLocaleString("en-US")}`;
}

function tierFor(top: number): number {
  let idx = 0;
  TIERS.forEach((t, i) => {
    if (top <= t.top) idx = i;
  });
  return idx;
}

/** The standing for a score, with the next tier and what it would take to get there. */
export function standingFor(input: StandingInput): Standing {
  const ranked = input.totalCheckins > 0;
  const score = ranked ? disciplineScore(input) : 0;
  const top = ranked ? topPercent(score) : 100;
  const idx = tierFor(top);
  const nextTier = TIERS[idx + 1] ?? null;
  let next: Standing["next"] = null;
  if (ranked && nextTier) {
    // How many more days of showing up would reach the next tier?
    let days: number | null = null;
    for (let add = 1; add <= 365; add++) {
      const sim: StandingInput = {
        ...input,
        activeDays: Math.min(STANDING_WINDOW, input.activeDays + add),
        streakDays: input.streakDays + add,
        totalCheckins: input.totalCheckins + add * Math.max(1, input.habitCount),
      };
      if (topPercent(disciplineScore(sim)) <= nextTier.top) {
        days = add;
        break;
      }
    }
    next = {
      tier: nextTier.name,
      topPercent: nextTier.top,
      hint:
        days !== null
          ? `${days} more day${days === 1 ? "" : "s"} of showing up gets you to ${nextTier.name} (top ${formatTopPercent(nextTier.top)}).`
          : `Add another habit and keep your completion rate high to reach ${nextTier.name}.`,
    };
  }
  return { ranked, score, topPercent: top, rank: (top / 100) * WORLD_POOL, tier: TIERS[idx].name, next };
}

/** The four parts of the score, with what each is out of, for the guide. */
export function scoreBreakdown(i: StandingInput) {
  return [
    { key: "consistency", label: "Consistency", max: 400, points: 400 * clamp01(i.activeDays / STANDING_WINDOW) * Math.pow(clamp01(i.rate), 1.5), hint: "Days you showed up in the last 4 months, weighted by how often you hit the goal." },
    { key: "streak", label: "Streak", max: 350, points: 350 * clamp01(i.streakDays / STANDING_WINDOW), hint: "Your current unbroken run. 120 days fills it." },
    { key: "track", label: "Track record", max: 150, points: 150 * clamp01(i.habitCount / 5), hint: "How long you have kept this habit going. A year of check-ins fills it." },
    { key: "volume", label: "Volume", max: 100, points: 100 * clamp01(i.totalCheckins / 1500), hint: "Every check-in you have ever made. 1,500 fills it." },
  ];
}

/**
 * What it takes to reach each tier: the days of perfect, uninterrupted effort on a single habit
 * (found by running the model forward), and the estimated place that tier means.
 */
export function tierLadder(): { name: string; top: number; rank: number; days: number | null }[] {
  return TIERS.map((t) => {
    let days: number | null = null;
    if (t.top >= 100) days = 1;
    else {
      for (let d = 1; d <= 2000; d++) {
        const sim: StandingInput = { activeDays: Math.min(STANDING_WINDOW, d), rate: 1, streakDays: d, habitCount: Math.min(5, d / 73), totalCheckins: d };
        if (topPercent(disciplineScore(sim)) <= t.top) {
          days = d;
          break;
        }
      }
    }
    return { name: t.name, top: t.top, rank: Math.max(1, Math.min(t.top, 100) / 100 * WORLD_POOL), days };
  });
}

/**
 * The inputs for ONE habit, so every habit has its own standing instead of one blended number. A
 * single habit has no "how many habits" to lean on, so its track record is how long it has been kept up.
 */
export function habitStandingInput(habit: HabitLite, logs: HabitLogMap, today: string): StandingInput {
  const from = addDays(today, -(STANDING_WINDOW - 1));
  let done = 0;
  let counted = 0;
  let activeDays = 0;
  for (let d = from; d <= today; d = addDays(d, 1)) {
    const s = dayState(habit, logs, d, today);
    if (s === "done") {
      done += 1;
      counted += 1;
      activeDays += 1;
    } else if (s === "partial" || s === "missed" || s === "slipped") {
      counted += 1;
    }
  }
  const st = computeStreak(habit, logs, today);
  const unitDays = { day: 1, week: 7, month: 30, year: 365 } as const;
  const total = totalDone(habit, logs);
  return {
    activeDays,
    rate: counted === 0 ? 0 : done / counted,
    streakDays: Math.min(st.current * unitDays[st.unit], 3650),
    habitCount: Math.min(5, total / 73),
    totalCheckins: total,
  };
}

/** Works out the model's inputs from a person's habits and logs. */
export function standingInput(habits: HabitLite[], logsByHabit: Record<number, HabitLogMap>, today: string): StandingInput {
  const from = addDays(today, -(STANDING_WINDOW - 1));
  const doneByDay = new Map<string, number>();
  let done = 0;
  let counted = 0;
  let habitCount = 0;
  let streakDays = 0;
  let totalCheckins = 0;
  const unitDays = { day: 1, week: 7, month: 30, year: 365 } as const;

  for (const h of habits) {
    const logs = logsByHabit[h.id] ?? {};
    let doneHere = 0;
    for (let d = from; d <= today; d = addDays(d, 1)) {
      const s = dayState(h, logs, d, today);
      if (s === "done") {
        done += 1;
        counted += 1;
        doneHere += 1;
        doneByDay.set(d, (doneByDay.get(d) ?? 0) + 1);
      } else if (s === "partial" || s === "missed" || s === "slipped") {
        counted += 1;
      }
    }
    if (doneHere >= 7) habitCount += 1;
    const st = computeStreak(h, logs, today);
    streakDays = Math.max(streakDays, st.current * unitDays[st.unit]);
    totalCheckins += totalDone(h, logs);
  }

  return {
    activeDays: doneByDay.size,
    rate: counted === 0 ? 0 : done / counted,
    streakDays: Math.min(streakDays, 3650),
    habitCount,
    totalCheckins,
  };
}
