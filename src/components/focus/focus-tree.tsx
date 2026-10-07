import type { FocusSpecies, TreeTier } from "@/lib/focus";
import { treeSpec, type TreeSpec } from "@/lib/focus-tree";

/**
 * A tree drawn in flat shapes (SVG) that grows with `progress` (0 to 1): a few leaves on a thin stem,
 * then a taller trunk, branches and a full crown. `tier` (1 to 6, from the length of the session) decides
 * how rich the finished tree is: more leaves, then blossoms and fruit, a bigger crown with roots, a glow
 * with fireflies, and finally golden fruit, rays of light and falling petals. Conifers (pine) grow in
 * layers instead. `withered` greys it out and lets it droop.
 *
 * The shape itself comes from `treeSpec`, the same description the 3D garden uses, so a tier looks the
 * same in both. It is cheap, so a garden of hundreds is fine; turn `animate` off there.
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
  const s = treeSpec({ progress, species, tier, withered });
  const tr = animate ? "all 1s linear" : undefined;

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
      <ellipse cx="50" cy="106" rx={s.shadow.rx} ry={s.shadow.ry} fill="#06281a" opacity="0.28" />
      {s.ring && <ellipse cx="50" cy="106" rx={s.ring.rx} ry="6" fill="none" stroke="#ffd966" strokeWidth="1.2" opacity={s.ring.opacity} />}

      {/* light rays behind a legendary tree */}
      {s.rays && (
        <g opacity={s.rays.opacity} transform="translate(50 52)">
          {[-60, -30, 0, 30, 60].map((a) => (
            <polygon key={a} points="0,0 -6,-58 6,-58" fill="url(#ftRay)" transform={`rotate(${a})`} />
          ))}
        </g>
      )}
      {/* a soft glow behind the crown */}
      {s.halo && <circle cx="50" cy={s.halo.cy} r={s.halo.r} fill="url(#ftHalo)" opacity={s.halo.opacity} />}

      {/* roots for the grand trees */}
      {s.roots && (
        <g stroke={s.col.trunkDark} strokeLinecap="round" fill="none" strokeWidth={s.roots.width}>
          <path d="M50 104 q-8 0 -14 4" />
          <path d="M50 104 q8 0 14 4" />
          {s.roots.deep && <path d="M49 105 q-3 4 -7 6 M51 105 q3 4 7 6" />}
        </g>
      )}

      {s.kind === "dead" ? <DeadTree s={s} /> : s.kind === "pine" ? <Pine s={s} tr={tr} /> : <Leafy s={s} tr={tr} animate={animate} />}

      {/* fireflies and falling petals */}
      {s.sparks && <Sparks tier={s.sparks.tier} fx={s.sparks.fx} animate={animate} species={species} />}

      {/* little flowers and mushrooms at the foot of the biggest trees */}
      {s.foot && (
        <g>
          <circle cx="30" cy="108" r="1.7" fill="#ffd1dc" />
          <circle cx="71" cy="109" r="1.7" fill="#fff3a3" />
          {s.foot.tier >= 5 && <circle cx="38" cy="110" r="1.5" fill="#ffffff" />}
          {s.foot.tier >= 6 && (
            <>
              <path d="M62 110 q2 -4 5 0 z" fill="#e5484d" />
              <circle cx="64" cy="108.6" r="0.5" fill="#fff" />
            </>
          )}
        </g>
      )}

    </svg>
  );
}

/** A dead tree: thick bare trunk narrowing to a point, angular branches with forks, knots and dry litter. */
function DeadTree({ s }: { s: TreeSpec }) {
  const d = s.dead!;
  const top = 105 - d.h;
  const hw = d.baseW / 2;
  return (
    <g>
      {/* dry needles and twigs on the ground */}
      <g stroke={d.colors.litter} strokeWidth="1.1" strokeLinecap="round" fill="none">
        {d.litter.map(([x, y], i) => (
          <path key={i} d={`M50 107 L${x} ${y}`} />
        ))}
        <path d="M44 108.5 l-2 -1.4 M58 108.8 l2.6 -1.2 M52 110.6 l1.4 1.2" />
      </g>

      {/* branches, with a fork near the end of each */}
      <g stroke={d.colors.branch} strokeLinecap="round" fill="none">
        {d.branches.map((b, i) => (
          <g key={i}>
            <path d={`M${b.x0} ${b.y0 + 1.2} L${b.x1} ${b.y1}`} strokeWidth={b.w} />
            <path d={`M${b.x0 + (b.x1 - b.x0) * 0.6} ${b.y0 + (b.y1 - b.y0) * 0.6} L${b.twig.x} ${b.twig.y}`} strokeWidth={Math.max(0.8, b.w * 0.55)} />
          </g>
        ))}
      </g>

      {/* the trunk: wide at the foot, a jagged point at the top, lit on the left and shaded on the right */}
      <path d={`M${50 - hw} 105 C ${50 - hw * 0.8} ${105 - d.h * 0.4}, 49.4 ${top + 18}, 49.2 ${top + 3} L50.4 ${top - 3} L51 ${top + 5} C 51.2 ${top + 20}, ${50 + hw * 0.8} ${105 - d.h * 0.4}, ${50 + hw} 105 Z`} fill={d.colors.trunk} />
      <path d={`M50.2 ${top - 2} L51 ${top + 5} C 51.2 ${top + 20}, ${50 + hw * 0.8} ${105 - d.h * 0.4}, ${50 + hw} 105 L50.4 105 C 51 ${105 - d.h * 0.4}, 50.6 ${top + 20}, 50.2 ${top - 2} Z`} fill={d.colors.shade} opacity="0.8" />
      {/* knots and a few cracks */}
      {d.knots.map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="1.6" ry="2.1" fill={d.colors.shade} />
      ))}
      <path d={`M48 ${105 - d.h * 0.12} l1.2 -7 M52.6 ${105 - d.h * 0.3} l-1 -6`} stroke={d.colors.shade} strokeWidth="0.7" strokeLinecap="round" opacity="0.7" />
    </g>
  );
}

