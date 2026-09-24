import { DoubleSide } from "three";
import { Instance, Instances } from "@react-three/drei";

const COL_SPACING = 1.4;
const ROW_SPACING = 1.4;
const FENCE_MARGIN = 0.4;

/** Deterministic pseudo-random in [0, 1) so the scenery is stable across re-renders. */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** A simple low-poly pine, distinct from the prayer trees so the two never get confused. */
function PineTree({ position, scale = 1, seed = 0 }: { position: [number, number, number]; scale?: number; seed?: number }) {
  const hueJitter = seededRandom(seed) * 0.1 - 0.05;
  const green = hueJitter > 0 ? "#1f7a3f" : "#1c6e38";
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 0.24, 6]} />
        <meshStandardMaterial color="#6b4527" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <coneGeometry args={[0.34, 0.5, 7]} />
        <meshStandardMaterial color={green} roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.68, 0]}>
        <coneGeometry args={[0.26, 0.42, 7]} />
        <meshStandardMaterial color={green} roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <coneGeometry args={[0.17, 0.32, 7]} />
        <meshStandardMaterial color={green} roughness={0.75} />
      </mesh>
    </group>
  );
}

const ROUND_TREE_PALETTES: [string, string][] = [
  ["#2f8a44", "#6b4527"], // healthy green
  ["#3aa354", "#6b4527"], // lighter green
  ["#c97b2e", "#5a4634"], // autumn orange
  ["#d1a53a", "#5a4634"], // autumn gold
  ["#8a9a3f", "#7a6135"], // olive
];

/** A round-canopy deciduous tree, distinct from the conical pines, in one of a few color
 *  variants (green, autumn orange, gold, olive) so the forest edge doesn't read as uniform. */
function RoundTree({ position, scale = 1, seed = 0 }: { position: [number, number, number]; scale?: number; seed?: number }) {
  const [canopy, trunk] = ROUND_TREE_PALETTES[Math.floor(seededRandom(seed) * ROUND_TREE_PALETTES.length)];
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.045, 0.065, 0.32, 6]} />
        <meshStandardMaterial color={trunk} roughness={0.9} />
      </mesh>
      <mesh position={[0.07, 0.42, 0.02]}>
        <icosahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial color={canopy} roughness={0.7} flatShading />
      </mesh>
      <mesh position={[-0.08, 0.4, -0.05]}>
        <icosahedronGeometry args={[0.19, 0]} />
        <meshStandardMaterial color={canopy} roughness={0.7} flatShading />
      </mesh>
      <mesh position={[0, 0.52, -0.02]}>
        <icosahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial color={canopy} roughness={0.7} flatShading />
      </mesh>
    </group>
  );
}

/** A cluster of two or three low-poly rocks. */
function RockCluster({ position, scale = 1, seed = 0 }: { position: [number, number, number]; scale?: number; seed?: number }) {
  const rocks: [number, number, number, number][] = [
    [0, 0, 0, 0.14],
    [0.16, 0, 0.08, 0.09],
    [-0.13, 0, -0.1, 0.1],
  ];
  return (
    <group position={position} scale={scale}>
      {rocks.map(([x, , z, r], i) => (
        <mesh key={i} position={[x, r * 0.5, z]} rotation={[seededRandom(seed + i) * 2, seededRandom(seed + i + 5) * 2, 0]}>
          <dodecahedronGeometry args={[r, 0]} />
          <meshStandardMaterial color="#8c8c80" roughness={0.95} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/** A tall rocky peak with a snow cap, placed far beyond the tree ring to frame the horizon. */
function Mountain({ position, scale = 1, seed = 0 }: { position: [number, number, number]; scale?: number; seed?: number }) {
  const rock = seededRandom(seed) > 0.5 ? "#8b8378" : "#7c766c";
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.3, 0]} rotation={[0, seededRandom(seed + 1) * Math.PI, 0]}>
        <coneGeometry args={[1.3, 2.7, 5]} />
        <meshStandardMaterial color={rock} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0, 2.35, 0]} rotation={[0, seededRandom(seed + 2) * Math.PI, 0]}>
        <coneGeometry args={[0.5, 0.75, 5]} />
        <meshStandardMaterial color="#f5f7fa" roughness={0.9} flatShading />
      </mesh>
    </group>
  );
}

