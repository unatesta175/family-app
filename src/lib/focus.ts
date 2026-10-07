/**
 * The Focus module's pure logic: how a session unfolds over time (focus blocks and Pomodoro breaks),
 * how the tree grows, and the totals the Grove and Stats pages show. No DB access and no server-only
 * imports, so the timer on the client and the checks on the server use exactly the same maths.
 */

export const MIN_MINUTES = 5;
export const MAX_MINUTES = 180;
/** Cancelling in the first seconds is a mistaken start: no stump is left behind. */
export const GRACE_SECONDS = 30;

export const FOCUS_SPECIES = ["oak", "pine", "sakura", "maple"] as const;
export type FocusSpecies = (typeof FOCUS_SPECIES)[number];
export const SPECIES_LABEL: Record<FocusSpecies, string> = { oak: "Oak", pine: "Pine", sakura: "Sakura", maple: "Maple" };

export type FocusMode = "single" | "pomodoro";

/** The classic Pomodoro rhythm: 25 minutes of focus, a 5 minute break, and a long break after four. */
export const POMODORO = { focus: 25 * 60, short: 5 * 60, long: 15 * 60, every: 4 } as const;

export type Segment = { kind: "focus" | "break"; seconds: number };

/** The focus and break blocks a session is made of. A single session is one block of focus. */
export function segmentsFor(plannedSeconds: number, mode: FocusMode): Segment[] {
  if (mode !== "pomodoro" || plannedSeconds <= POMODORO.focus + 60) return [{ kind: "focus", seconds: plannedSeconds }];
  const out: Segment[] = [];
  let left = plannedSeconds;
  let n = 0;
  while (left > 0) {
    // Don't leave a sliver of a block at the end: fold a short remainder into the last block.
    const block = left - POMODORO.focus < 300 ? left : POMODORO.focus;
    out.push({ kind: "focus", seconds: block });
    left -= block;
    n += 1;
    if (left > 0) out.push({ kind: "break", seconds: n % POMODORO.every === 0 ? POMODORO.long : POMODORO.short });
  }
  return out;
}

export type Timeline = {
  phase: "focus" | "break" | "done";
  /** Seconds of focus put in so far (breaks do not count). */
  focusElapsed: number;
  /** Seconds since the session started, breaks included. */
  wallElapsed: number;
  /** The whole session on the clock, breaks included. */
  wallTotal: number;
  /** Seconds left in the current block. */
  phaseRemaining: number;
  /** 0-1 share of the focus time done: this is what grows the tree. */
  progress: number;
  /** Which focus block this is (1 based) and how many there are. */
  block: number;
  blocks: number;
  done: boolean;
};

/** Where a session stands at `nowMs`, from its start time alone (so it survives sleep and reloads). */
export function timeline(startedAtMs: number, plannedSeconds: number, mode: FocusMode, nowMs: number): Timeline {
  const segs = segmentsFor(plannedSeconds, mode);
  const wallTotal = segs.reduce((n, s) => n + s.seconds, 0);
  const blocks = segs.filter((s) => s.kind === "focus").length;
  const wallElapsed = Math.max(0, (nowMs - startedAtMs) / 1000);

  if (wallElapsed >= wallTotal) {
    return { phase: "done", focusElapsed: plannedSeconds, wallElapsed: wallTotal, wallTotal, phaseRemaining: 0, progress: 1, block: blocks, blocks, done: true };
  }
  let t = wallElapsed;
  let focus = 0;
  let block = 0;
  for (const s of segs) {
    if (s.kind === "focus") block += 1;
    if (t < s.seconds) {
      return {
        phase: s.kind,
        focusElapsed: focus + (s.kind === "focus" ? t : 0),
        wallElapsed,
        wallTotal,
        phaseRemaining: s.seconds - t,
        progress: Math.min(1, (focus + (s.kind === "focus" ? t : 0)) / plannedSeconds),
        block,
        blocks,
        done: false,
      };
    }
    t -= s.seconds;
    if (s.kind === "focus") focus += s.seconds;
  }
  return { phase: "done", focusElapsed: plannedSeconds, wallElapsed: wallTotal, wallTotal, phaseRemaining: 0, progress: 1, block: blocks, blocks, done: true };
}

/**
 * A longer session grows a better tree. A 5 minute session still ends as a full, healthy tree, but
 * the design itself gets richer with the time: more leaves and branches, then blossoms, then a roots
 * and bigger crown, then a glow with fireflies, and at the top of the range a legendary tree with
 * golden fruit, rays of light and falling petals. The same six tiers apply in the 2.5D and 3D gardens.
 */
