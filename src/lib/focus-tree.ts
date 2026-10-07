import type { FocusSpecies, TreeTier } from "@/lib/focus";

/**
 * One description of a tree, used by BOTH the 2.5D (SVG) and the 3D renderer, so a tier looks the same
 * in either. Everything is in the 2D drawing's units: a 100 x 120 box with the ground at y = 105 and y
 * growing downwards. The 3D scene maps these units to world space, so the crown always sits on the trunk.
 */

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 2);

export type Palette = { leaf: [string, string, string]; trunk: string; trunkDark: string; bloom: string };

/** Leaf colours (dark, mid, light), trunk colours and the blossom colour per species. */
export const PALETTE: Record<FocusSpecies, Palette> = {
  oak: { leaf: ["#2a8a3c", "#46b34f", "#8be08a"], trunk: "#8a5a32", trunkDark: "#6b4425", bloom: "#ffe27a" },
  pine: { leaf: ["#146349", "#1f8a5f", "#4fc08e"], trunk: "#6f4a2c", trunkDark: "#563820", bloom: "#ff6b6b" },
  sakura: { leaf: ["#e9739f", "#f6a1c0", "#ffd9e8"], trunk: "#74503f", trunkDark: "#593d30", bloom: "#ffffff" },
  maple: { leaf: ["#c2410c", "#ec6b1a", "#fbbf24"], trunk: "#83502c", trunkDark: "#633b20", bloom: "#fff0b3" },
};
export const WITHERED: Palette = { leaf: ["#8b7e66", "#a89d84", "#c4baa1"], trunk: "#6a5543", trunkDark: "#4f3f31", bloom: "#c4baa1" };

type Leaf = { x: number; y: number; a: number; s: number; at: number; tone: 0 | 1 | 2 };

/**
 * Where each leaf sits relative to the top of the trunk once the tree is full grown (x, y, angle in
 * degrees, size), and how far along the growth it appears (`at`). Leaves near the middle appear first, so
 * the tree fills out from a sprout of a few leaves to a full crown.
 */
export const INNER: Leaf[] = [
  { x: 0, y: -4, a: 0, s: 1.0, at: 0.0, tone: 1 },
  { x: -6, y: -1, a: -50, s: 0.95, at: 0.0, tone: 2 },
  { x: 6, y: -1, a: 50, s: 0.95, at: 0.02, tone: 1 },
  { x: -10, y: -10, a: -28, s: 1.0, at: 0.16, tone: 0 },
  { x: 10, y: -10, a: 28, s: 1.0, at: 0.18, tone: 2 },
  { x: 0, y: -14, a: 4, s: 1.05, at: 0.2, tone: 2 },
  { x: -17, y: 0, a: -68, s: 1.05, at: 0.3, tone: 1 },
  { x: 17, y: 0, a: 68, s: 1.05, at: 0.32, tone: 0 },
  { x: -14, y: -17, a: -38, s: 1.0, at: 0.42, tone: 1 },
  { x: 14, y: -17, a: 38, s: 1.0, at: 0.44, tone: 2 },
  { x: -5, y: -22, a: -14, s: 1.0, at: 0.52, tone: 1 },
  { x: 6, y: -23, a: 16, s: 1.0, at: 0.54, tone: 0 },
  { x: -23, y: -8, a: -76, s: 0.95, at: 0.64, tone: 2 },
  { x: 23, y: -8, a: 76, s: 0.95, at: 0.66, tone: 1 },
  { x: -20, y: -20, a: -52, s: 0.95, at: 0.76, tone: 0 },
  { x: 20, y: -20, a: 52, s: 0.95, at: 0.78, tone: 1 },
  { x: 0, y: -28, a: 0, s: 1.0, at: 0.86, tone: 2 },
  { x: -10, y: -27, a: -24, s: 0.9, at: 0.92, tone: 1 },
  { x: 10, y: -27, a: 24, s: 0.9, at: 0.94, tone: 0 },
];

