import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Instance, Instances } from "@react-three/drei";
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DoubleSide,
  IcosahedronGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  Vector3,
  type Group,
  type Mesh,
  type Sprite,
} from "three";
import {
  CONDITION_PALETTE,
  type GardenStage,
  type GardenTier,
  type GardenCondition,
  type PlotState,
} from "@/lib/garden";

export type GardenCell = {
  date: string | null;
  stage: GardenStage;
  pct: number;
  quality: number;
  condition: GardenCondition;
  plotState: PlotState;
  bonus: boolean;
  tier: GardenTier;
  col: number;
  row: number;
};

const COL_SPACING = 1.4;
const ROW_SPACING = 1.4;
const PLOT_SIZE = 1.4;
const PLOT_INSET = 0.16;

export function gridPosition(col: number, row: number, cols: number, rows: number): [number, number, number] {
  const x = (col - (cols - 1) / 2) * COL_SPACING;
  const z = (row - (rows - 1) / 2) * ROW_SPACING;
  return [x, 0, z];
}

/** Deterministic pseudo-random in [0, 1) so decorations jitter but stay stable across re-renders. */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const FLOWER_PALETTES: [string, string][] = [
  ["#ff8fb3", "#ffd1e1"],
  ["#ffcf4d", "#fff0b3"],
  ["#b48cf2", "#e3d3ff"],
  ["#6ec3ff", "#cdebff"],
  ["#ff9f5a", "#ffdbb8"],
];
const FLOWER_OFFSETS: [number, number][] = [
  [0.42, 0.42],
  [-0.42, 0.42],
  [0.42, -0.42],
  [-0.42, -0.42],
];
const PETAL_RING: [number, number][] = [
  [0.032, 0],
  [-0.032, 0],
  [0, 0.032],
  [0, -0.032],
];

const GRASS_TUFT_OFFSETS: [number, number][] = [
  [0.42, 0],
  [-0.42, 0],
  [0, 0.42],
  [0, -0.42],
  [0.24, 0.3],
  [-0.28, -0.22],
];

const FENCE_POST_COLOR = "#8b5e34";
const FENCE_CAP_COLOR = "#6b4527";
const FENCE_RAIL_COLOR = "#a9784f";
const FENCE_MARGIN = 0.4;
const POST_HEIGHT = 0.38;