/** A tiny low-poly cottage: box walls, a pyramid roof, a door and one window. */
function Cottage({
  position,
  rotationY = 0,
  scale = 1,
  wall = "#e8d9b8",
  roof = "#a3432f",
}: {
  position: [number, number, number];
  rotationY?: number;
  scale?: number;
  wall?: string;
  roof?: string;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[0.62, 0.44, 0.52]} />
        <meshStandardMaterial color={wall} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.55, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.48, 0.34, 4]} />
        <meshStandardMaterial color={roof} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.12, 0.261]}>
        <boxGeometry args={[0.14, 0.24, 0.02]} />
        <meshStandardMaterial color="#6b4527" roughness={0.8} />
      </mesh>
      <mesh position={[0.18, 0.26, 0.261]}>
        <boxGeometry args={[0.12, 0.12, 0.02]} />
        <meshStandardMaterial color="#bfe3f0" roughness={0.4} />
      </mesh>
      <mesh position={[0.24, 0.42, -0.1]}>
        <boxGeometry args={[0.08, 0.22, 0.08]} />
        <meshStandardMaterial color="#9a9a90" roughness={0.9} />
      </mesh>
    </group>
  );
}

/** A larger barn-like building, the "big house" among the village cluster. */
function Barn({ position, rotationY = 0, scale = 1 }: { position: [number, number, number]; rotationY?: number; scale?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <mesh position={[0, 0.32, 0]}>
        <boxGeometry args={[1.0, 0.64, 0.68]} />
        <meshStandardMaterial color="#c94f3f" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.78, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0, 0.52, 0.4, 4, 1, false, Math.PI / 4]} />
        <meshStandardMaterial color="#4a4038" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.2, 0.341]}>
        <boxGeometry args={[0.3, 0.36, 0.02]} />
        <meshStandardMaterial color="#3e2f22" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.55, 0.341]}>
        <boxGeometry args={[0.16, 0.16, 0.02]} />
        <meshStandardMaterial color="#f5ead2" roughness={0.7} />
      </mesh>
    </group>
  );
}

/** A small grazing sheep: rounded white body, dark legs and head. */
function Sheep({ position, rotationY = 0, scale = 1 }: { position: [number, number, number]; rotationY?: number; scale?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <mesh position={[0, 0.16, 0]}>
        <sphereGeometry args={[0.15, 10, 8]} />
        <meshStandardMaterial color="#f5f3ea" roughness={0.9} />
      </mesh>
      <mesh position={[0.16, 0.15, 0]}>
        <sphereGeometry args={[0.08, 8, 6]} />
        <meshStandardMaterial color="#3a352f" roughness={0.7} />
      </mesh>
      {[
        [0.08, 0, 0.08],
        [0.08, 0, -0.08],
        [-0.08, 0, 0.08],
        [-0.08, 0, -0.08],
      ].map(([x, , z], i) => (
        <mesh key={i} position={[x, 0.04, z]}>
          <cylinderGeometry args={[0.015, 0.015, 0.09, 5]} />
          <meshStandardMaterial color="#3a352f" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/** A simple park bench: two plank seats on four short legs. */
function Bench({ position, rotationY = 0, scale = 1 }: { position: [number, number, number]; rotationY?: number; scale?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[0.4, 0.03, 0.14]} />
        <meshStandardMaterial color="#8b5e34" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.28, -0.06]}>
        <boxGeometry args={[0.4, 0.16, 0.03]} />
        <meshStandardMaterial color="#8b5e34" roughness={0.85} />
      </mesh>
      {[
        [0.16, 0.08],
        [-0.16, 0.08],
        [0.16, -0.06],
        [-0.16, -0.06],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.08, z]}>
          <boxGeometry args={[0.03, 0.16, 0.03]} />
          <meshStandardMaterial color="#4a3520" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/** A small still lake: a blue disc set slightly into the ground with a sandy shore ring. */
function Lake({ position, radius = 1.3 }: { position: [number, number, number]; radius?: number }) {
  return (
    <group position={position}>
      <mesh position={[0, -0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius * 1.18, 28]} />
        <meshStandardMaterial color="#ddd0a8" roughness={0.95} side={DoubleSide} />
      </mesh>
      <mesh position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius, 28]} />
        <meshStandardMaterial color="#5fa8c9" roughness={0.35} metalness={0.15} side={DoubleSide} />
      </mesh>
      <mesh position={[radius * 0.3, 0.005, -radius * 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius * 0.18, 16]} />
        <meshStandardMaterial color="#88c2dd" roughness={0.3} metalness={0.1} transparent opacity={0.6} side={DoubleSide} />
      </mesh>
    </group>
  );
}

/** A small tilled crop field: rows of dark soil strips dotted with tiny green sprigs. */
function CropField({ position, rotationY = 0, rows = 3, cols = 4 }: { position: [number, number, number]; rotationY?: number; rows?: number; cols?: number }) {
  const rowSpacing = 0.28;
  const colSpacing = 0.22;
  const width = (cols - 1) * colSpacing;
  const depth = (rows - 1) * rowSpacing;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width + 0.4, depth + 0.3]} />
        <meshStandardMaterial color="#6b5334" roughness={1} side={DoubleSide} />
      </mesh>
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const x = -width / 2 + c * colSpacing;
          const z = -depth / 2 + r * rowSpacing;
          const seed = r * 11 + c * 7;
          return (
            <mesh key={`${r}-${c}`} position={[x, 0.045, z]} scale={0.8 + seededRandom(seed) * 0.4}>
              <coneGeometry args={[0.03, 0.09, 5]} />
              <meshStandardMaterial color={seededRandom(seed + 1) > 0.5 ? "#4f9a4a" : "#5cae53" } roughness={0.7} />
            </mesh>
          );
        })
      )}
    </group>
  );
}