/** A ring of extra leaves around the crown for the bigger tiers. */
function outerRing(count: number, radius: number, lift: number, startAt: number): Leaf[] {
  return Array.from({ length: count }, (_, i) => {
    const ang = (i / count) * Math.PI * 2 + 0.2;
    return {
      x: Math.cos(ang) * radius,
      y: -14 + Math.sin(ang) * radius * 0.78 - lift,
      a: (Math.cos(ang) >= 0 ? 1 : -1) * (30 + Math.abs(Math.cos(ang)) * 50),
      s: 0.95,
      at: startAt + (i / count) * (0.95 - startAt),
      tone: (i % 3) as 0 | 1 | 2,
    };
  });
}

/** Crown size, trunk thickness and blossom count for each tier. */
export const CROWN = [0.86, 0.96, 1.02, 1.14, 1.24, 1.34];
export const TRUNK = [1, 1.1, 1.25, 1.5, 1.8, 2.1];
export const BLOOMS = [0, 0, 6, 9, 13, 18];
export const PINE_LAYERS = [4, 4, 5, 5, 6, 7];
export const PINE_SCALE = [0.9, 0.98, 1.04, 1.12, 1.2, 1.28];

export function leavesFor(tier: TreeTier): Leaf[] {
  const base = tier === 1 ? INNER.slice(0, 13) : INNER;
  const out = [...base];
  if (tier >= 4) out.push(...outerRing(12, 31, 0, 0.5));
  if (tier >= 6) out.push(...outerRing(9, 18, 8, 0.62));
  // Spread the appearance times across the whole session, so the tree keeps visibly changing.
  const maxAt = Math.max(...out.map((l) => l.at), 0.01);
  return out.map((l) => ({ ...l, at: (l.at / maxAt) * 0.9 })).sort((a, b) => a.at - b.at);
}

export type Curve = { from: [number, number]; ctrl: [number, number]; to: [number, number]; width: number };
export type LeafSpec = { x: number; y: number; rot: number; size: number; fill: string; round: boolean };
export type BloomSpec = { x: number; y: number; scale: number; r: number; color: string; fruit: boolean; pulse: boolean };
export type PineLayer = { baseY: number; w: number; h: number; color: string; scale: number; tip: boolean; baubles: boolean; bauble: [[number, number, string], [number, number, string]] };

export type DeadBranch = { x0: number; y0: number; x1: number; y1: number; w: number; twig: { x: number; y: number } };
/** A dead tree: a thick bare trunk tapering to a point, angular branches with forks, knots, and dry litter at the foot. */
export type DeadSpec = { h: number; baseW: number; topW: number; branches: DeadBranch[]; knots: [number, number][]; litter: [number, number][]; colors: { trunk: string; shade: string; branch: string; litter: string } };

export type TreeSpec = {
  species: FocusSpecies;
  tier: TreeTier;
  withered: boolean;
  p: number;
  g: number;
  /** How much of the finishing touches (blossoms, glow, rays) show yet, 0 to 1. */
  fx: number;
  col: Palette;
  shadow: { rx: number; ry: number };
  ring: { rx: number; opacity: number } | null;
  rays: { opacity: number } | null;
  halo: { cy: number; r: number; opacity: number } | null;
  roots: { width: number; deep: boolean } | null;
  foot: { tier: TreeTier } | null;
  sparks: { tier: TreeTier; fx: number } | null;
  kind: "leafy" | "pine" | "dead";
  /** Set when the tree is withered. */
  dead: DeadSpec | null;
  // leafy
  trunk: { x0: number; y0: number; c1: [number, number]; c2: [number, number]; x1: number; y1: number; width: number };
  branches: Curve[];
  leaves: LeafSpec[];
  blooms: BloomSpec[];
  /** The crown's centre (where the trunk ends), for placing glow and rays. */
  top: [number, number];
  // pine
  pine: { trunkH: number; trunkW: number; layers: PineLayer[]; star: { y: number; scale: number } | null } | null;
};