/** A decorative wooden fence framing the whole garden plot for the month. */
export function GardenFence({ cols, rows }: { cols: number; rows: number }) {
  const halfW = (cols * COL_SPACING) / 2 + FENCE_MARGIN;
  const halfD = (rows * ROW_SPACING) / 2 + FENCE_MARGIN;

  const countX = Math.max(2, Math.round((halfW * 2) / COL_SPACING));
  const countZ = Math.max(2, Math.round((halfD * 2) / ROW_SPACING));

  const posts: [number, number][] = [];
  for (let i = 0; i <= countX; i++) {
    const x = -halfW + (i * (2 * halfW)) / countX;
    posts.push([x, -halfD]);
    posts.push([x, halfD]);
  }
  for (let i = 1; i < countZ; i++) {
    const z = -halfD + (i * (2 * halfD)) / countZ;
    posts.push([-halfW, z]);
    posts.push([halfW, z]);
  }

  return (
    <group>
      <Instances limit={Math.max(posts.length, 1)}>
        <cylinderGeometry args={[0.035, 0.04, POST_HEIGHT, 8]} />
        <meshStandardMaterial color={FENCE_POST_COLOR} roughness={0.85} />
        {posts.map(([x, z], i) => (
          <Instance key={i} position={[x, POST_HEIGHT / 2, z]} />
        ))}
      </Instances>

      <Instances limit={Math.max(posts.length, 1)}>
        <coneGeometry args={[0.055, 0.09, 6]} />
        <meshStandardMaterial color={FENCE_CAP_COLOR} roughness={0.7} />
        {posts.map(([x, z], i) => (
          <Instance key={i} position={[x, POST_HEIGHT + 0.04, z]} />
        ))}
      </Instances>

      {[-halfD, halfD].map((z, i) => (
        <group key={`x${i}`}>
          <mesh position={[0, 0.28, z]}>
            <boxGeometry args={[halfW * 2 + 0.1, 0.045, 0.045]} />
            <meshStandardMaterial color={FENCE_RAIL_COLOR} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.14, z]}>
            <boxGeometry args={[halfW * 2 + 0.1, 0.045, 0.045]} />
            <meshStandardMaterial color={FENCE_RAIL_COLOR} roughness={0.8} />
          </mesh>
        </group>
      ))}

      {[-halfW, halfW].map((x, i) => (
        <group key={`z${i}`}>
          <mesh position={[x, 0.28, 0]}>
            <boxGeometry args={[0.045, 0.045, halfD * 2 + 0.1]} />
            <meshStandardMaterial color={FENCE_RAIL_COLOR} roughness={0.8} />
          </mesh>
          <mesh position={[x, 0.14, 0]}>
            <boxGeometry args={[0.045, 0.045, halfD * 2 + 0.1]} />
            <meshStandardMaterial color={FENCE_RAIL_COLOR} roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** One continuous grass lawn under the whole grid so plots never look like separate floating tiles. */
export function GardenGround({ cols, rows }: { cols: number; rows: number }) {
  return (
    <mesh position={[0, -0.03, 0]} receiveShadow>
      <boxGeometry
        args={[cols * COL_SPACING + FENCE_MARGIN * 2 + 0.3, 0.06, rows * ROW_SPACING + FENCE_MARGIN * 2 + 0.3]}
      />
      <meshStandardMaterial color="#a8d98f" roughness={0.95} />
    </mesh>
  );
}

/**
 * Each day is a grass tile flush against its neighbors (no gaps) so the whole
 * grid reads as one connected lawn, with a slightly darker inset border per
 * plot so individual days stay visually distinguishable.
 */
export function Plots({ cells, cols, rows }: { cells: GardenCell[]; cols: number; rows: number }) {
  const dayCells = cells.filter((c) => c.date);
  const tuftCells = dayCells.filter((c) => c.plotState !== "burning");
  const flowerCells = dayCells.filter((c) => c.plotState === "growing");

  return (
    <>
      <Instances limit={Math.max(dayCells.length, 1)} receiveShadow>
        <boxGeometry args={[PLOT_SIZE, 0.05, PLOT_SIZE]} />
        <meshStandardMaterial roughness={0.95} />
        {dayCells.map((c, i) => {
          const [x, , z] = gridPosition(c.col, c.row, cols, rows);
          const t = c.pct / 100;
          const checker = (c.col + c.row) % 2 === 0 ? 1 : 0.93;
          const base =
            c.plotState === "burning"
              ? "#3a2a22"
              : c.plotState === "tombstoned"
                ? mixColor("#a89468", "#8a7350", 0.5)
                : c.pct > 0
                  ? mixColor("#9bd47f", "#4c9e50", t)
                  : "#b8dba0";
          return <Instance key={i} position={[x, 0, z]} color={shade(base, checker)} />;
        })}
      </Instances>

      <Instances limit={Math.max(dayCells.length, 1)} receiveShadow>
        <boxGeometry args={[PLOT_SIZE - PLOT_INSET, 0.03, PLOT_SIZE - PLOT_INSET]} />
        <meshStandardMaterial roughness={0.85} />
        {dayCells.map((c, i) => {
          const [x, , z] = gridPosition(c.col, c.row, cols, rows);
          const t = c.pct / 100;
          const checker = (c.col + c.row) % 2 === 0 ? 1 : 0.94;
          const base =
            c.plotState === "burning"
              ? "#241812"
              : c.plotState === "tombstoned"
                ? mixColor("#c7b384", "#a8916a", 0.5)
                : c.pct > 0
                  ? mixColor("#e3f7cd", "#8fd97a", t)
                  : "#d6efc0";
          return <Instance key={i} position={[x, 0.04, z]} color={shade(base, checker)} />;
        })}
      </Instances>

      <Instances limit={Math.max(tuftCells.length * GRASS_TUFT_OFFSETS.length * 2, 1)}>
        <coneGeometry args={[0.017, 0.11, 4]} />
        <meshStandardMaterial roughness={0.8} />
        {tuftCells.flatMap((c, i) => {
          const [x, , z] = gridPosition(c.col, c.row, cols, rows);
          const t = c.pct / 100;
          const withered = c.plotState === "tombstoned";
          const color = withered ? "#8a7a4a" : c.pct > 0 ? mixColor("#8fdb6f", "#2f7d3a", t) : "#a7cf85";
          const offsets = withered ? GRASS_TUFT_OFFSETS.slice(0, 3) : GRASS_TUFT_OFFSETS;
          return offsets.flatMap(([ox, oz], j) => {
            const seed = c.col * 131 + c.row * 977 + j * 7;
            const jx = ox + (seededRandom(seed) - 0.5) * 0.16;
            const jz = oz + (seededRandom(seed + 1) - 0.5) * 0.16;
            const h = withered ? 0.4 + seededRandom(seed + 2) * 0.2 : 0.85 + seededRandom(seed + 2) * 0.5;
            const droop = withered ? 0.6 : 0.18;
            return [0, 1].map((k) => (
              <Instance
                key={`g${i}-${j}-${k}`}
                position={[x + jx + (k ? 0.03 : 0), 0.06, z + jz + (k ? 0.02 : 0)]}
                rotation={[droop * (k ? -1 : 1), seededRandom(seed + k) * Math.PI, 0.1]}
                scale={[1, h, 1]}
                color={color}
              />
            ));
          });
        })}
      </Instances>

      {flowerCells.flatMap((c) => {
        const [x, , z] = gridPosition(c.col, c.row, cols, rows);
        const flowerCount = Math.max(1, Math.ceil((c.pct / 100) * FLOWER_OFFSETS.length));
        return FLOWER_OFFSETS.slice(0, flowerCount).map(([ox, oz], j) => {
          const seed = c.col * 311 + c.row * 53 + j * 17;
          const jx = ox + (seededRandom(seed) - 0.5) * 0.14;
          const jz = oz + (seededRandom(seed + 1) - 0.5) * 0.14;
          const palette = FLOWER_PALETTES[Math.floor(seededRandom(seed + 2) * FLOWER_PALETTES.length)];
          return (
            <Flower
              key={`${c.col}-${c.row}-${j}`}
              position={[x + jx, 0, z + jz]}
              petalColor={palette[0]}
              centerColor={palette[1]}
              scale={0.85 + seededRandom(seed + 3) * 0.3}
            />
          );
        });
      })}
    </>
  );
}

function Flower({
  position,
  petalColor,
  centerColor,
  scale,
}: {
  position: [number, number, number];
  petalColor: string;
  centerColor: string;
  scale: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.045, 0]}>
        <cylinderGeometry args={[0.006, 0.008, 0.09, 5]} />
        <meshStandardMaterial color="#4f8c3f" roughness={0.85} />
      </mesh>
      {PETAL_RING.map(([ox, oz], i) => (
        <mesh key={i} position={[ox, 0.1, oz]} scale={[1, 0.55, 1]}>
          <sphereGeometry args={[0.032, 8, 8]} />
          <meshStandardMaterial color={petalColor} roughness={0.45} />
        </mesh>
      ))}
      <mesh position={[0, 0.1, 0]}>
        <sphereGeometry args={[0.024, 8, 8]} />
        <meshStandardMaterial
          color={centerColor}
          roughness={0.3}
          emissive={centerColor}
          emissiveIntensity={0.15}
        />
      </mesh>
    </group>
  );
}

function shade(color: string, factor: number): string {
  const [r, g, b] = hexOrRgbToRgb(color);
  return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
}

function hexOrRgbToRgb(color: string): [number, number, number] {
  if (color.startsWith("#")) return hexToRgb(color);
  const match = color.match(/\d+/g);
  if (!match) return [0, 0, 0];
  return [Number(match[0]), Number(match[1]), Number(match[2])];
}

function mixColor(a: string, b: string, t: number): string {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function StageGroup({
  cells,
  cols,
  rows,
  stage,
  children,
}: {
  cells: GardenCell[];
  cols: number;
  rows: number;
  stage: GardenStage;
  children: (cell: GardenCell) => React.ReactNode;
}) {
  const matching = cells.filter((c) => c.date && c.stage === stage);
  if (matching.length === 0) return null;

  return (
    <>
      {matching.map((c, i) => {
        const [x, , z] = gridPosition(c.col, c.row, cols, rows);
        const droop = CONDITION_PALETTE[c.condition].droop;
        return (
          <group
            key={i}
            position={[x, 0.045, z]}
            rotation={droop ? [0, 0, 0.24] : [0, 0, 0]}
            scale={droop ? [1, 0.82, 1] : [1, 1, 1]}
          >
            {children(c)}
          </group>
        );
      })}
    </>
  );
}

/** 1/5 — a tiny budding sprout, barely peeking out of the soil. */
export function SeedStage({ condition = "healthy" }: { condition?: GardenCondition }) {
  const p = CONDITION_PALETTE[condition];
  return (
    <group scale={0.7}>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.015, 0.02, 0.1, 6]} />
        <meshStandardMaterial color={p.trunk} roughness={p.metalness ? 0.3 : 0.8} metalness={p.metalness ?? 0} />
      </mesh>
      <mesh position={[0.02, 0.1, 0]} rotation={[0, 0, 0.5]}>
        <coneGeometry args={[0.035, 0.09, 6]} />
        <meshStandardMaterial
          color={p.canopyB}
          roughness={p.metalness ? 0.3 : 0.7}
          metalness={p.metalness ?? 0}
          emissive={p.glow ? p.canopyA : "#000000"}
          emissiveIntensity={p.glow ? (p.emissiveIntensity ?? 0.25) : 0}
        />
      </mesh>
      <mesh position={[-0.02, 0.08, 0]} rotation={[0, 0, -0.6]}>
        <coneGeometry args={[0.03, 0.07, 6]} />
        <meshStandardMaterial
          color={p.canopyB}
          roughness={p.metalness ? 0.3 : 0.7}
          metalness={p.metalness ?? 0}
          emissive={p.glow ? p.canopyA : "#000000"}
          emissiveIntensity={p.glow ? (p.emissiveIntensity ?? 0.25) : 0}
        />
      </mesh>
    </group>
  );
}