const GRASS_TUFT_GEO_ARGS: [number, number, number] = [0.02, 0.14, 4];

/** Scattered grass tufts across the meadow so the ground reads as textured turf, not a flat
 *  green disc. Instanced for performance since there can be a couple hundred of them. */
function MeadowGrass({ clearingR, avoidR }: { clearingR: number; avoidR: number }) {
  const count = 220;
  const tufts: [number, number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    const a = seededRandom(i * 3.1) * Math.PI * 2;
    const r = avoidR + seededRandom(i * 5.7 + 1) * (clearingR * 0.95 - avoidR);
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    const h = 0.7 + seededRandom(i * 9.3) * 0.8;
    tufts.push([x, z, h, seededRandom(i * 2.2) * Math.PI]);
  }
  return (
    <Instances limit={count}>
      <coneGeometry args={GRASS_TUFT_GEO_ARGS} />
      <meshStandardMaterial roughness={0.85} color="#6fae52" />
      {tufts.map(([x, z, h, rot], i) => (
        <Instance key={i} position={[x, 0.03, z]} rotation={[0, rot, 0.08]} scale={[1, h, 1]} />
      ))}
    </Instances>
  );
}

/** A short stone pavement path leading from the edge of the scene up to the fence gate. */
function PavementPath({ startZ, endZ, x }: { startZ: number; endZ: number; x: number }) {
  const count = 5;
  const tiles = Array.from({ length: count }, (_, i) => startZ + ((endZ - startZ) * i) / (count - 1));
  return (
    <>
      {tiles.map((z, i) => (
        <mesh key={i} position={[x + (seededRandom(i * 3) - 0.5) * 0.08, 0.005, z]} rotation={[-Math.PI / 2, 0, seededRandom(i) * 0.3]}>
          <circleGeometry args={[0.22, 6]} />
          <meshStandardMaterial color="#b9b3a4" roughness={0.95} side={DoubleSide} />
        </mesh>
      ))}
    </>
  );
}

/**
 * Everything outside the fenced monthly plot: a wider meadow clearing textured with grass
 * tufts, a ring of pine trees marking a forest edge, distant mountains framing the horizon,
 * rock clusters, a small village (one barn plus two cottages), a lake with a sandy shore,
 * park benches, a crop field, grazing sheep and a pavement path up to the gate — so the garden
 * reads as part of a lived-in place, not a tile floating in empty space.
 */
