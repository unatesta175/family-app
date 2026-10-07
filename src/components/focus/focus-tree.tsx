import type { FocusSpecies } from "@/lib/focus";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 2);

type Palette = { leaf: [string, string, string]; trunk: string; trunkDark: string };

/** Leaf colours (dark, mid, light) per species. */
const PALETTE: Record<FocusSpecies, Palette> = {
  oak: { leaf: ["#2a8a3c", "#46b34f", "#8be08a"], trunk: "#8a5a32", trunkDark: "#6b4425" },
  pine: { leaf: ["#146349", "#1f8a5f", "#4fc08e"], trunk: "#6f4a2c", trunkDark: "#563820" },
  sakura: { leaf: ["#e9739f", "#f6a1c0", "#ffd9e8"], trunk: "#74503f", trunkDark: "#593d30" },
  maple: { leaf: ["#c2410c", "#ec6b1a", "#fbbf24"], trunk: "#83502c", trunkDark: "#633b20" },
};
const WITHERED: Palette = { leaf: ["#8b7e66", "#a89d84", "#c4baa1"], trunk: "#6a5543", trunkDark: "#4f3f31" };

/**
 * Where each leaf sits relative to the top of the trunk once the tree is full grown (x, y, angle in
 * degrees, size), and how far along the growth it appears (`at`). Leaves near the middle appear first, so
 * the tree fills out from a sprout of a few leaves to a full crown.
 */
const LEAVES: { x: number; y: number; a: number; s: number; at: number; tone: 0 | 1 | 2 }[] = [
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

/**
 * A tree drawn in flat shapes (SVG) that grows with \`progress\` (0 to 1): a few leaves on a thin stem,
 * then a taller trunk, branches and a full crown. Conifers (pine) grow in tiers instead. \`withered\`
 * greys it out and lets it droop. It is cheap, so a garden of hundreds is fine; turn \`animate\` off there.
 */
export function FocusTree({
  progress,
  species,
  withered = false,
  animate = true,
  className,
  x,
  y,
  width,
  height,
}: {
  progress: number;
  species: FocusSpecies;
  withered?: boolean;
  animate?: boolean;
  className?: string;
  x?: number;
  y?: number;
  width?: number | string;
  height?: number | string;
}) {
  const p = clamp01(progress);
  const col = withered ? WITHERED : PALETTE[species];
  const g = easeOut(p);
  const tr = animate ? "all 1s linear" : undefined;

  return (
    <svg viewBox="0 0 100 120" x={x} y={y} width={width} height={height} className={className} role="img" aria-label={withered ? "Withered tree" : "Tree"} overflow="visible">
      {/* ground shadow */}
      <ellipse cx="50" cy="106" rx={lerp(10, 25, g)} ry={lerp(2.6, 4.2, g)} fill="#06281a" opacity="0.28" />

      {species === "pine" && !withered ? <Pine p={p} col={col} tr={tr} /> : <Leafy p={p} col={col} withered={withered} tr={tr} species={species} />}

      {withered && (
        <g fill={col.leaf[1]} opacity="0.9">
          <ellipse cx="33" cy="107" rx="3.6" ry="1.5" transform="rotate(-20 33 107)" />
          <ellipse cx="68" cy="108" rx="3.6" ry="1.5" transform="rotate(25 68 108)" />
          <ellipse cx="56" cy="110" rx="3" ry="1.3" />
        </g>
      )}
    </svg>
  );
}

function Leafy({ p, col, withered, tr, species }: { p: number; col: Palette; withered: boolean; tr?: string; species: FocusSpecies }) {
  const g = easeOut(p);
  // The trunk stretches from a short stem to a tall one; the crown sits on top of it.
  const trunkH = lerp(14, 46, g);
  const tx = 50 + Math.sin(p * 2.4) * 1.5;
  const ty = 105 - trunkH;
  const cs = lerp(0.5, 1, g); // crown scale
  const sw = lerp(2.4, 6.4, g);

  return (
    <g>
      {/* trunk and two branches, drawn along their length so they grow rather than just scale */}
      <path d={`M50 105 C ${50 + (withered ? 2 : -1)} ${105 - trunkH * 0.45}, ${tx + 1} ${ty + trunkH * 0.3}, ${tx} ${ty}`} stroke={col.trunk} strokeWidth={sw} strokeLinecap="round" fill="none" style={{ transition: tr }} />
      {p > 0.3 && (
        <g stroke={col.trunkDark} strokeLinecap="round" fill="none" style={{ transition: tr }}>
          <path d={`M${tx} ${ty + trunkH * 0.32} Q ${tx - 8 * cs} ${ty + trunkH * 0.18} ${tx - 14 * cs} ${ty + trunkH * 0.08}`} strokeWidth={sw * 0.38} />
          <path d={`M${tx} ${ty + trunkH * 0.46} Q ${tx + 8 * cs} ${ty + trunkH * 0.32} ${tx + 15 * cs} ${ty + trunkH * 0.2}`} strokeWidth={sw * 0.38} />
        </g>
      )}

      {LEAVES.map((l, i) => {
        if (withered && i % 3 !== 0) return null; // a withered tree keeps only a few dry leaves
        const k = clamp01((p - l.at) / 0.1);
        if (k <= 0) return null;
        const lx = tx + l.x * cs;
        const ly = ty + l.y * cs + (withered ? 10 : 0);
        const rot = l.a + (withered ? (l.a >= 0 ? 38 : -38) : 0);
        const size = l.s * k * (species === "sakura" ? 0.85 : 1);
        const fill = col.leaf[l.tone];
        return (
          <g key={i} style={{ transform: `translate(${lx}px, ${ly}px) rotate(${rot}deg) scale(${size})`, transition: tr }}>
            {species === "sakura" && !withered ? (
              <>
                <circle cx="0" cy="-5" r="6.2" fill={fill} />
                <circle cx="0" cy="-5" r="1.6" fill="#fff6" />
              </>
            ) : (
              <>
                <ellipse cx="0" cy="-6" rx="3.9" ry="9" fill={fill} />
                <path d="M0 -14 L0 1" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="0.7" strokeLinecap="round" />
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}

/** A conifer that grows in tiers, from a small cone to four stacked layers. */
function Pine({ p, col, tr }: { p: number; col: Palette; tr?: string }) {
  const g = easeOut(p);
  const trunkH = lerp(8, 18, g);
  const tiers = [
    { w: 40, top: -6, h: 30, at: 0.0, c: col.leaf[0] },
    { w: 33, top: -26, h: 28, at: 0.22, c: col.leaf[1] },
    { w: 26, top: -44, h: 26, at: 0.46, c: col.leaf[1] },
    { w: 18, top: -60, h: 24, at: 0.7, c: col.leaf[2] },
  ];
  return (
    <g>
      <rect x="46" y={105 - trunkH} width="8" height={trunkH} rx="1.5" fill={col.trunk} style={{ transition: tr }} />
      {tiers.map((t, i) => {
        const k = clamp01((p - t.at) / 0.22 + (i === 0 ? 0.35 : 0));
        if (k <= 0) return null;
        const base = 104 - trunkH * 0.6 + t.top * g * 0.78;
        return (
          <g key={i} style={{ transform: `translate(50px, ${base}px) scale(${lerp(0.4, 1, k) * lerp(0.55, 1, g)})`, transition: tr }}>
            <polygon points={`0,${-t.h} ${-t.w / 2},0 ${t.w / 2},0`} fill={t.c} />
            <polygon points={`0,${-t.h} ${t.w / 2},0 0,0`} fill="#000" opacity="0.1" />
          </g>
        );
      })}
    </g>
  );
}