/** 2/5 — a small leafy plant, noticeably bigger than the seed stage. */
export function SproutStage({ condition = "healthy" }: { condition?: GardenCondition }) {
  const p = CONDITION_PALETTE[condition];
  return (
    <group scale={0.85}>
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.028, 0.038, 0.28, 6]} />
        <meshStandardMaterial color={p.trunk} roughness={p.metalness ? 0.3 : 0.8} metalness={p.metalness ?? 0} />
      </mesh>
      <mesh position={[0, 0.34, 0]}>
        <coneGeometry args={[0.16, 0.28, 8]} />
        <meshStandardMaterial
          color={p.canopyB}
          roughness={p.metalness ? 0.3 : 0.7}
          metalness={p.metalness ?? 0}
          emissive={p.glow ? p.canopyA : "#000000"}
          emissiveIntensity={p.glow ? (p.emissiveIntensity ?? 0.25) : 0}
        />
      </mesh>
    </group>
  );
}

/** 3/5 — a proper sapling with a visible trunk and single canopy. */
export function SaplingStage({ condition = "healthy" }: { condition?: GardenCondition }) {
  const p = CONDITION_PALETTE[condition];
  return (
    <group scale={1.15}>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.045, 0.06, 0.44, 7]} />
        <meshStandardMaterial color={p.trunk} roughness={p.metalness ? 0.3 : 0.9} metalness={p.metalness ?? 0} />
      </mesh>
      <mesh position={[0, 0.58, 0]}>
        <coneGeometry args={[0.26, 0.48, 9]} />
        <meshStandardMaterial
          color={p.canopyB}
          roughness={p.metalness ? 0.3 : 0.65}
          metalness={p.metalness ?? 0}
          emissive={p.glow ? p.canopyA : "#000000"}
          emissiveIntensity={p.glow ? (p.emissiveIntensity ?? 0.25) : 0}
        />
      </mesh>
    </group>
  );
}

/** 4/5 — a large, fuller young tree with a two-tier canopy. */
export function TreeStage({ condition = "healthy" }: { condition?: GardenCondition }) {
  const p = CONDITION_PALETTE[condition];
  return (
    <group scale={1.5}>
      <mesh position={[0, 0.26, 0]}>
        <cylinderGeometry args={[0.06, 0.085, 0.52, 7]} />
        <meshStandardMaterial color={p.trunk} roughness={p.metalness ? 0.3 : 0.9} metalness={p.metalness ?? 0} />
      </mesh>
      <mesh position={[0, 0.66, 0]}>
        <coneGeometry args={[0.32, 0.46, 9]} />
        <meshStandardMaterial
          color={p.canopyA}
          roughness={p.metalness ? 0.25 : 0.6}
          metalness={p.metalness ?? 0}
          emissive={p.glow ? p.canopyA : "#000000"}
          emissiveIntensity={p.glow ? (p.emissiveIntensity ?? 0.3) : 0}
        />
      </mesh>
      <mesh position={[0, 0.92, 0]}>
        <coneGeometry args={[0.23, 0.34, 9]} />
        <meshStandardMaterial
          color={p.canopyB}
          roughness={p.metalness ? 0.25 : 0.6}
          metalness={p.metalness ?? 0}
          emissive={p.glow ? p.canopyB : "#000000"}
          emissiveIntensity={p.glow ? (p.emissiveIntensity ?? 0.3) : 0}
        />
      </mesh>
    </group>
  );
}

/** Overlapping foliage clumps [x, y, z, radius, palette layer]: dark underside, lighter top. */
const CANOPY_CLUMPS: [number, number, number, number, "canopyA" | "canopyB" | "canopyC"][] = [
  [0.22, 0.74, 0.06, 0.25, "canopyA"],
  [-0.2, 0.72, -0.1, 0.25, "canopyA"],
  [0.02, 0.74, -0.24, 0.23, "canopyA"],
  [-0.04, 0.76, 0.24, 0.23, "canopyA"],
  [0.13, 1.0, 0.1, 0.27, "canopyB"],
  [-0.15, 1.02, -0.08, 0.27, "canopyB"],
  [0.0, 1.27, 0.0, 0.26, "canopyC"],
];

/** Blossom/fruit spots on the outer surface of each clump (two per clump). */
const BLOOM_POINTS: [number, number, number][] = CANOPY_CLUMPS.flatMap(([x, y, z, r], i) => [
  [x + Math.cos(i * 2.4) * r * 0.92, y + r * 0.2, z + Math.sin(i * 2.4) * r * 0.92] as [number, number, number],
  [x + Math.cos(i * 2.4 + 3.1) * r * 0.8, y + r * 0.6, z + Math.sin(i * 2.4 + 3.1) * r * 0.8] as [number, number, number],
]);

const CLUMP_GEO = new IcosahedronGeometry(1, 1);
const BLOOM_GEO = new SphereGeometry(1, 6, 5);

const TIER_SCALE: Record<GardenTier, number> = { none: 1.75, bronze: 1.9, silver: 2.05, gold: 2.25 };
const TIER_BLOOM_COLOR: Record<GardenTier, string> = {
  none: "#f7a8c4",
  bronze: "#f7a8c4",
  silver: "#fde68a",
  gold: "#fbbf24",
};
const TIER_RING_COLOR: Record<GardenTier, string | null> = {
  none: null,
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#ffd23f",
};

