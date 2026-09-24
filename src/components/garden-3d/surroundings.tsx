import { useMemo } from "react";
import { BufferAttribute, Color, DoubleSide, PlaneGeometry } from "three";
import { Instance, Instances } from "@react-three/drei";

const COL_SPACING = 1.4;
const ROW_SPACING = 1.4;
const FENCE_MARGIN = 0.4;

/** Deterministic pseudo-random in [0, 1) so the scenery is stable across re-renders. */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

type PlacedTree = { position: [number, number, number]; scale: number; seed: number };
type PlacedRocks = { position: [number, number, number]; scale: number; seed: number };

const ROUND_TREE_PALETTES: [string, string][] = [
  ["#2f8a44", "#6b4527"], // healthy green
  ["#3aa354", "#6b4527"], // lighter green
  ["#c97b2e", "#5a4634"], // autumn orange
  ["#d1a53a", "#5a4634"], // autumn gold
  ["#8a9a3f", "#7a6135"], // olive
];

/**
 * All pine trees rendered as GPU instances: one shared geometry per tier (trunk + 3 canopy
 * cones) reused across every tree, so hundreds or thousands of pines cost only 4 draw calls
 * total instead of 4 meshes each. Each tier still gets its own per-instance position/scale/
 * color, matching what the old per-tree component produced visually.
 */
function InstancedPineTrees({ trees }: { trees: PlacedTree[] }) {
  const n = Math.max(trees.length, 1);
  const greenOf = (seed: number) => (seededRandom(seed) * 0.1 - 0.05 > 0 ? "#1f7a3f" : "#1c6e38");
  return (
    <>
      <Instances limit={n}>
        <cylinderGeometry args={[0.05, 0.07, 0.24, 6]} />
        <meshStandardMaterial color="#6b4527" roughness={0.9} />
        {trees.map((t, i) => (
          <Instance
            key={i}
            position={[t.position[0], t.position[1] + 0.12 * t.scale, t.position[2]]}
            scale={t.scale}
          />
        ))}
      </Instances>
      {[0.42, 0.68, 0.9].map((y, tier) => {
        const radius = [0.34, 0.26, 0.17][tier];
        const height = [0.5, 0.42, 0.32][tier];
        return (
          <Instances key={tier} limit={n}>
            <coneGeometry args={[radius, height, 7]} />
            <meshStandardMaterial roughness={0.75} />
            {trees.map((t, i) => (
              <Instance
                key={i}
                position={[t.position[0], t.position[1] + y * t.scale, t.position[2]]}
                scale={t.scale}
                color={greenOf(t.seed)}
              />
            ))}
          </Instances>
        );
      })}
    </>
  );
}

const ROUND_CANOPY_OFFSETS: [number, number, number, number][] = [
  [0.07, 0.42, 0.02, 0.22],
  [-0.08, 0.4, -0.05, 0.19],
  [0, 0.52, -0.02, 0.2],
];

/** All round-canopy deciduous trees as GPU instances (trunk block + one reused canopy-blob
 *  block placed 3x per tree), in one of a few color variants so the forest edge doesn't read
 *  as uniform, at any count. */
function InstancedRoundTrees({ trees }: { trees: PlacedTree[] }) {
  const n = Math.max(trees.length, 1);
  const paletteOf = (seed: number) => ROUND_TREE_PALETTES[Math.floor(seededRandom(seed) * ROUND_TREE_PALETTES.length)];
  return (
    <>
      <Instances limit={n}>
        <cylinderGeometry args={[0.045, 0.065, 0.32, 6]} />
        <meshStandardMaterial roughness={0.9} />
        {trees.map((t, i) => (
          <Instance
            key={i}
            position={[t.position[0], t.position[1] + 0.16 * t.scale, t.position[2]]}
            scale={t.scale}
            color={paletteOf(t.seed)[1]}
          />
        ))}
      </Instances>
      <Instances limit={n * ROUND_CANOPY_OFFSETS.length}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial roughness={0.7} flatShading />
        {trees.flatMap((t, i) => {
          const canopy = paletteOf(t.seed)[0];
          return ROUND_CANOPY_OFFSETS.map(([dx, dy, dz, r], j) => (
            <Instance
              key={`${i}-${j}`}
              position={[t.position[0] + dx * t.scale, t.position[1] + dy * t.scale, t.position[2] + dz * t.scale]}
              scale={r * t.scale}
              color={canopy}
            />
          ));
        })}
      </Instances>
    </>
  );
}

