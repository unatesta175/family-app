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

/**
 * The rhythm of a Pomodoro session: how long each focus block and break runs, and how often a longer
 * break falls. `focus`, `short` and `long` are in seconds; `every` is the number of focus blocks
 * between long breaks. A session carries its own config, so different rhythms sit side by side.
 */
export type PomodoroConfig = { focus: number; short: number; long: number; every: number };

/** The classic Pomodoro rhythm: 25 minutes of focus, a 5 minute break, and a long break after four. */
export const POMODORO: PomodoroConfig = { focus: 25 * 60, short: 5 * 60, long: 15 * 60, every: 4 };

/**
 * Ready-made rhythms, each grounded in research on how people sustain attention. `cycles` is the
 * default number of focus blocks the preset suggests. A preset with no distinct long break sets
 * `long` equal to `short` and `every` out of reach.
 */
export type PomodoroPreset = PomodoroConfig & { key: string; name: string; cycles: number; blurb: string };
export const POMODORO_PRESETS: PomodoroPreset[] = [
  {
    key: "classic",
    name: "Classic Pomodoro",
    focus: 25 * 60,
    short: 5 * 60,
    long: 15 * 60,
    every: 4,
    cycles: 4,
    blurb: "Cirillo's original 25/5 rhythm — short blocks that beat procrastination, a long rest after four.",
  },
  {
    key: "desktime",
    name: "DeskTime 52 / 17",
    focus: 52 * 60,
    short: 17 * 60,
    long: 17 * 60,
    every: 99,
    cycles: 4,
    blurb: "From DeskTime's study of the most productive people — longer deep-work blocks with real recovery.",
  },
  {
    key: "ultradian",
    name: "Ultradian 90 / 20",
    focus: 90 * 60,
    short: 20 * 60,
    long: 20 * 60,
    every: 99,
    cycles: 2,
    blurb: "The body's ~90-minute ultradian cycle (BRAC) — for deep, immersive work in a few long waves.",
  },
];

export type Segment = { kind: "focus" | "break"; seconds: number };

/**
 * The focus and break blocks a session is made of. A single session is one block of focus; a Pomodoro
 * session is sliced into `cfg.focus`-long blocks with breaks between (a longer one every `cfg.every`).
 */