/** A small emissive gem that orbits/bobs in place, so streak and jamaah flourishes feel alive. */
function FloatingGem({
  position,
  color,
  size,
  phase,
  bobHeight = 0.05,
  bobSpeed = 1.4,
  spinSpeed = 0.8,
}: {
  position: [number, number, number];
  color: string;
  size: number;
  phase: number;
  bobHeight?: number;
  bobSpeed?: number;
  spinSpeed?: number;
}) {
  const ref = useRef<Mesh>(null);
  const [bx, by, bz] = position;

  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = clock.getElapsedTime();
    mesh.position.y = by + Math.sin(t * bobSpeed + phase) * bobHeight;
    mesh.rotation.y = t * spinSpeed + phase;
    mesh.rotation.x = t * spinSpeed * 0.6 + phase;
  });

  return (
    <mesh ref={ref} position={[bx, by, bz]}>
      <octahedronGeometry args={[size, 0]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} roughness={0.25} />
    </mesh>
  );
}

const AURA_POSITIONS: [number, number, number][] = [
  [0.36, 1.2, 0],
  [-0.36, 1.2, 0],
  [0, 1.2, 0.36],
  [0, 1.2, -0.36],
  [0.25, 1.5, 0.25],
  [-0.25, 1.5, -0.25],
];

const CONDITION_BLOOM_COUNT: Record<GardenCondition, number> = {
  golden: 16,
  thriving: 14,
  healthy: 10,
  stressed: 5,
  wilting: 1,
};
const CONDITION_BLOOM_SECONDARY: Record<GardenCondition, string> = {
  golden: "#fff4c2",
  thriving: "#fff2b8",
  healthy: "#fde68a",
  stressed: "#e2c46a",
  wilting: "#c9994a",
};

const BLESS_FAR_DISTANCE = 14;
const PETAL_COUNT = 10;
const FAR_PETAL_COUNT = 5;
const BFLY_COUNT = 3;
const FAR_BFLY_COUNT = 1;
const SPARK_COUNT = 8;
const FAR_SPARK_COUNT = 4;

const PETAL_GEO = new PlaneGeometry(1, 1);
const PETAL_MAT_GOLD = new MeshBasicMaterial({ color: "#ffd23f", side: DoubleSide });
const BFLY_BODY_MAT = new MeshStandardMaterial({ color: "#2b1d12", roughness: 0.6 });
const BFLY_WING_MATS = ["#ff9f45", "#7cc4ff", "#ffe14d"].map(
  (color) => new MeshBasicMaterial({ color, side: DoubleSide, transparent: true, opacity: 0.95 })
);
const GROUND_FLOWER_MATS = ["#ff7eb6", "#fff6a8", "#ffffff", "#b79bff"].map(
  (color) => new MeshStandardMaterial({ color, roughness: 0.5 })
);
const GROUND_FLOWERS: [number, number, number][] = Array.from({ length: 8 }, (_, i) => {
  const a = i * 0.785 + 0.3;
  const r = 0.33 + ((i * 7) % 3) * 0.04;
  return [Math.cos(a) * r, 0.03, Math.sin(a) * r];
});
const blessA = new Vector3();
const blessB = new Vector3();

function butterflyPath(tt: number, i: number, time: number, out: Vector3) {
  return out.set(
    Math.sin(tt) * 0.62,
    0.55 + i * 0.28 + Math.sin(tt * 1.7) * 0.18 + Math.sin(time * 7 + i) * 0.02,
    Math.sin(tt * 2) * 0.36
  );
}

/**
 * The reward for a perfect day (5/5, mostly on time + jamaah): a pulsing golden halo, drifting
 * petals, butterflies, twinkling sparkles, a perched bird, ground flowers and a lit patch of grass.
 * One useFrame for everything; far-away trees draw fewer petals/butterflies/sparkles.
 */