export type TreeTier = 1 | 2 | 3 | 4 | 5 | 6;
export const TREE_TIERS: { tier: TreeTier; name: string; minMinutes: number; blurb: string }[] = [
  { tier: 1, name: "Seedling tree", minMinutes: 5, blurb: "A healthy little tree" },
  { tier: 2, name: "Leafy tree", minMinutes: 15, blurb: "A fuller crown and branches" },
  { tier: 3, name: "Blooming tree", minMinutes: 30, blurb: "Blossoms and fruit appear" },
  { tier: 4, name: "Grand tree", minMinutes: 60, blurb: "A big crown with strong roots" },
  { tier: 5, name: "Ancient tree", minMinutes: 90, blurb: "A glowing tree with fireflies" },
  { tier: 6, name: "Legendary tree", minMinutes: 135, blurb: "Golden fruit, rays of light and falling petals" },
];

/** The tier of tree a session of this length grows. */
export function treeTier(plannedSeconds: number): TreeTier {
  const minutes = plannedSeconds / 60;
  let tier: TreeTier = 1;
  for (const t of TREE_TIERS) if (minutes >= t.minMinutes) tier = t.tier;
  return tier;
}

export const tierInfo = (tier: TreeTier) => TREE_TIERS[tier - 1];

export const STAGES = ["Seed", "Sprout", "Sapling", "Young tree", "Grown tree", "Full tree"] as const;
/** A name for how far the tree has grown. */
export function stageName(progress: number): string {
  return STAGES[Math.min(STAGES.length - 1, Math.floor(Math.max(0, progress) * (STAGES.length - 0.0001)))];
}

/** "1h 25m", "45m", "0m". */
export function formatFocus(seconds: number): string {
  const m = Math.round(seconds / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`;
}

/** 3725 -> "1:02:05", 90 -> "1:30". */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

// --- Totals ----------------------------------------------------------------------------------

export type SessionLite = {
  id: number;
  date: string;
  startedAt: number;
  habitId: number | null;
  species: FocusSpecies;
  status: "active" | "completed" | "withered";
  plannedSeconds: number;
  focusedSeconds: number;
};

export type DayTotals = { date: string; trees: number; withered: number; seconds: number; sessions: SessionLite[] };

/** Groups sessions by day. A finished session is a tree, a given-up one a stump; active ones are skipped. */
export function byDay(sessions: SessionLite[]): Map<string, DayTotals> {
  const out = new Map<string, DayTotals>();
  for (const s of sessions) {
    if (s.status === "active") continue;
    const d = out.get(s.date) ?? { date: s.date, trees: 0, withered: 0, seconds: 0, sessions: [] };
    if (s.status === "completed") d.trees += 1;
    else d.withered += 1;
    d.seconds += s.focusedSeconds;
    d.sessions.push(s);
    out.set(s.date, d);
  }
  for (const d of out.values()) d.sessions.sort((a, b) => a.startedAt - b.startedAt);
  return out;
}

export function summarize(sessions: SessionLite[]) {
  const done = sessions.filter((s) => s.status !== "active");
  const trees = done.filter((s) => s.status === "completed");
  const seconds = done.reduce((n, s) => n + s.focusedSeconds, 0);
  const longest = trees.reduce((m, s) => Math.max(m, s.plannedSeconds), 0);
  return {
    sessions: done.length,
    trees: trees.length,
    withered: done.length - trees.length,
    seconds,
    avgSeconds: trees.length ? Math.round(trees.reduce((n, s) => n + s.focusedSeconds, 0) / trees.length) : 0,
    longest,
    /** Share of started sessions that grew into a tree. */
    finishRate: done.length ? Math.round((trees.length / done.length) * 100) : null,
  };
}

/** Focused seconds for each hour of the day (0-23), by when sessions started. */
export function hourDistribution(sessions: SessionLite[]): number[] {
  const hours = Array(24).fill(0) as number[];
  for (const s of sessions) {
    if (s.status === "active" || s.focusedSeconds <= 0) continue;
    // Spread the time over the hours it actually covered.
    let t = s.startedAt;
    let left = s.focusedSeconds;
    while (left > 0) {
      const d = new Date(t);
      const next = new Date(t);
      next.setMinutes(60, 0, 0);
      const chunk = Math.min(left, Math.max(1, (next.getTime() - t) / 1000));
      hours[d.getHours()] += chunk;
      left -= chunk;
      t += chunk * 1000;
    }
  }
  return hours;
}

/** Days in a row, ending today or yesterday, with at least one finished tree. */
export function focusStreak(days: Map<string, DayTotals>, today: string, addDays: (iso: string, n: number) => string): number {
  let d = days.get(today)?.trees ? today : addDays(today, -1);
  let n = 0;
  while ((days.get(d)?.trees ?? 0) > 0) {
    n += 1;
    d = addDays(d, -1);
  }
  return n;
}