export function GardenSurroundings({ cols, rows }: { cols: number; rows: number }) {
  const halfW = (cols * COL_SPACING) / 2 + FENCE_MARGIN;
  const halfD = (rows * ROW_SPACING) / 2 + FENCE_MARGIN;
  const clearingR = Math.max(halfW, halfD) * 2.6;

  // Ring of pine trees just outside the fence, skipping a gap at the front (+Z) for the path.
  const treeRing: [number, number, number][] = [];
  const treeCount = 26;
  for (let i = 0; i < treeCount; i++) {
    const a = (i / treeCount) * Math.PI * 2;
    const gapFront = Math.cos(a) > -0.35 && Math.sin(a) > 0.5;
    if (gapFront) continue;
    const r = Math.max(halfW, halfD) * (1.3 + seededRandom(i) * 0.5);
    treeRing.push([Math.sin(a) * r, 0, Math.cos(a) * r]);
  }

  // Ring of distant mountains beyond the tree line.
  const mountains: [number, number, number][] = [];
  const mountainCount = 10;
  for (let i = 0; i < mountainCount; i++) {
    const a = (i / mountainCount) * Math.PI * 2 + 0.3;
    const r = clearingR * (1.05 + seededRandom(i + 100) * 0.35);
    mountains.push([Math.sin(a) * r, 0, Math.cos(a) * r]);
  }

  return (
    <>
      {/* wide meadow clearing under everything */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[clearingR, 48]} />
        <meshStandardMaterial color="#9fd189" roughness={0.95} />
      </mesh>

      <MeadowGrass clearingR={clearingR} avoidR={Math.max(halfW, halfD) * 1.05} />

      {mountains.map(([x, , z], i) => (
        <Mountain key={`m${i}`} position={[x, -0.3, z]} scale={2.6 + seededRandom(i + 200) * 1.6} seed={i} />
      ))}

      {treeRing.map(([x, , z], i) => {
        const isPine = seededRandom(i + 77) > 0.45;
        const scale = 0.85 + seededRandom(i + 50) * 0.5;
        return isPine ? (
          <PineTree key={`t${i}`} position={[x, 0, z]} scale={scale} seed={i} />
        ) : (
          <RoundTree key={`t${i}`} position={[x, 0, z]} scale={scale * 1.3} seed={i} />
        );
      })}

      <RockCluster position={[-halfW - 0.9, 0, halfD * 0.2]} scale={1} seed={1} />
      <RockCluster position={[halfW + 1.1, 0, -halfD * 0.85]} scale={0.8} seed={2} />
      <RockCluster position={[-halfW * 0.5, 0, -halfD - 1.2]} scale={0.9} seed={3} />

      {/* village cluster: one barn, two cottages of different sizes */}
      <Barn position={[halfW + 2.1, 0, halfD * 0.75]} rotationY={-0.5} scale={1} />
      <Cottage position={[halfW + 1.3, 0, halfD * 1.3]} rotationY={-0.9} scale={1.05} />
      <Cottage
        position={[halfW + 2.6, 0, halfD * 1.6]}
        rotationY={-0.2}
        scale={0.78}
        wall="#dfe3d0"
        roof="#5b7a5e"
      />
      <Cottage
        position={[halfW + 0.6, 0, halfD * 1.85]}
        rotationY={0.5}
        scale={0.65}
        wall="#f2e2c4"
        roof="#7a4a3a"
      />

      <CropField position={[halfW + 1.8, 0, halfD * 0.25]} rotationY={-0.5} rows={3} cols={5} />

      <Lake position={[-halfW - 1.9, 0, -halfD * 0.3]} radius={1.15} />
      <Bench position={[-halfW - 0.7, 0, -halfD * 0.3]} rotationY={1.4} scale={1.1} />
      <Bench position={[-halfW - 1.9, 0, -halfD * 0.3 - 1.35]} rotationY={0} scale={1.1} />

      <Sheep position={[halfW + 0.9, 0, -halfD * 0.1]} rotationY={0.4} scale={1} />
      <Sheep position={[halfW + 1.3, 0, 0.4]} rotationY={-0.3} scale={0.9} />

      <PavementPath x={-0.2} startZ={halfD + 1.6} endZ={halfD + 0.35} />
    </>
  );
}