function TreeBlessing({ seed }: { seed: number }) {
  const tex = getSoftTexture();
  const root = useRef<Group>(null);
  const glow = useRef<Sprite>(null);
  const petals = useRef<(Mesh | null)[]>([]);
  const bflies = useRef<(Group | null)[]>([]);
  const leftWings = useRef<(Mesh | null)[]>([]);
  const rightWings = useRef<(Mesh | null)[]>([]);
  const sparks = useRef<(Sprite | null)[]>([]);
  const birdHead = useRef<Group>(null);
  // Every blessed tree is a golden-condition tree now, so the flourish is always the shiny gold set.
  const petalMat = PETAL_MAT_GOLD;
  const petalTotal = PETAL_COUNT + 2;

  useFrame(({ clock, camera }) => {
    const time = clock.getElapsedTime();
    let far = false;
    if (root.current) {
      root.current.getWorldPosition(blessA);
      far = camera.position.distanceTo(blessA) > BLESS_FAR_DISTANCE;
    }

    const gl = glow.current;
    if (gl) {
      const f = 0.85 + 0.15 * Math.sin(time * 1.2 + seed);
      gl.scale.setScalar(2.3 * f);
      gl.material.opacity = 0.34 * f;
    }

    const petalLimit = far ? FAR_PETAL_COUNT : petalTotal;
    for (let i = 0; i < petalTotal; i++) {
      const m = petals.current[i];
      if (!m) continue;
      m.visible = i < petalLimit;
      if (!m.visible) continue;
      const ph = (seed * 0.017 + i * 0.618) % 1;
      const t = (time * 0.09 + ph) % 1;
      const spread = 0.3 + t * 0.3;
      m.position.set(Math.sin(ph * 20 + t * 4) * spread, 1.55 - t * 1.5, Math.cos(ph * 13 + t * 3.3) * spread);
      m.rotation.set(time * 1.2 + i, time * 0.9 + i * 2, time * 0.7);
    }

    const bLimit = far ? FAR_BFLY_COUNT : BFLY_COUNT;
    for (let i = 0; i < BFLY_COUNT; i++) {
      const g = bflies.current[i];
      if (!g) continue;
      g.visible = i < bLimit;
      if (!g.visible) continue;
      const t = time * 0.35 + i * 2.1 + seed * 0.01;
      butterflyPath(t, i, time, blessA);
      butterflyPath(t + 0.05, i, time, blessB);
      g.position.copy(blessA);
      g.rotation.y = Math.atan2(blessB.x - blessA.x, blessB.z - blessA.z);
      const flap = 0.3 + 0.9 * Math.sin(time * 11 + i * 2);
      const l = leftWings.current[i];
      const rt = rightWings.current[i];
      if (l) l.rotation.z = -flap;
      if (rt) rt.rotation.z = flap;
    }

    const sparkLimit = far ? FAR_SPARK_COUNT : SPARK_COUNT;
    for (let i = 0; i < SPARK_COUNT; i++) {
      const sp = sparks.current[i];
      if (!sp) continue;
      sp.visible = i < sparkLimit;
      if (!sp.visible) continue;
      const ph = (seed * 0.011 + i * 0.382) % 1;
      sp.position.set(
        Math.sin(ph * 9 + time * 0.5) * 0.5,
        0.6 + ((ph * 7) % 1) * 0.9,
        Math.cos(ph * 11 + time * 0.4) * 0.5
      );
      const tw = Math.max(0, Math.sin(time * 2.5 + ph * 10));
      sp.material.opacity = tw * tw;
      sp.scale.setScalar(0.09);
    }

    const head = birdHead.current;
    if (head) {
      head.rotation.x = 0.1 + Math.pow(Math.max(0, Math.sin(time * 2.2 + seed)), 6) * 0.6;
      head.rotation.y = Math.sin(time * 0.7 + seed) * 0.4;
    }
  });

  return (
    <group ref={root}>
      {/* warm golden halo behind the canopy, plus a real light so the shine hits the leaves */}
      <sprite ref={glow} position={[0, 0.95, 0]}>
        <spriteMaterial map={tex} color="#ffd23f" blending={AdditiveBlending} transparent depthWrite={false} />
      </sprite>
      <pointLight position={[0, 1.05, 0]} color="#ffcc4d" intensity={25} distance={3} decay={2} />

      {/* little flowers around the base */}
      {GROUND_FLOWERS.map(([x, y, z], i) => (
        <mesh
          key={i}
          geometry={BLOOM_GEO}
          material={GROUND_FLOWER_MATS[i % GROUND_FLOWER_MATS.length]}
          position={[x, y, z]}
          scale={0.028}
        />
      ))}

      {/* falling petals */}
      {Array.from({ length: petalTotal }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => void (petals.current[i] = el)}
          geometry={PETAL_GEO}
          material={petalMat}
          scale={[0.055, 0.04, 1]}
        />
      ))}

      {/* butterflies */}
      {Array.from({ length: BFLY_COUNT }, (_, i) => (
        <group key={i} ref={(el) => void (bflies.current[i] = el)}>
          <mesh geometry={FLY_BODY_GEO} material={BFLY_BODY_MAT} scale={[0.009, 0.009, 0.035]} />
          <mesh
            ref={(el) => void (rightWings.current[i] = el)}
            geometry={FLY_WING_GEO}
            material={BFLY_WING_MATS[i % BFLY_WING_MATS.length]}
            position={[0.005, 0.004, 0]}
            scale={[0.075, 1, 0.09]}
          />
          <mesh
            ref={(el) => void (leftWings.current[i] = el)}
            geometry={FLY_WING_GEO}
            material={BFLY_WING_MATS[i % BFLY_WING_MATS.length]}
            position={[-0.005, 0.004, 0]}
            scale={[-0.075, 1, 0.09]}
          />
        </group>
      ))}

      {/* twinkling sparkles */}
      {Array.from({ length: SPARK_COUNT }, (_, i) => (
        <sprite key={i} ref={(el) => void (sparks.current[i] = el)}>
          <spriteMaterial map={tex} color="#fff2a8" blending={AdditiveBlending} transparent depthWrite={false} />
        </sprite>
      ))}

      {/* a small bird perched on the canopy, pecking now and then */}
      <group position={[-0.15, 1.27, -0.08]} rotation={[0, 0.9, 0]}>
        <mesh geometry={BLOOM_GEO} scale={[0.045, 0.04, 0.07]}>
          <meshStandardMaterial color="#4a86c5" roughness={0.6} />
        </mesh>
        <mesh geometry={BLOOM_GEO} position={[0, -0.005, 0.045]} scale={[0.03, 0.028, 0.045]}>
          <meshStandardMaterial color="#f4e9d8" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.005, -0.08]} rotation={[0.3, 0, 0]} scale={[0.03, 0.006, 0.07]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#2f5f96" roughness={0.7} />
        </mesh>
        <group ref={birdHead} position={[0, 0.03, 0.055]}>
          <mesh geometry={BLOOM_GEO} position={[0, 0.02, 0.01]} scale={0.03}>
            <meshStandardMaterial color="#4a86c5" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.018, 0.045]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.009, 0.03, 5]} />
            <meshStandardMaterial color="#f59e0b" roughness={0.6} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/**
 * 5/5 — the grand, fully decorated tree: a thick trunk with roots and branches, a full canopy
 * of overlapping foliage clumps, and blossoms/fruit. `tier` escalates size/color with the streak
 * length leading into this day (see gardenTier()); `bonus` marks a day that included jamaah;
 * `condition` (from gardenCondition) tints the canopy and thins out the blossoms so a "5/5 but
 * all late" day visibly looks worse. All-on-time already tops out the green "thriving" look —
 * a "golden" day (every prayer on_time_jamaah) earns the full blessing on top of a gold canopy:
 * halo, petals, butterflies, sparkles, a bird and ground flowers.
 */
