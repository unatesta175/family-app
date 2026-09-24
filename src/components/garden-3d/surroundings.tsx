import { DoubleSide } from "three";

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

/** A tiny low-poly cottage: box walls, a pyramid roof, a door and one window. */
function Cottage({ position, rotationY = 0, scale = 1 }: { position: [number, number, number]; rotationY?: number; scale?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[0.62, 0.44, 0.52]} />
        <meshStandardMaterial color="#e8d9b8" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.55, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.48, 0.34, 4]} />
        <meshStandardMaterial color="#a3432f" roughness={0.8} />
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
 * Everything outside the fenced monthly plot: a wider meadow clearing, a ring of pine trees
 * marking a forest edge, a couple of rock clusters, a small cottage, grazing sheep and a
 * pavement path up to the gate — so the garden reads as part of a place, not a tile floating
 * in empty space.
 */
export function GardenSurroundings({ cols, rows }: { cols: number; rows: number }) {
  const halfW = (cols * COL_SPACING) / 2 + FENCE_MARGIN;
  const halfD = (rows * ROW_SPACING) / 2 + FENCE_MARGIN;
  const clearingR = Math.max(halfW, halfD) * 2.3;

  // Ring of pine trees just outside the fence, skipping a gap at the front (+Z) for the path.
  const treeRing: [number, number, number][] = [];
  const treeCount = 22;
  for (let i = 0; i < treeCount; i++) {
    const a = (i / treeCount) * Math.PI * 2;
    const gapFront = Math.cos(a) > -0.35 && Math.sin(a) > 0.55;
    if (gapFront) continue;
    const r = Math.max(halfW, halfD) * (1.35 + seededRandom(i) * 0.55);
    treeRing.push([Math.sin(a) * r, 0, Math.cos(a) * r]);
  }

  return (
    <>
      {/* wide meadow clearing under everything */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[clearingR, 48]} />
        <meshStandardMaterial color="#9fd189" roughness={0.95} />
      </mesh>

      {treeRing.map(([x, , z], i) => (
        <PineTree key={`t${i}`} position={[x, 0, z]} scale={0.85 + seededRandom(i + 50) * 0.5} seed={i} />
      ))}

      <RockCluster position={[-halfW - 0.9, 0, halfD * 0.2]} scale={1} seed={1} />
      <RockCluster position={[halfW + 1.1, 0, -halfD * 0.5]} scale={0.8} seed={2} />
      <RockCluster position={[-halfW * 0.5, 0, -halfD - 1.2]} scale={0.9} seed={3} />

      <Cottage position={[halfW + 1.5, 0, halfD * 0.6]} rotationY={-0.6} scale={1.1} />

      <Sheep position={[halfW + 0.9, 0, -halfD * 0.1]} rotationY={0.4} scale={1} />
      <Sheep position={[halfW + 1.3, 0, 0.4]} rotationY={-0.3} scale={0.9} />

      <PavementPath x={-0.2} startZ={halfD + 1.6} endZ={halfD + 0.35} />
    </>
  );
}