/** Works out every part of a tree for a given growth `progress` (0 to 1), species and tier. */
export function treeSpec({ progress, species, tier, withered }: { progress: number; species: FocusSpecies; tier: TreeTier; withered: boolean }): TreeSpec {
  const p = clamp01(progress);
  const g = easeOut(p);
  const col = withered ? WITHERED : PALETTE[species];
  const fx = !withered && p > 0.6 ? clamp01((p - 0.6) / 0.35) : 0;
  const pine = species === "pine" && !withered;

  // ---- leafy trees
  const t = withered ? 1 : TRUNK[tier - 1];
  const trunkH = lerp(14, 44 + (tier - 1) * 1.4, g);
  const tx = 50 + Math.sin(p * 2.4) * 1.5;
  const ty = 105 - trunkH;
  const cs = lerp(0.5, 1, g) * (withered ? 0.9 : CROWN[tier - 1]);
  const sw = lerp(2.4, 6.4, g) * t;

  const branches: Curve[] = [];
  if (!pine && p > 0.3) {
    branches.push({ from: [tx, ty + trunkH * 0.32], ctrl: [tx - 8 * cs, ty + trunkH * 0.18], to: [tx - 14 * cs, ty + trunkH * 0.08], width: sw * 0.38 });
    branches.push({ from: [tx, ty + trunkH * 0.46], ctrl: [tx + 8 * cs, ty + trunkH * 0.32], to: [tx + 15 * cs, ty + trunkH * 0.2], width: sw * 0.38 });
    if (!withered && tier >= 4) branches.push({ from: [tx, ty + trunkH * 0.56], ctrl: [tx - 6 * cs, ty + trunkH * 0.46], to: [tx - 12 * cs, ty + trunkH * 0.4], width: sw * 0.32 });
  }

  const leaves: LeafSpec[] = [];
  if (!pine && !withered) {
    const list = leavesFor(tier);
    list.forEach((l, i) => {
      if (withered && i % 3 !== 0) return; // a withered tree keeps only a few dry leaves
      const k = clamp01((p - l.at) / 0.08);
      if (k <= 0) return;
      leaves.push({
        x: tx + l.x * cs,
        y: ty + l.y * cs + (withered ? 10 : 0),
        rot: l.a + (withered ? (l.a >= 0 ? 38 : -38) : 0),
        size: l.s * k * (species === "sakura" ? 0.85 : 1) * (tier >= 4 ? 1.08 : 1),
        fill: col.leaf[l.tone],
        round: species === "sakura" && !withered,
      });
    });
  }

  const blooms: BloomSpec[] = [];
  const bloomCount = withered || pine ? 0 : BLOOMS[tier - 1];
  if (fx > 0) {
    for (let i = 0; i < bloomCount; i++) {
      const base = INNER[(i * 5 + 3) % INNER.length];
      const fruit = tier >= 5 && i % 3 === 0;
      const show = clamp01(fx * bloomCount - i * 0.6);
      if (show <= 0) continue;
      blooms.push({
        x: tx + base.x * cs * 1.12 + (i % 2 ? 2 : -2),
        y: ty + base.y * cs * 1.1 - 3,
        scale: show,
        r: fruit ? 2.6 : 2.1,
        color: fruit ? (tier >= 6 ? "#ffd54a" : "#e5484d") : col.bloom,
        fruit,
        pulse: tier >= 6 && fruit,
      });
    }
  }

  // ---- a withered tree is a bare dead one, not a greyed leafy tree
  let dead: DeadSpec | null = null;
  if (withered) {
    const pp = Math.max(0.3, p); // even a tree that died early was a real tree
    const h = lerp(44, 66, easeOut(pp));
    const baseW = lerp(9, 13, easeOut(pp));
    const topW = 1.4;
    const widthAt = (f: number) => lerp(baseW, topW, f);
    // [height along the trunk, side, length, angle up in degrees]
    const limbs: [number, 1 | -1, number, number][] = [
      [0.3, -1, 17, 38],
      [0.42, 1, 19, 32],
      [0.55, -1, 15, 42],
      [0.66, 1, 13, 40],
      [0.78, -1, 9, 48],
      [0.86, 1, 8, 50],
    ];
    const branches: DeadBranch[] = limbs.map(([f, side, len, ang], i) => {
      const y0 = 105 - h * f;
      const x0 = 50 + side * (widthAt(f) / 2) * 0.85;
      const L = len * lerp(0.7, 1, pp);
      const a = (ang * Math.PI) / 180;
      const x1 = x0 + side * L * Math.cos(a);
      const y1 = y0 - L * Math.sin(a);
      return { x0, y0, x1, y1, w: lerp(2.6, 1.1, f) , twig: { x: x0 + (x1 - x0) * 0.62 + side * (4 + (i % 2)), y: y0 + (y1 - y0) * 0.62 - 6.5 } };
    });
    const knots: [number, number][] = [
      [49.5, 105 - h * 0.2],
      [51, 105 - h * 0.5],
      [49, 105 - h * 0.72],
    ];
    // dry needles and twigs lying around the foot of the trunk
    const litter: [number, number][] = [
      [38, 108],
      [41, 110.5],
      [45, 111],
      [57, 111],
      [61, 110],
      [64, 107.5],
      [36, 105.5],
      [66, 105],
    ];
    dead = { h, baseW, topW, branches, knots, litter, colors: { trunk: "#8f7455", shade: "#6e553c", branch: "#7d6347", litter: "#4f3d2b" } };
  }

  // ---- conifers
  let pineSpec: TreeSpec["pine"] = null;
  if (pine) {
    const layers = PINE_LAYERS[tier - 1];
    const scale = PINE_SCALE[tier - 1];
    const pTrunkH = lerp(8, 18, g);
    const items = Array.from({ length: layers }, (_, i) => ({
      w: lerp(42, 14, i / (layers - 1)),
      top: -6 - i * (62 / (layers - 1)) * 0.95,
      h: lerp(30, 22, i / (layers - 1)),
      at: (i / layers) * 0.88,
      color: i === 0 ? col.leaf[0] : i >= layers - 1 ? col.leaf[2] : col.leaf[1],
    }));
    const out: PineLayer[] = [];
    items.forEach((it, i) => {
      const k = clamp01((p - it.at) / 0.2 + (i === 0 ? 0.35 : 0));
      if (k <= 0) return;
      out.push({
        baseY: 104 - pTrunkH * 0.6 + it.top * g * 0.78 * scale,
        w: it.w,
        h: it.h,
        color: it.color,
        scale: lerp(0.4, 1, k) * lerp(0.55, 1, g) * scale,
        tip: tier >= 4,
        baubles: tier >= 3 && fx > 0,
        bauble: [
          [-it.w * 0.22, -it.h * 0.2, i % 2 ? "#ffd54a" : "#ff5c6c"],
          [it.w * 0.2, -it.h * 0.34, i % 2 ? "#ff5c6c" : "#ffd54a"],
        ],
      });
    });
    const last = items[items.length - 1];
    const topY = 104 - pTrunkH * 0.6 + last.top * g * 0.78 * scale;
    pineSpec = { trunkH: pTrunkH, trunkW: 8 * (1 + (tier - 1) * 0.08), layers: out, star: tier >= 6 && fx > 0 ? { y: topY - 8, scale: 0.8 + fx * 0.5 } : null };
  }

  return {
    species,
    tier,
    withered,
    p,
    g,
    fx,
    col,
    shadow: { rx: lerp(10, 25 + tier * 1.6, g), ry: lerp(2.6, 4.2, g) },
    ring: !withered && tier >= 5 && fx > 0 ? { rx: 30 + tier * 2, opacity: 0.45 * fx } : null,
    rays: !withered && tier >= 6 && fx > 0 ? { opacity: fx } : null,
    halo: !withered && tier >= 5 ? { cy: 105 - 46 * g - 6, r: lerp(14, 40, g), opacity: 0.2 + 0.8 * fx } : null,
    roots: !withered && tier >= 4 && p > 0.35 ? { width: lerp(1.2, 3.2, g), deep: tier >= 6 } : null,
    foot: !withered && tier >= 4 && p > 0.5 ? { tier } : null,
    sparks: !withered && tier >= 5 && fx > 0 ? { tier, fx } : null,
    kind: pine ? "pine" : withered ? "dead" : "leafy",
    dead,
    trunk: { x0: 50, y0: 105, c1: [50 + (withered ? 2 : -1), 105 - trunkH * 0.45], c2: [tx + 1, ty + trunkH * 0.3], x1: tx, y1: ty, width: sw },
    branches,
    leaves,
    blooms,
    top: [tx, ty],
    pine: pineSpec,
  };
}