export function FloweringStage({
  bonus = false,
  tier = "none",
  condition = "healthy",
  seed = 0,
}: {
  bonus?: boolean;
  tier?: GardenTier;
  condition?: GardenCondition;
  seed?: number;
}) {
  const scale = TIER_SCALE[tier];
  const ringColor = TIER_RING_COLOR[tier];
  const p = CONDITION_PALETTE[condition];
  const bloomCount = CONDITION_BLOOM_COUNT[condition];
  const perfect = condition === "golden";
  const sway = useRef<Group>(null);

  // slow, calm wind sway (much gentler than the flame flicker)
  useFrame(({ clock }) => {
    const g = sway.current;
    if (!g) return;
    const t = clock.getElapsedTime() * 0.6 + seed;
    g.rotation.z = Math.sin(t) * 0.018;
    g.rotation.x = Math.cos(t * 0.8) * 0.012;
  });

  return (
    <group scale={scale}>
      {/* roots flaring out of the base */}
      {[0, 2.1, 4.2].map((a, i) => (
        <mesh
          key={i}
          position={[Math.cos(a) * 0.12, 0.035, Math.sin(a) * 0.12]}
          rotation={[Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9]}
        >
          <coneGeometry args={[0.04, 0.16, 5]} />
          <meshStandardMaterial color={p.trunk} roughness={p.metalness ? 0.3 : 0.95} metalness={p.metalness ?? 0} />
        </mesh>
      ))}

      <group ref={sway}>
        <mesh position={[0, 0.32, 0]}>
          <cylinderGeometry args={[0.085, 0.125, 0.64, 8]} />
          <meshStandardMaterial color={p.trunk} roughness={p.metalness ? 0.3 : 0.9} metalness={p.metalness ?? 0} />
        </mesh>
        {/* two branches reaching into the canopy */}
        <mesh position={[0.12, 0.62, 0]} rotation={[0, 0, -0.7]}>
          <cylinderGeometry args={[0.022, 0.035, 0.32, 6]} />
          <meshStandardMaterial color={p.trunk} roughness={p.metalness ? 0.3 : 0.9} metalness={p.metalness ?? 0} />
        </mesh>
        <mesh position={[-0.11, 0.7, 0.02]} rotation={[0, 0, 0.8]}>
          <cylinderGeometry args={[0.02, 0.032, 0.3, 6]} />
          <meshStandardMaterial color={p.trunk} roughness={p.metalness ? 0.3 : 0.9} metalness={p.metalness ?? 0} />
        </mesh>

        {CANOPY_CLUMPS.map(([x, y, z, r, layer], i) => (
          <mesh key={i} geometry={CLUMP_GEO} position={[x, y, z]} scale={[r, r * 0.85, r]}>
            <meshStandardMaterial
              color={p[layer]}
              roughness={p.metalness ? 0.25 : 0.6}
              metalness={p.metalness ?? 0}
              flatShading
              emissive={p.glow ? p[layer] : "#000000"}
              emissiveIntensity={p.glow ? (p.emissiveIntensity ?? 0.3) : 0}
            />
          </mesh>
        ))}

        {BLOOM_POINTS.slice(0, bloomCount).map(([x, y, z], i) => (
          <mesh key={i} geometry={BLOOM_GEO} position={[x, y, z]} scale={0.05}>
            <meshStandardMaterial
              color={i % 2 === 0 ? TIER_BLOOM_COLOR[tier] : CONDITION_BLOOM_SECONDARY[condition]}
              roughness={0.4}
            />
          </mesh>
        ))}

        {ringColor &&
          AURA_POSITIONS.map(([x, y, z], i) => (
            <FloatingGem
              key={i}
              position={[x, y, z]}
              color={ringColor}
              size={0.045}
              phase={i * 1.1}
              bobHeight={0.06}
              bobSpeed={1.2 + (i % 3) * 0.2}
              spinSpeed={0.7 + (i % 2) * 0.3}
            />
          ))}

        {bonus && (
          <FloatingGem
            position={[0, 1.68, 0]}
            color="#fbbf24"
            size={0.09}
            phase={0}
            bobHeight={0.05}
            bobSpeed={1.6}
            spinSpeed={1}
          />
        )}
      </group>

      {perfect && <TreeBlessing seed={seed} />}
    </group>
  );
}

const MOSS_SPOTS: [number, number, number, number][] = [
  [0.055, 0.08, 0.085, 0.028],
  [-0.05, 0.24, 0.086, 0.022],
  [0.02, 0.32, 0.075, 0.018],
  [-0.06, 0.14, 0.086, 0.02],
];

/** A stone marker for a day with at least one (but not all 5) prayer actively marked missed. */
export function Tombstone() {
  return (
    <group scale={2.4} rotation={[0, 0, -0.035]}>
      {/* dirt mound base */}
      <mesh position={[0, -0.005, 0]} scale={[1, 0.5, 1]}>
        <sphereGeometry args={[0.16, 10, 6]} />
        <meshStandardMaterial color="#5a4630" roughness={1} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.24, 0.04, 0.16]} />
        <meshStandardMaterial color="#7a7a72" roughness={0.95} />
      </mesh>

      {/* main slab */}
      <mesh position={[0, 0.195, 0]}>
        <boxGeometry args={[0.2, 0.31, 0.12]} />
        <meshStandardMaterial color="#9a9a90" roughness={0.9} />
      </mesh>
      {/* slightly wider, flat cap stone */}
      <mesh position={[0, 0.361, 0]}>
        <boxGeometry args={[0.22, 0.03, 0.14]} />
        <meshStandardMaterial color="#8c8c82" roughness={0.9} />
      </mesh>

      {/* recessed engraved panel */}
      <mesh position={[0, 0.2, 0.061]}>
        <boxGeometry args={[0.1, 0.1, 0.004]} />
        <meshStandardMaterial color="#6f6f66" roughness={1} />
      </mesh>
      {/* carved cross mark inside the panel */}
      <mesh position={[0, 0.22, 0.064]}>
        <boxGeometry args={[0.012, 0.045, 0.004]} />
        <meshStandardMaterial color="#54544c" roughness={1} />
      </mesh>
      <mesh position={[0, 0.232, 0.064]}>
        <boxGeometry args={[0.032, 0.012, 0.004]} />
        <meshStandardMaterial color="#54544c" roughness={1} />
      </mesh>

      {/* weathering crack */}
      <mesh position={[0.05, 0.29, 0.062]} rotation={[0, 0, 0.5]}>
        <boxGeometry args={[0.008, 0.12, 0.006]} />
        <meshStandardMaterial color="#54544c" roughness={1} />
      </mesh>

      {/* moss patches */}
      {MOSS_SPOTS.map(([x, y, , s], i) => (
        <mesh key={i} position={[x, y, 0.06]} scale={[1, 1, 0.3]}>
          <sphereGeometry args={[s, 6, 6]} />
          <meshStandardMaterial color="#6f8a4a" roughness={1} />
        </mesh>
      ))}

      {/* smaller broken rock beside the main stone */}
      <group position={[0.16, 0, 0.08]} rotation={[0.1, 0.6, 0.2]} scale={0.55}>
        <mesh position={[0, 0.04, 0]}>
          <dodecahedronGeometry args={[0.07, 0]} />
          <meshStandardMaterial color="#8c8c80" roughness={0.95} />
        </mesh>
      </group>
    </group>
  );
}

const FLY_COUNT = 16;
const FAR_FLY_COUNT = 7;
const FLY_FAR_DISTANCE = 14;

// Shared by every fly so hundreds of flies don't allocate hundreds of geometries/materials.
const FLY_BODY_GEO = new SphereGeometry(1, 8, 6);
const FLY_WING_GEO = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0.5, 0, 0);
const FLY_BODY_MAT = new MeshStandardMaterial({ color: "#16130f", roughness: 0.35, metalness: 0.35 });
const FLY_WING_MAT = new MeshBasicMaterial({
  color: "#dfe6ea",
  transparent: true,
  opacity: 0.5,
  side: DoubleSide,
  depthWrite: false,
});
const flyA = new Vector3();
const flyB = new Vector3();

