import type { FocusSpecies, TreeTier } from "@/lib/focus";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 2);

type Palette = { leaf: [string, string, string]; trunk: string; trunkDark: string; bloom: string };

/** Leaf colours (dark, mid, light), trunk colours and the blossom colour per species. */
const PALETTE: Record<FocusSpecies, Palette> = {
  oak: { leaf: ["#2a8a3c", "#46b34f", "#8be08a"], trunk: "#8a5a32", trunkDark: "#6b4425", bloom: "#ffe27a" },
  pine: { leaf: ["#146349", "#1f8a5f", "#4fc08e"], trunk: "#6f4a2c", trunkDark: "#563820", bloom: "#ff6b6b" },
  sakura: { leaf: ["#e9739f", "#f6a1c0", "#ffd9e8"], trunk: "#74503f", trunkDark: "#593d30", bloom: "#ffffff" },
  maple: { leaf: ["#c2410c", "#ec6b1a", "#fbbf24"], trunk: "#83502c", trunkDark: "#633b20", bloom: "#fff0b3" },
};
const WITHERED: Palette = { leaf: ["#8b7e66", "#a89d84", "#c4baa1"], trunk: "#6a5543", trunkDark: "#4f3f31", bloom: "#c4baa1" };

type Leaf = { x: number; y: number; a: number; s: number; at: number; tone: 0 | 1 | 2 };

/**
 * Where each leaf sits relative to the top of the trunk once the tree is full grown (x, y, angle in
 * degrees, size), and how far along the growth it appears (\`at\`). Leaves near the middle appear first, so
 * the tree fills out from a sprout of a few leaves to a full crown.
 */
const INNER: Leaf[] = [
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
      tone: ((i % 3) as 0 | 1 | 2),
    };
  });
}

/** Crown size, trunk thickness and leaf count for each tier. */
const CROWN = [0.86, 0.96, 1.02, 1.14, 1.24, 1.34];
const TRUNK = [1, 1.1, 1.25, 1.5, 1.8, 2.1];
const BLOOMS = [0, 0, 6, 9, 13, 18];

function leavesFor(tier: TreeTier): Leaf[] {
  const base = tier === 1 ? INNER.slice(0, 13) : INNER;
  const out = [...base];
  if (tier >= 4) out.push(...outerRing(12, 31, 0, 0.5));
  if (tier >= 6) out.push(...outerRing(9, 22, 20, 0.62));
  // Spread the appearance times across the whole session, so the tree keeps visibly changing.
  const maxAt = Math.max(...out.map((l) => l.at), 0.01);
  return out.map((l) => ({ ...l, at: (l.at / maxAt) * 0.9 })).sort((a, b) => a.at - b.at);
}

/**
 * A tree drawn in flat shapes (SVG) that grows with \`progress\` (0 to 1): a few leaves on a thin stem,
 * then a taller trunk, branches and a full crown. \`tier\` (1 to 6, from the length of the session) decides
 * how rich the finished tree is: more leaves, then blossoms and fruit, a bigger crown with roots, a glow
 * with fireflies, and finally golden fruit, rays of light and falling petals. Conifers (pine) grow in
 * tiers instead. \`withered\` greys it out and lets it droop. It is cheap, so a garden of hundreds is fine;
 * turn \`animate\` off there.
 */