function Leafy({ s, tr, animate }: { s: TreeSpec; tr?: string; animate: boolean }) {
  const t = s.trunk;
  return (
    <g>
      {/* trunk and branches, drawn along their length so they grow rather than just scale */}
      <path d={`M${t.x0} ${t.y0} C ${t.c1[0]} ${t.c1[1]}, ${t.c2[0]} ${t.c2[1]}, ${t.x1} ${t.y1}`} stroke={s.col.trunk} strokeWidth={t.width} strokeLinecap="round" fill="none" style={{ transition: tr }} />
      {s.branches.length > 0 && (
        <g stroke={s.col.trunkDark} strokeLinecap="round" fill="none" style={{ transition: tr }}>
          {s.branches.map((b, i) => (
            <path key={i} d={`M${b.from[0]} ${b.from[1]} Q ${b.ctrl[0]} ${b.ctrl[1]} ${b.to[0]} ${b.to[1]}`} strokeWidth={b.width} />
          ))}
        </g>
      )}

      {s.leaves.map((l, i) => (
        <g key={i} style={{ transform: `translate(${l.x}px, ${l.y}px) rotate(${l.rot}deg) scale(${l.size})`, transition: tr }}>
          {l.round ? (
            <>
              <circle cx="0" cy="-5" r="6.2" fill={l.fill} />
              <circle cx="0" cy="-5" r="1.6" fill="#fff6" />
            </>
          ) : (
            <>
              <ellipse cx="0" cy="-6" rx="3.9" ry="9" fill={l.fill} />
              <path d="M0 -14 L0 1" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="0.7" strokeLinecap="round" />
            </>
          )}
        </g>
      ))}

      {/* blossoms (and, for the bigger tiers, glowing fruit) */}
      {s.blooms.map((b, i) => (
        <g key={`b${i}`} style={{ transform: `translate(${b.x}px, ${b.y}px) scale(${b.scale})`, transition: tr }}>
          <circle r={b.r} fill={b.color} />
          <circle r={b.fruit ? 0.9 : 0.8} cx="-0.7" cy="-0.7" fill="#ffffff" opacity="0.7" />
          {animate && b.pulse && (
            <circle r="2.6" fill="none" stroke="#fff3a3" strokeWidth="0.6">
              <animate attributeName="r" values="2.6;5;2.6" dur="2.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0;0.8" dur="2.8s" repeatCount="indefinite" />
            </circle>
          )}
        </g>
      ))}
    </g>
  );
}

/** A conifer that grows in layers: more layers, baubles, a glow and finally a golden star as the tier rises. */
function Pine({ s, tr }: { s: TreeSpec; tr?: string }) {
  const pine = s.pine!;
  return (
    <g>
      <rect x="46" y={105 - pine.trunkH} width={pine.trunkW} height={pine.trunkH} rx="1.5" fill={s.col.trunk} style={{ transition: tr }} />
      {pine.layers.map((l, i) => (
        <g key={i} style={{ transform: `translate(50px, ${l.baseY}px) scale(${l.scale})`, transition: tr }}>
          <polygon points={`0,${-l.h} ${-l.w / 2},0 ${l.w / 2},0`} fill={l.color} />
          <polygon points={`0,${-l.h} ${l.w / 2},0 0,0`} fill="#000" opacity="0.1" />
          {l.tip && <polygon points={`0,${-l.h} ${-l.w * 0.18},${-l.h * 0.62} ${l.w * 0.18},${-l.h * 0.62}`} fill="#ffffff" opacity="0.5" />}
          {l.baubles && l.bauble.map(([bx, by, c], k) => <circle key={k} cx={bx} cy={by} r="1.6" fill={c} />)}
        </g>
      ))}
      {pine.star && (
        <polygon
          points="0,-7 2,-2.4 7,-2.2 3.2,0.9 4.4,5.6 0,3 -4.4,5.6 -3.2,0.9 -7,-2.2 -2,-2.4"
          fill="#ffd54a"
          stroke="#fff3a3"
          strokeWidth="0.8"
          transform={`translate(50 ${pine.star.y}) scale(${pine.star.scale})`}
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