/** Erratic housefly flight: a wide, fast wander around the stone plus tiny high-frequency jitter. */
function flyPosition(t: number, i: number, seed: number, out: Vector3) {
  const p = seed + i * 2.399;
  const r = 0.25 + (i % 4) * 0.1;
  out.set(
    Math.sin(t * 1.9 + p) * r + Math.sin(t * 5.3 + p * 2) * 0.07 + Math.sin(t * 43 + p) * 0.006,
    0.14 + (0.5 + 0.5 * Math.sin(t * 0.8 + p * 3)) * 0.6 + Math.sin(t * 4.1 + p) * 0.04 + Math.sin(t * 37 + p) * 0.005,
    Math.cos(t * 1.5 + p * 1.3) * r + Math.cos(t * 4.7 + p) * 0.07 + Math.cos(t * 41 + p) * 0.006
  );
  return out;
}

/** A swarm of houseflies buzzing around a tombstoned plot. One useFrame for the whole swarm. */
export function Flies({ seed }: { seed: number }) {
  const root = useRef<Group>(null);
  const flies = useRef<(Group | null)[]>([]);
  const leftWings = useRef<(Mesh | null)[]>([]);
  const rightWings = useRef<(Mesh | null)[]>([]);

  useFrame(({ clock, camera }) => {
    const time = clock.getElapsedTime();
    let limit = FLY_COUNT;
    if (root.current) {
      root.current.getWorldPosition(flyA);
      if (camera.position.distanceTo(flyA) > FLY_FAR_DISTANCE) limit = FAR_FLY_COUNT;
    }
    for (let i = 0; i < FLY_COUNT; i++) {
      const fly = flies.current[i];
      if (!fly) continue;
      fly.visible = i < limit;
      if (!fly.visible) continue;
      const t = time * (0.85 + (i % 3) * 0.2) + seed * 0.01;
      flyPosition(t, i, seed, flyA);
      flyPosition(t + 0.03, i, seed, flyB);
      fly.position.copy(flyA);
      fly.rotation.y = Math.atan2(flyB.x - flyA.x, flyB.z - flyA.z);
      // nose-down while descending, up while climbing
      fly.rotation.x = Math.max(-0.5, Math.min(0.5, -(flyB.y - flyA.y) * 12));
      const flap = 0.4 + 0.6 * Math.sin(time * 70 + i * 1.3);
      const l = leftWings.current[i];
      const rt = rightWings.current[i];
      if (l) l.rotation.z = -flap;
      if (rt) rt.rotation.z = flap;
    }
  });

  return (
    <group ref={root}>
      {Array.from({ length: FLY_COUNT }, (_, i) => (
        <group key={i} ref={(el) => void (flies.current[i] = el)}>
          <mesh geometry={FLY_BODY_GEO} material={FLY_BODY_MAT} scale={[0.017, 0.015, 0.03]} />
          <mesh
            ref={(el) => void (rightWings.current[i] = el)}
            geometry={FLY_WING_GEO}
            material={FLY_WING_MAT}
            position={[0.008, 0.012, -0.002]}
            scale={[0.05, 1, 0.02]}
          />
          <mesh
            ref={(el) => void (leftWings.current[i] = el)}
            geometry={FLY_WING_GEO}
            material={FLY_WING_MAT}
            position={[-0.008, 0.012, -0.002]}
            scale={[-0.05, 1, 0.02]}
          />
        </group>
      ))}
    </group>
  );
}

let softTexture: CanvasTexture | null = null;

/** A shared soft radial-gradient blob, tinted per particle. Created lazily (client only). */
function getSoftTexture(): CanvasTexture | null {
  if (softTexture) return softTexture;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  softTexture = new CanvasTexture(canvas);
  return softTexture;
}

const FLAME_PARTICLES = 17;
const EMBER_PARTICLES = 15;
const SMOKE_PARTICLES = 3;
const FAR_FLAME_PARTICLES = 8;
const FAR_EMBER_PARTICLES = 5;
const FAR_DISTANCE = 14;

const FIRE_WHITE = new Color("#fff4b8");
const FIRE_ORANGE = new Color("#ff9a1f");
const FIRE_RED = new Color("#d4300f");
const worldPos = new Vector3();

/** Hot core is white-yellow, cools to orange, then deep red as the particle rises and fades. */
function flameColor(t: number, out: Color) {
  if (t < 0.4) return out.copy(FIRE_WHITE).lerp(FIRE_ORANGE, t / 0.4);
  return out.copy(FIRE_ORANGE).lerp(FIRE_RED, (t - 0.4) / 0.6);
}

const LOG_LAYOUT: [number, number, number, number][] = [
  [-0.26, 0.03, 0.08, 0.5],
  [0.28, 0.03, -0.06, -0.4],
  [0.02, 0.03, 0.28, 1.4],
  [-0.05, 0.03, -0.27, -1.1],
];

/**
 * A plot with all 5 prayers actively missed: a campfire built from soft, additively-blended
 * billboard particles (so flames blend into one glowing body instead of hard cones), with
 * charred logs, rising embers, drifting smoke and a warm ground glow. One useFrame per plot.
 */