export function FocusTree({
  progress,
  species,
  tier = 3,
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
  tier?: TreeTier;
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
  const fx = !withered && p > 0.6 ? clamp01((p - 0.6) / 0.35) : 0; // how much of the finishing touches show yet

  return (
    <svg viewBox="0 0 100 120" x={x} y={y} width={width} height={height} className={className} role="img" aria-label={withered ? "Withered tree" : "Tree"} overflow="visible">
      <defs>
        <radialGradient id="ftHalo">
          <stop offset="0" stopColor="#fff7c2" stopOpacity="0.75" />
          <stop offset="1" stopColor="#fff7c2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ftRay" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#fff2a8" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff2a8" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ground shadow, and a golden ring for the biggest tiers */}
      <ellipse cx="50" cy="106" rx={lerp(10, 25 + tier * 1.6, g)} ry={lerp(2.6, 4.2, g)} fill="#06281a" opacity="0.28" />
      {!withered && tier >= 5 && fx > 0 && <ellipse cx="50" cy="106" rx={30 + tier * 2} ry="6" fill="none" stroke="#ffd966" strokeWidth="1.2" opacity={0.45 * fx} />}

      {/* light rays behind a legendary tree */}
      {!withered && tier >= 6 && fx > 0 && (
        <g opacity={fx} transform="translate(50 52)">
          {[-60, -30, 0, 30, 60].map((a) => (
            <polygon key={a} points="0,0 -6,-58 6,-58" fill="url(#ftRay)" transform={`rotate(${a})`} />
          ))}
        </g>
      )}
      {/* a soft glow behind the crown */}
      {!withered && tier >= 5 && <circle cx="50" cy={105 - 46 * g - 6} r={lerp(14, 40, g)} fill="url(#ftHalo)" opacity={0.2 + 0.8 * fx} />}

      {/* roots for the grand trees */}
      {!withered && tier >= 4 && p > 0.35 && (
        <g stroke={col.trunkDark} strokeLinecap="round" fill="none" strokeWidth={lerp(1.2, 3.2, g)}>
          <path d="M50 104 q-8 0 -14 4" />
          <path d="M50 104 q8 0 14 4" />
          {tier >= 6 && <path d="M49 105 q-3 4 -7 6 M51 105 q3 4 7 6" />}
        </g>
      )}

      {species === "pine" && !withered ? <Pine p={p} col={col} tr={tr} tier={tier} fx={fx} /> : <Leafy p={p} col={col} withered={withered} tr={tr} species={species} tier={tier} fx={fx} animate={animate} />}

      {/* fireflies and falling petals */}
      {!withered && tier >= 5 && fx > 0 && <Sparks tier={tier} fx={fx} animate={animate} species={species} />}

      {/* little flowers and mushrooms at the foot of the biggest trees */}
      {!withered && tier >= 4 && p > 0.5 && (
        <g>
          <circle cx="30" cy="108" r="1.7" fill="#ffd1dc" />
          <circle cx="71" cy="109" r="1.7" fill="#fff3a3" />
          {tier >= 5 && <circle cx="38" cy="110" r="1.5" fill="#ffffff" />}
          {tier >= 6 && (
            <>
              <path d="M62 110 q2 -4 5 0 z" fill="#e5484d" />
              <circle cx="64" cy="108.6" r="0.5" fill="#fff" />
            </>
          )}
        </g>
      )}

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

function Leafy({ p, col, withered, tr, species, tier, fx, animate }: { p: number; col: Palette; withered: boolean; tr?: string; species: FocusSpecies; tier: TreeTier; fx: number; animate: boolean }) {
  const g = easeOut(p);
  // The trunk stretches from a short stem to a tall one; the crown sits on top of it.
  const t = withered ? 1 : TRUNK[tier - 1];
  const trunkH = lerp(14, 44 + (tier - 1) * 1.4, g);
  const tx = 50 + Math.sin(p * 2.4) * 1.5;
  const ty = 105 - trunkH;
  const cs = lerp(0.5, 1, g) * (withered ? 0.9 : CROWN[tier - 1]); // crown scale
  const sw = lerp(2.4, 6.4, g) * t;
  const leaves = withered ? INNER : leavesFor(tier);

  // Blossoms and fruit sit on the crown once the tree is nearly grown.
  const bloomCount = withered ? 0 : BLOOMS[tier - 1];
  const golden = tier >= 5;

  return (
    <g>
      {/* trunk and branches, drawn along their length so they grow rather than just scale */}
      <path d={`M50 105 C ${50 + (withered ? 2 : -1)} ${105 - trunkH * 0.45}, ${tx + 1} ${ty + trunkH * 0.3}, ${tx} ${ty}`} stroke={col.trunk} strokeWidth={sw} strokeLinecap="round" fill="none" style={{ transition: tr }} />
      {p > 0.3 && (
        <g stroke={col.trunkDark} strokeLinecap="round" fill="none" style={{ transition: tr }}>
          <path d={`M${tx} ${ty + trunkH * 0.32} Q ${tx - 8 * cs} ${ty + trunkH * 0.18} ${tx - 14 * cs} ${ty + trunkH * 0.08}`} strokeWidth={sw * 0.38} />
          <path d={`M${tx} ${ty + trunkH * 0.46} Q ${tx + 8 * cs} ${ty + trunkH * 0.32} ${tx + 15 * cs} ${ty + trunkH * 0.2}`} strokeWidth={sw * 0.38} />
          {!withered && tier >= 4 && <path d={`M${tx} ${ty + trunkH * 0.56} Q ${tx - 6 * cs} ${ty + trunkH * 0.46} ${tx - 12 * cs} ${ty + trunkH * 0.4}`} strokeWidth={sw * 0.32} />}
        </g>
      )}

      {leaves.map((l, i) => {
        if (withered && i % 3 !== 0) return null; // a withered tree keeps only a few dry leaves
        const k = clamp01((p - l.at) / 0.08);
        if (k <= 0) return null;
        const lx = tx + l.x * cs;
        const ly = ty + l.y * cs + (withered ? 10 : 0);
        const rot = l.a + (withered ? (l.a >= 0 ? 38 : -38) : 0);
        const size = l.s * k * (species === "sakura" ? 0.85 : 1) * (tier >= 4 ? 1.08 : 1);
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

      {/* blossoms (and, for the bigger tiers, glowing fruit) */}
      {fx > 0 &&
        Array.from({ length: bloomCount }, (_, i) => {
          const base = INNER[(i * 5 + 3) % INNER.length];
          const bx = tx + base.x * cs * 1.12 + (i % 2 ? 2 : -2);
          const by = ty + base.y * cs * 1.1 - 3;
          const fruit = golden && i % 3 === 0;
          const show = clamp01(fx * bloomCount - i * 0.6);
          if (show <= 0) return null;
          return (
            <g key={`b${i}`} style={{ transform: `translate(${bx}px, ${by}px) scale(${show})`, transition: tr }}>
              <circle r={fruit ? 2.6 : 2.1} fill={fruit ? (tier >= 6 ? "#ffd54a" : "#e5484d") : col.bloom} />
              <circle r={fruit ? 0.9 : 0.8} cx="-0.7" cy="-0.7" fill="#ffffff" opacity="0.7" />
              {animate && tier >= 6 && fruit && <circle r="2.6" fill="none" stroke="#fff3a3" strokeWidth="0.6"><animate attributeName="r" values="2.6;5;2.6" dur="2.8s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.8;0;0.8" dur="2.8s" repeatCount="indefinite" /></circle>}
            </g>
          );
        })}
    </g>
  );
}

/** A conifer that grows in layers: more layers, baubles, a glow and finally a golden star as the tier rises. */
function Pine({ p, col, tr, tier, fx }: { p: number; col: Palette; tr?: string; tier: TreeTier; fx: number }) {
  const g = easeOut(p);
  const layers = [4, 4, 5, 5, 6, 7][tier - 1];
  const scale = [0.9, 0.98, 1.04, 1.12, 1.2, 1.28][tier - 1];
  const trunkH = lerp(8, 18, g);
  const items = Array.from({ length: layers }, (_, i) => ({
    w: lerp(42, 14, i / (layers - 1)),
    top: -6 - i * (62 / (layers - 1)) * 0.95,
    h: lerp(30, 22, i / (layers - 1)),
    at: (i / layers) * 0.88,
    c: i === 0 ? col.leaf[0] : i >= layers - 1 ? col.leaf[2] : col.leaf[1],
  }));
  const topY = 104 - trunkH * 0.6 + items[items.length - 1].top * g * 0.78 * scale;

  return (
    <g>
      <rect x="46" y={105 - trunkH} width={8 * (1 + (tier - 1) * 0.08)} height={trunkH} rx="1.5" fill={col.trunk} style={{ transition: tr }} />
      {items.map((t, i) => {
        const k = clamp01((p - t.at) / 0.2 + (i === 0 ? 0.35 : 0));
        if (k <= 0) return null;
        const base = 104 - trunkH * 0.6 + t.top * g * 0.78 * scale;
        return (
          <g key={i} style={{ transform: `translate(50px, ${base}px) scale(${lerp(0.4, 1, k) * lerp(0.55, 1, g) * scale})`, transition: tr }}>
            <polygon points={`0,${-t.h} ${-t.w / 2},0 ${t.w / 2},0`} fill={t.c} />
            <polygon points={`0,${-t.h} ${t.w / 2},0 0,0`} fill="#000" opacity="0.1" />
            {tier >= 4 && <polygon points={`0,${-t.h} ${-t.w * 0.18},${-t.h * 0.62} ${t.w * 0.18},${-t.h * 0.62}`} fill="#ffffff" opacity="0.5" />}
            {tier >= 3 && fx > 0 && (
              <>
                <circle cx={-t.w * 0.22} cy={-t.h * 0.2} r="1.6" fill={i % 2 ? "#ffd54a" : "#ff5c6c"} />
                <circle cx={t.w * 0.2} cy={-t.h * 0.34} r="1.6" fill={i % 2 ? "#ff5c6c" : "#ffd54a"} />
              </>
            )}
          </g>
        );
      })}
      {tier >= 6 && fx > 0 && (
        <polygon
          points="0,-7 2,-2.4 7,-2.2 3.2,0.9 4.4,5.6 0,3 -4.4,5.6 -3.2,0.9 -7,-2.2 -2,-2.4"
          fill="#ffd54a"
          stroke="#fff3a3"
          strokeWidth="0.8"
          transform={`translate(50 ${topY - 8}) scale(${0.8 + fx * 0.5})`}
        />
      )}
    </g>
  );
}

/** Fireflies around the crown, and (for a legendary tree) petals drifting down. */
function Sparks({ tier, fx, animate, species }: { tier: TreeTier; fx: number; animate: boolean; species: FocusSpecies }) {
  const flies = tier >= 6 ? 8 : 5;
  const spots = [
    [24, 52],
    [76, 48],
    [32, 30],
    [68, 26],
    [50, 12],
    [18, 70],
    [84, 66],
    [40, 62],
  ];
  const petal = species === "sakura" ? "#ffd9e8" : species === "maple" ? "#fbbf24" : "#d7f7a8";
  return (
    <g opacity={fx}>
      {spots.slice(0, flies).map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="1.5" fill="#fff6a8">
          {animate && (
            <>
              <animate attributeName="opacity" values="0.15;1;0.15" dur={`${2.2 + (i % 3) * 0.7}s`} begin={`${i * 0.3}s`} repeatCount="indefinite" />
              <animate attributeName="cy" values={`${cy};${cy - 5};${cy}`} dur={`${3 + (i % 4)}s`} begin={`${i * 0.2}s`} repeatCount="indefinite" />
            </>
          )}
        </circle>
      ))}
      {animate &&
        tier >= 6 &&
        [30, 52, 70].map((px, i) => (
          <ellipse key={px} cx={px} cy="20" rx="2.2" ry="1.1" fill={petal}>
            <animate attributeName="cy" values="20;104" dur={`${6 + i * 1.5}s`} begin={`${i * 1.4}s`} repeatCount="indefinite" />
            <animate attributeName="cx" values={`${px};${px + 8};${px - 4};${px + 6}`} dur={`${6 + i * 1.5}s`} begin={`${i * 1.4}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.9;0.9;0" dur={`${6 + i * 1.5}s`} begin={`${i * 1.4}s`} repeatCount="indefinite" />
          </ellipse>
        ))}
    </g>
  );
}
