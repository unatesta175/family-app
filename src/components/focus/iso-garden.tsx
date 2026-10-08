import { FocusTree } from "@/components/focus/focus-tree";
import { type SessionLite } from "@/lib/focus";
import { hash, layoutGarden } from "@/lib/focus-layout";

const TW = 64; // tile width
const TH = 32; // tile height (a 2:1 isometric diamond)
const DEPTH = 26; // how thick the block of earth is
const TREE_W = 68;
const TREE_H = TREE_W * 1.2;
/**
 * The garden as an isometric block of earth, drawn in SVG: a grass top made of diamond tiles, soil on
 * two sides, and a tree (or a stump) for every session. The block is always a few tiles bigger than
 * the trees on it, so it keeps growing, one row of tiles at a time, as you plant more.
 */
export function IsoGarden({ sessions, minSize = 5, className }: { sessions: SessionLite[]; minSize?: number; className?: string }) {
  const { n, placed } = layoutGarden(sessions, minSize);
  const shown = placed;
  const half = (n * TW) / 2;

  const px = (i: number, j: number) => (i - j) * (TW / 2);
  const py = (i: number, j: number) => (i + j) * (TH / 2);
  const diamond = (i: number, j: number) => `${px(i, j)},${py(i, j)} ${px(i + 1, j)},${py(i + 1, j)} ${px(i + 1, j + 1)},${py(i + 1, j + 1)} ${px(i, j + 1)},${py(i, j + 1)}`;

  const minX = -half - 10;
  const width = n * TW + 20;
  const minY = -TREE_H * 0.86;
  const height = n * TH + DEPTH + TREE_H * 0.86 + 12;

  return (
    <svg viewBox={`${minX} ${minY} ${width} ${height}`} className={className} role="img" aria-label={`A garden with ${shown.length} tree${shown.length === 1 ? "" : "s"}`}>
      <defs>
        <linearGradient id="isoSoilL" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a5a31" />
          <stop offset="1" stopColor="#5d3a1f" />
        </linearGradient>
        <linearGradient id="isoSoilR" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6e4525" />
          <stop offset="1" stopColor="#45290f" />
        </linearGradient>
      </defs>

      {/* soft shadow under the block */}
      <ellipse cx="0" cy={n * TH + DEPTH * 0.6} rx={half * 1.02} ry={n * TH * 0.22} fill="#04170f" opacity="0.28" />

      {/* the two soil faces */}
      <polygon points={`${-half},${(n * TH) / 2} 0,${n * TH} 0,${n * TH + DEPTH} ${-half},${(n * TH) / 2 + DEPTH}`} fill="url(#isoSoilL)" />
      <polygon points={`${half},${(n * TH) / 2} 0,${n * TH} 0,${n * TH + DEPTH} ${half},${(n * TH) / 2 + DEPTH}`} fill="url(#isoSoilR)" />
      {/* pebbles in the soil */}
      {Array.from({ length: n * 3 }, (_, k) => {
        const left = k % 2 === 0;
        const t = ((hash(k, 7) % 100) / 100) * 0.9 + 0.05;
        const x = left ? -half * (1 - t) : half * (1 - t);
        const y = (n * TH) / 2 + (n * TH * t) / 2 + 6 + (hash(k, 3) % (DEPTH - 12));
        return <ellipse key={k} cx={x} cy={y} rx={2.2 + (hash(k, 5) % 3)} ry={1.5} fill={left ? "#a87244" : "#7e5230"} opacity="0.75" />;
      })}

      {/* grass tiles */}
      {Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => (
          <polygon key={`${i}-${j}`} points={diamond(i, j)} fill={(i + j) % 2 === 0 ? "#a4d65c" : "#98cc50"} stroke="#86bb44" strokeWidth="0.6" strokeLinejoin="round" />
        ))
      )}
      {/* a green lip where the grass meets the soil */}
      <polyline points={`${-half},${(n * TH) / 2} 0,${n * TH} ${half},${(n * TH) / 2}`} fill="none" stroke="#7fb43c" strokeWidth="3" strokeLinejoin="round" />
      {/* grass tufts */}
      {Array.from({ length: n * n }, (_, k) => {
        const i = k % n;
        const j = Math.floor(k / n);
        const cx = px(i + 0.5, j + 0.5) + ((hash(i, j) % 14) - 7);
        const cy = py(i + 0.5, j + 0.5) + ((hash(j, i) % 6) - 3);
        return <path key={k} d={`M${cx - 2} ${cy} l1 -3 M${cx} ${cy} l0 -4 M${cx + 2} ${cy} l-1 -3`} stroke="#6fa334" strokeWidth="0.9" strokeLinecap="round" fill="none" opacity="0.8" />;
      })}

      {/* the trees, back to front so nearer ones overlap farther ones */}
      {placed.map(({ s, i, j }) => {
        const cx = px(i + 0.5, j + 0.5);
        const cy = py(i + 0.5, j + 0.5);
        return (
          <FocusTree
            key={s.key}
            x={cx - TREE_W / 2}
            y={cy - TREE_H * 0.875 + 3}
            width={TREE_W}
            height={TREE_H}
            progress={s.progress}
            species={s.species}
            tier={s.tier}
            withered={s.status === "withered"}
            animate={false}
          />
        );
      })}
    </svg>
  );
}