export function BurningPlot({ seed }: { seed: number }) {
  const tex = getSoftTexture();
  const flames = useRef<(Sprite | null)[]>([]);
  const embers = useRef<(Sprite | null)[]>([]);
  const smokes = useRef<(Sprite | null)[]>([]);
  const glow = useRef<Sprite>(null);
  const root = useRef<Group>(null);

  useFrame(({ clock, camera }) => {
    const time = clock.getElapsedTime();

    // Far-away plots are small on screen, so draw fewer particles there.
    let far = false;
    if (root.current) {
      root.current.getWorldPosition(worldPos);
      far = camera.position.distanceTo(worldPos) > FAR_DISTANCE;
    }
    const flameLimit = far ? FAR_FLAME_PARTICLES : FLAME_PARTICLES;
    const emberLimit = far ? FAR_EMBER_PARTICLES : EMBER_PARTICLES;

    for (let i = 0; i < FLAME_PARTICLES; i++) {
      const sp = flames.current[i];
      if (!sp) continue;
      sp.visible = i < flameLimit;
      if (!sp.visible) continue;
      const ph = (seed * 0.013 + i * 0.6180339) % 1;
      const t = (time * 0.7 + ph) % 1;
      const ang = ph * 6.283 + i * 2.1;
      const rad = 0.36 * (1 - t * 0.5) * (0.35 + ((i * 37) % 10) / 15);
      const wob = Math.sin(time * 5 + i * 1.7 + seed) * 0.05 * t;
      sp.position.set(Math.cos(ang) * rad + wob, 0.06 + t * 0.95, Math.sin(ang) * rad + wob * 0.6);
      const flicker = 0.85 + 0.15 * Math.sin(time * 14 + i * 3.1 + seed);
      const size = 0.55 * Math.sin(Math.PI * Math.min(t * 1.15 + 0.08, 1)) * flicker + 0.05;
      sp.scale.set(size * (1 - t * 0.35), size * (1.25 + t * 0.6), 1);
      const mat = sp.material;
      flameColor(t, mat.color);
      mat.opacity = Math.min(t * 12, 1) * Math.pow(1 - t, 1.1) * 0.85;
    }

    for (let i = 0; i < EMBER_PARTICLES; i++) {
      const sp = embers.current[i];
      if (!sp) continue;
      sp.visible = i < emberLimit;
      if (!sp.visible) continue;
      const ph = (seed * 0.021 + i * 0.4142) % 1;
      const t = (time * 0.22 + ph) % 1;
      sp.position.set(
        Math.sin(ph * 40 + time * 1.3) * 0.28 * t,
        0.25 + t * 1.6,
        Math.cos(ph * 30 + time * 1.1) * 0.28 * t
      );
      sp.scale.setScalar(0.07 * (1 - t) + 0.01);
      sp.material.opacity = (1 - t) * (0.6 + 0.4 * Math.sin(time * 20 + i * 5));
    }

    for (let i = 0; i < SMOKE_PARTICLES; i++) {
      const sp = smokes.current[i];
      if (!sp) continue;
      const ph = (seed * 0.017 + i * 0.3333) % 1;
      const t = (time * 0.1 + ph) % 1;
      sp.position.set(Math.sin(ph * 20 + time * 0.4) * 0.18 * t, 0.85 + t * 1.2, Math.cos(ph * 17 + time * 0.3) * 0.18 * t);
      sp.scale.setScalar(0.3 + t * 0.7);
      sp.material.opacity = 0.22 * Math.sin(Math.PI * t);
    }

    const gl = glow.current;
    if (gl) {
      const f = 0.9 + 0.1 * Math.sin(time * 9 + seed) + 0.05 * Math.sin(time * 23 + seed * 2);
      gl.scale.setScalar(2 * f);
      gl.material.opacity = 0.5 * f;
    }
  });

  return (
    <group ref={root} scale={1.7}>
      {/* warm light pooling on the ground and around the flames */}
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.72, 24]} />
        <meshBasicMaterial color="#ff5a14" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <sprite ref={glow} position={[0, 0.3, 0]}>
        <spriteMaterial map={tex} color="#ff7a1a" blending={AdditiveBlending} transparent depthWrite={false} />
      </sprite>

      {/* charred crossed logs at the base */}
      {LOG_LAYOUT.map(([x, y, z, rot], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, rot, Math.PI / 2]}>
          <cylinderGeometry args={[0.035, 0.04, 0.42, 7]} />
          <meshStandardMaterial color="#241a14" roughness={1} />
        </mesh>
      ))}

      {Array.from({ length: SMOKE_PARTICLES }, (_, i) => (
        <sprite key={`s${i}`} ref={(el) => void (smokes.current[i] = el)}>
          <spriteMaterial map={tex} color="#3d3d3b" transparent depthWrite={false} />
        </sprite>
      ))}
      {Array.from({ length: FLAME_PARTICLES }, (_, i) => (
        <sprite key={`f${i}`} ref={(el) => void (flames.current[i] = el)}>
          <spriteMaterial map={tex} color="#ff9a1f" blending={AdditiveBlending} transparent depthWrite={false} />
        </sprite>
      ))}
      {Array.from({ length: EMBER_PARTICLES }, (_, i) => (
        <sprite key={`e${i}`} ref={(el) => void (embers.current[i] = el)}>
          <spriteMaterial map={tex} color="#ffc266" blending={AdditiveBlending} transparent depthWrite={false} />
        </sprite>
      ))}
    </group>
  );
}

export function PlotRing({
  cell,
  cols,
  rows,
  color,
}: {
  cell: GardenCell;
  cols: number;
  rows: number;
  color: string;
}) {
  const [x, , z] = gridPosition(cell.col, cell.row, cols, rows);
  return (
    <mesh position={[x, 0.11, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.64, 0.72, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.85} />
    </mesh>
  );
}

export function StageLayer({ cells, cols, rows }: { cells: GardenCell[]; cols: number; rows: number }) {
  const growingCells = cells.filter((c) => c.plotState === "growing");
  const tombstonedCells = cells.filter((c) => c.date && c.plotState === "tombstoned");
  const burningCells = cells.filter((c) => c.date && c.plotState === "burning");

  return (
    <>
      <StageGroup cells={growingCells} cols={cols} rows={rows} stage="seed">
        {(c) => <SeedStage condition={c.condition} />}
      </StageGroup>
      <StageGroup cells={growingCells} cols={cols} rows={rows} stage="sprout">
        {(c) => <SproutStage condition={c.condition} />}
      </StageGroup>
      <StageGroup cells={growingCells} cols={cols} rows={rows} stage="sapling">
        {(c) => <SaplingStage condition={c.condition} />}
      </StageGroup>
      <StageGroup cells={growingCells} cols={cols} rows={rows} stage="tree">
        {(c) => <TreeStage condition={c.condition} />}
      </StageGroup>
      <StageGroup cells={growingCells} cols={cols} rows={rows} stage="flowering">
        {(c) => (
          <FloweringStage bonus={c.bonus} tier={c.tier} condition={c.condition} seed={c.col * 131 + c.row * 977} />
        )}
      </StageGroup>

      {tombstonedCells.map((c, i) => {
        const [x, , z] = gridPosition(c.col, c.row, cols, rows);
        const seed = c.col * 131 + c.row * 977;
        return (
          <group key={`t${i}`} position={[x, 0.045, z]}>
            <Tombstone />
            <Flies seed={seed} />
          </group>
        );
      })}

      {burningCells.map((c, i) => {
        const [x, , z] = gridPosition(c.col, c.row, cols, rows);
        const seed = c.col * 131 + c.row * 977;
        return (
          <group key={`b${i}`} position={[x, 0.045, z]}>
            <BurningPlot seed={seed} />
          </group>
        );
      })}
    </>
  );
}