export function segmentsFor(plannedSeconds: number, mode: FocusMode, cfg: PomodoroConfig = POMODORO): Segment[] {
  if (mode !== "pomodoro" || plannedSeconds <= cfg.focus + 60) return [{ kind: "focus", seconds: plannedSeconds }];
  const out: Segment[] = [];
  let left = plannedSeconds;
  let n = 0;
  while (left > 0) {
    // Don't leave a sliver of a block at the end: fold a short remainder into the last block.
    const block = left - cfg.focus < 300 ? left : cfg.focus;
    out.push({ kind: "focus", seconds: block });
    left -= block;
    n += 1;
    if (left > 0) out.push({ kind: "break", seconds: n % cfg.every === 0 ? cfg.long : cfg.short });
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
  /** The current focus block's length, and how far it has grown (0-1). Each block is its own tree. */
  blockSeconds: number;
  blockProgress: number;
  done: boolean;
};

/** Where a session stands at `nowMs`, from its start time alone (so it survives sleep and reloads). */
export function timeline(startedAtMs: number, plannedSeconds: number, mode: FocusMode, nowMs: number, cfg: PomodoroConfig = POMODORO): Timeline {
  const segs = segmentsFor(plannedSeconds, mode, cfg);
  const wallTotal = segs.reduce((n, s) => n + s.seconds, 0);
  const blocks = segs.filter((s) => s.kind === "focus").length;
  const wallElapsed = Math.max(0, (nowMs - startedAtMs) / 1000);

  const lastBlock = [...segs].reverse().find((s) => s.kind === "focus")?.seconds ?? plannedSeconds;
  if (wallElapsed >= wallTotal) {
    return { phase: "done", focusElapsed: plannedSeconds, wallElapsed: wallTotal, wallTotal, phaseRemaining: 0, progress: 1, block: blocks, blocks, blockSeconds: lastBlock, blockProgress: 1, done: true };
  }
  let t = wallElapsed;
  let focus = 0;
  let block = 0;
  let lastFocusSeconds = segs.find((s) => s.kind === "focus")?.seconds ?? plannedSeconds;
  for (const s of segs) {
    if (s.kind === "focus") {
      block += 1;
      lastFocusSeconds = s.seconds;
    }
    if (t < s.seconds) {
      const onFocus = s.kind === "focus";
      // During a focus block the current tree is growing; during a break the block just finished is full.
      const blockSeconds = onFocus ? s.seconds : lastFocusSeconds;
      return {
        phase: s.kind,
        focusElapsed: focus + (onFocus ? t : 0),
        wallElapsed,
        wallTotal,
        phaseRemaining: s.seconds - t,
        progress: Math.min(1, (focus + (onFocus ? t : 0)) / plannedSeconds),
        block,
        blocks,
        blockSeconds,
        blockProgress: onFocus ? Math.min(1, t / s.seconds) : 1,
        done: false,
      };
    }
    t -= s.seconds;
    if (s.kind === "focus") focus += s.seconds;
  }
  return { phase: "done", focusElapsed: plannedSeconds, wallElapsed: wallTotal, wallTotal, phaseRemaining: 0, progress: 1, block: blocks, blocks, blockSeconds: lastBlock, blockProgress: 1, done: true };
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

// --- The user's own time zone --------------------------------------------------------------
// The server may run in another zone (UTC), so days and clock times are worked out from the
// browser's offset (minutes, as `Date.getTimezoneOffset()` gives it: UTC+8 is -480).

/** The calendar day (yyyy-mm-dd) it is at `ms` for someone with this offset. */
export function localDateFrom(ms: number, tzOffsetMin: number): string {
  return new Date(ms - tzOffsetMin * 60000).toISOString().slice(0, 10);
}

/** "2:58 PM" for a moment, in the user's zone. */
export function formatClockTime(ms: number, tzOffsetMin: number): string {
  const d = new Date(ms - tzOffsetMin * 60000);
  const h = d.getUTCHours();
  return `${h % 12 === 0 ? 12 : h % 12}:${String(d.getUTCMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

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
  mode: FocusMode;
  /** The Pomodoro rhythm this session ran at (classic 25/5/15/4 for single or older rows). */
  cfg: PomodoroConfig;
};

/**
 * One tree a session grows. A single session grows one; a Pomodoro session grows one per focus block,
 * each at the tier its block length earns. `grown` is a finished tree, `!grown` a withered stump.
 * `seconds` is the focus time this tree holds; `blockSeconds` is its block's full length.
 */
export type Tree = { tier: TreeTier; grown: boolean; seconds: number; blockSeconds: number };

/**
 * The trees a finished or given-up session leaves behind. A completed session turns every focus block
 * into a grown tree; a withered one keeps the blocks finished before giving up as grown trees and
 * leaves the block it stopped in as a single stump. Active sessions grow nothing yet.
 */
export function sessionTrees(s: Pick<SessionLite, "mode" | "plannedSeconds" | "cfg" | "status" | "focusedSeconds">): Tree[] {
  if (s.status === "active") return [];
  const blocks = segmentsFor(s.plannedSeconds, s.mode, s.cfg).filter((seg) => seg.kind === "focus");
  if (s.status === "completed") return blocks.map((b) => ({ tier: treeTier(b.seconds), grown: true, seconds: b.seconds, blockSeconds: b.seconds }));
  // Withered: focusedSeconds is the focus time actually put in (breaks excluded). Fill whole blocks
  // first, then the block the session stopped in becomes the stump.
  const trees: Tree[] = [];
  let left = s.focusedSeconds;
  for (const b of blocks) {
    if (left >= b.seconds) {
      trees.push({ tier: treeTier(b.seconds), grown: true, seconds: b.seconds, blockSeconds: b.seconds });
      left -= b.seconds;
    } else {
      trees.push({ tier: treeTier(b.seconds), grown: false, seconds: Math.max(0, left), blockSeconds: b.seconds });
      return trees;
    }
  }
  // Gave up during a break after the last block: no partial block to wither.
  return trees;
}

/** A tree standing in the garden: one entry per focus block, carrying what it needs to be drawn and labelled. */
export type PlantedTree = {
  key: string;
  date: string;
  startedAt: number;
  habitId: number | null;
  species: FocusSpecies;
  status: "completed" | "withered";
  tier: TreeTier;
  /** 0-1 growth for drawing (a grown tree is full; a stump shows how far its block got). */
  progress: number;
  seconds: number;
};

/** Expands sessions into the individual trees they planted, in the order the blocks happened. */
export function plantedTrees(sessions: SessionLite[]): PlantedTree[] {
  const out: PlantedTree[] = [];
  for (const s of sessions) {
    if (s.status === "active") continue;
    sessionTrees(s).forEach((t, i) => {
      out.push({
        key: `${s.id}-${i}`,
        date: s.date,
        startedAt: s.startedAt,
        habitId: s.habitId,
        species: s.species,
        status: t.grown ? "completed" : "withered",
        tier: t.tier,
        progress: t.grown ? 1 : Math.max(0.25, t.blockSeconds > 0 ? t.seconds / t.blockSeconds : 0.25),
        seconds: t.seconds,
      });
    });
  }
  return out;
}

export type DayTotals = { date: string; trees: number; withered: number; seconds: number; sessions: SessionLite[] };

/** Groups sessions by day. Each focus block is a tree (grown or a withered stump); active ones are skipped. */
export function byDay(sessions: SessionLite[]): Map<string, DayTotals> {
  const out = new Map<string, DayTotals>();
  for (const s of sessions) {
    if (s.status === "active") continue;
    const d = out.get(s.date) ?? { date: s.date, trees: 0, withered: 0, seconds: 0, sessions: [] };
    for (const t of sessionTrees(s)) {
      if (t.grown) d.trees += 1;
      else d.withered += 1;
    }
    d.seconds += s.focusedSeconds;
    d.sessions.push(s);
    out.set(s.date, d);
  }
  for (const d of out.values()) d.sessions.sort((a, b) => a.startedAt - b.startedAt);
  return out;
}

export function summarize(sessions: SessionLite[]) {
  const done = sessions.filter((s) => s.status !== "active");
  const allTrees = done.flatMap(sessionTrees);
  const grown = allTrees.filter((t) => t.grown);
  const seconds = done.reduce((n, s) => n + s.focusedSeconds, 0);
  const longest = grown.reduce((m, t) => Math.max(m, t.seconds), 0);
  return {
    sessions: done.length,
    trees: grown.length,
    withered: allTrees.length - grown.length,
    seconds,
    avgSeconds: grown.length ? Math.round(grown.reduce((n, t) => n + t.seconds, 0) / grown.length) : 0,
    longest,
    /** Share of trees that grew (rather than withering). */
    finishRate: allTrees.length ? Math.round((grown.length / allTrees.length) * 100) : null,
  };
}

/** Focused seconds for each hour of the day (0-23) in the user's zone, by when the time was spent. */
export function hourDistribution(sessions: SessionLite[], tzOffsetMin: number = new Date().getTimezoneOffset()): number[] {
  const hours = Array(24).fill(0) as number[];
  for (const s of sessions) {
    if (s.status === "active" || s.focusedSeconds <= 0) continue;
    // Spread the time over the hours it actually covered.
    let t = s.startedAt;
    let left = s.focusedSeconds;
    while (left > 0) {
      const d = new Date(t - tzOffsetMin * 60000);
      const toNextHour = 3600 - (d.getUTCMinutes() * 60 + d.getUTCSeconds());
      const chunk = Math.min(left, Math.max(1, toNextHour));
      hours[d.getUTCHours()] += chunk;
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