const ROCK_OFFSETS: [number, number, number][] = [
  [0, 0, 0.14],
  [0.16, 0.08, 0.09],
  [-0.13, -0.1, 0.1],
];

/** Every rock, across every cluster, as one instanced batch (a single draw call regardless of
 *  how many clusters there are). */
function InstancedRocks({ clusters }: { clusters: PlacedRocks[] }) {
  const n = Math.max(clusters.length * ROCK_OFFSETS.length, 1);
  return (
    <Instances limit={n}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#8c8c80" roughness={0.95} flatShading />
      {clusters.flatMap((c, i) =>
        ROCK_OFFSETS.map(([dx, dz, r], j) => {
          const s = c.seed + j;
          return (
            <Instance
              key={`${i}-${j}`}
              position={[c.position[0] + dx * c.scale, c.position[1] + r * 0.5 * c.scale, c.position[2] + dz * c.scale]}
              rotation={[seededRandom(s) * 2, seededRandom(s + 5) * 2, 0]}
              scale={r * c.scale}
            />
          );
        })
      )}
    </Instances>
  );
}

function smoothstep(a: number, b: number, r: number): number {
  const t = Math.min(1, Math.max(0, (r - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

type MountainCluster = { cx: number; cz: number; height: number; spread: number };

/**
 * Builds the terrain height function: gentle rolling undulation across the whole meadow, plus
 * big rounded mountain bumps (overlapping gaussian humps, so adjacent ones blend into a
 * connected ridge instead of isolated peaks) concentrated in a ring beyond the tree line.
 * Flattened to exactly 0 within the garden's fenced footprint and around the lake, so those
 * stay level. Returned as a plain function (not a component) so both the terrain mesh and the
 * decorative object placement below can sample the same ground height.
 */
function makeTerrainHeight(flatR: number, lakeCenter: [number, number], clusters: MountainCluster[]) {
  return function terrainHeight(x: number, z: number): number {
    let h = (Math.sin(x * 0.6 + 1.3) + Math.cos(z * 0.55 - 0.7) + Math.sin((x + z) * 0.35 + 2.1)) * 0.07;
    for (const c of clusters) {
      const dx = x - c.cx;
      const dz = z - c.cz;
      const d2 = dx * dx + dz * dz;
      h += c.height * Math.exp(-d2 / (2 * c.spread * c.spread));
    }
    const r = Math.hypot(x, z);
    h *= smoothstep(flatR, flatR + 1.2, r);
    const lakeD = Math.hypot(x - lakeCenter[0], z - lakeCenter[1]);
    h *= smoothstep(1.6, 2.6, lakeD);
    return h;
  };
}

/** The ground itself: a displaced plane colored from meadow green at low elevation, through
 *  rock grey, up to a snowy cap at the highest points — rounded rolling hills and connected
 *  mountain ridges instead of separate sharp-peaked pyramids. */
function Terrain({
  size,
  segments,
  heightFn,
}: {
  size: number;
  segments: number;
  heightFn: (x: number, z: number) => number;
}) {
  const geometry = useMemo(() => {
    const geo = new PlaneGeometry(size, size, segments, segments);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const low = new Color("#9fd189");
    const mid = new Color("#8a8f6e");
    const rockC = new Color("#8b8378");
    const snow = new Color("#f5f7fa");
    const tmp = new Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const worldZ = -y;
      const h = heightFn(x, worldZ);
      pos.setZ(i, h);
      const t = Math.min(1, Math.max(0, h / 3.2));
      if (t < 0.35) tmp.copy(low).lerp(mid, t / 0.35);
      else if (t < 0.75) tmp.copy(mid).lerp(rockC, (t - 0.35) / 0.4);
      else tmp.copy(rockC).lerp(snow, (t - 0.75) / 0.25);
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    geo.rotateX(-Math.PI / 2);
    geo.computeVertexNormals();
    geo.setAttribute("color", new BufferAttribute(colors, 3));
    return geo;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, segments]);

  return (
    <mesh geometry={geometry} position={[0, -0.05, 0]} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.95} />
    </mesh>
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
 *  green disc. Instanced for performance since there can be several hundred of them. Follows
 *  the terrain's elevation so tufts on the hillsides sit on the slope, not floating/sunken. */
function MeadowGrass({
  clearingR,
  avoidR,
  heightFn,
}: {
  clearingR: number;
  avoidR: number;
  heightFn: (x: number, z: number) => number;
}) {
  const count = 4400;
  const tufts: [number, number, number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    const a = seededRandom(i * 3.1) * Math.PI * 2;
    const r = avoidR + seededRandom(i * 5.7 + 1) * (clearingR * 0.95 - avoidR);
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    const h = 0.7 + seededRandom(i * 9.3) * 0.8;
    tufts.push([x, z, h, seededRandom(i * 2.2) * Math.PI, heightFn(x, z)]);
  }
  return (
    <Instances limit={count}>
      <coneGeometry args={GRASS_TUFT_GEO_ARGS} />
      <meshStandardMaterial roughness={0.85} color="#6fae52" />
      {tufts.map(([x, z, h, rot, gy], i) => (
        <Instance key={i} position={[x, gy + 0.03, z]} rotation={[0, rot, 0.08]} scale={[1, h, 1]} />
      ))}
    </Instances>
  );
}

/** A short stone pavement path leading from the edge of the scene up to the fence gate. */
function PavementPath({
  startZ,
  endZ,
  x,
  heightFn,
}: {
  startZ: number;
  endZ: number;
  x: number;
  heightFn: (x: number, z: number) => number;
}) {
  const count = 5;
  const tiles = Array.from({ length: count }, (_, i) => startZ + ((endZ - startZ) * i) / (count - 1));
  return (
    <>
      {tiles.map((z, i) => {
        const tx = x + (seededRandom(i * 3) - 0.5) * 0.08;
        return (
          <mesh key={i} position={[tx, heightFn(tx, z) + 0.005, z]} rotation={[-Math.PI / 2, 0, seededRandom(i) * 0.3]}>
            <circleGeometry args={[0.22, 6]} />
            <meshStandardMaterial color="#b9b3a4" roughness={0.95} side={DoubleSide} />
          </mesh>
        );
      })}
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
  const maxHalf = Math.max(halfW, halfD);
  const clearingR = maxHalf * 2.6;
  const flatR = maxHalf * 1.1;
  const lakeCenter: [number, number] = [-halfW - 1.9, -halfD * 0.3];

  // Mountain humps overlap their neighbors (spread wide relative to their spacing) so the
  // range reads as one connected, rounded ridge rather than isolated peaks. Left open across
  // the front (+Z, positive sin/cos band) so the view toward the path stays clear.
  const clusters: MountainCluster[] = useMemo(() => {
    const list: MountainCluster[] = [];
    const count = 16;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const gapFront = Math.cos(a) > -0.3 && Math.sin(a) > 0.45;
      if (gapFront) continue;
      const r = clearingR * (1.1 + seededRandom(i + 300) * 0.3);
      list.push({
        cx: Math.sin(a) * r,
        cz: Math.cos(a) * r,
        height: 2.1 + seededRandom(i + 400) * 1.5,
        spread: 2.0 + seededRandom(i + 500) * 0.8,
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearingR]);

  const heightFn = useMemo(
    () => makeTerrainHeight(flatR, lakeCenter, clusters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flatR, lakeCenter[0], lakeCenter[1], clusters]
  );

  // Scattered forest around the meadow (organic, not a perfect ring), skipping the same front
  // gap as the mountains so the view toward the path stays open. Rendered via GPU instancing
  // (see InstancedPineTrees/InstancedRoundTrees) so a count this high stays cheap to draw.
  const pineTrees: PlacedTree[] = [];
  const roundTrees: PlacedTree[] = [];
  const treeCount = 400;
  for (let i = 0; i < treeCount; i++) {
    const a = seededRandom(i * 1.7 + 10) * Math.PI * 2;
    const gapFront = Math.cos(a) > -0.3 && Math.sin(a) > 0.45;
    if (gapFront) continue;
    const r = maxHalf * (1.15 + seededRandom(i * 2.3 + 20) * 1.2);
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    if (Math.hypot(x - lakeCenter[0], z - lakeCenter[1]) < 2.4) continue;
    const isPine = seededRandom(i + 77) > 0.45;
    const scale = 0.85 + seededRandom(i + 50) * 0.5;
    const entry: PlacedTree = { position: [x, heightFn(x, z), z], scale: isPine ? scale : scale * 1.3, seed: i };
    (isPine ? pineTrees : roundTrees).push(entry);
  }

  // Rock clusters scattered around the meadow. Rendered as one instanced batch regardless of
  // count (see InstancedRocks).
  const rockClusters: PlacedRocks[] = [];
  const rockCount = 60;
  for (let i = 0; i < rockCount; i++) {
    const a = seededRandom(i * 4.1 + 900) * Math.PI * 2;
    const r = maxHalf * (1.05 + seededRandom(i * 3.3 + 950) * 1.3);
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    rockClusters.push({
      position: [x, heightFn(x, z), z],
      scale: 0.7 + seededRandom(i + 1000) * 0.5,
      seed: i + 1,
    });
  }

  return (
    <>
      <Terrain size={clearingR * 3.4} segments={72} heightFn={heightFn} />

      <MeadowGrass clearingR={clearingR} avoidR={maxHalf * 1.05} heightFn={heightFn} />

      <InstancedPineTrees trees={pineTrees} />
      <InstancedRoundTrees trees={roundTrees} />
      <InstancedRocks clusters={rockClusters} />

      {/* village cluster: one barn, three cottages of different sizes */}
      <Barn position={[halfW + 2.1, heightFn(halfW + 2.1, halfD * 0.75), halfD * 0.75]} rotationY={-0.5} scale={1} />
      <Cottage
        position={[halfW + 1.3, heightFn(halfW + 1.3, halfD * 1.3), halfD * 1.3]}
        rotationY={-0.9}
        scale={1.05}
      />
      <Cottage
        position={[halfW + 2.6, heightFn(halfW + 2.6, halfD * 1.6), halfD * 1.6]}
        rotationY={-0.2}
        scale={0.78}
        wall="#dfe3d0"
        roof="#5b7a5e"
      />
      <Cottage
        position={[halfW + 0.6, heightFn(halfW + 0.6, halfD * 1.85), halfD * 1.85]}
        rotationY={0.5}
        scale={0.65}
        wall="#f2e2c4"
        roof="#7a4a3a"
      />

      <CropField
        position={[halfW + 1.8, heightFn(halfW + 1.8, halfD * 0.25), halfD * 0.25]}
        rotationY={-0.5}
        rows={3}
        cols={5}
      />

      <Lake position={[lakeCenter[0], heightFn(lakeCenter[0], lakeCenter[1]), lakeCenter[1]]} radius={1.15} />
      <Bench
        position={[-halfW - 0.7, heightFn(-halfW - 0.7, -halfD * 0.3), -halfD * 0.3]}
        rotationY={1.4}
        scale={1.1}
      />
      <Bench
        position={[-halfW - 1.9, heightFn(-halfW - 1.9, -halfD * 0.3 - 1.35), -halfD * 0.3 - 1.35]}
        rotationY={0}
        scale={1.1}
      />

      <Sheep position={[halfW + 0.9, heightFn(halfW + 0.9, -halfD * 0.1), -halfD * 0.1]} rotationY={0.4} scale={1} />
      <Sheep position={[halfW + 1.3, heightFn(halfW + 1.3, 0.4), 0.4]} rotationY={-0.3} scale={0.9} />

      <PavementPath x={-0.2} startZ={halfD + 1.6} endZ={halfD + 0.35} heightFn={heightFn} />
    </>
  );
}
