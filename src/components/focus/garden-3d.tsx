"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Sparkles } from "@react-three/drei";
import { Color, InstancedMesh, Object3D } from "three";
import { treeTier, type FocusSpecies, type SessionLite, type TreeTier } from "@/lib/focus";
import { hash, layoutGarden } from "@/lib/focus-layout";

/** A real 3D garden has to stay light on a phone, so it draws the newest trees only. */
const MAX_3D = 140;

type Pal = { leaf: [string, string, string]; trunk: string; bloom: string };
const PAL: Record<FocusSpecies, Pal> = {
  oak: { leaf: ["#2a8a3c", "#46b34f", "#8be08a"], trunk: "#8a5a32", bloom: "#ffe27a" },
  pine: { leaf: ["#146349", "#1f8a5f", "#4fc08e"], trunk: "#6f4a2c", bloom: "#ff6b6b" },
  sakura: { leaf: ["#e9739f", "#f6a1c0", "#ffd9e8"], trunk: "#74503f", bloom: "#ffffff" },
  maple: { leaf: ["#c2410c", "#ec6b1a", "#fbbf24"], trunk: "#83502c", bloom: "#fff0b3" },
};
const DEAD: Pal = { leaf: ["#8b7e66", "#a89d84", "#c4baa1"], trunk: "#5d4a3a", bloom: "#c4baa1" };

/** Overall size of a tree and how many crown lumps, blossoms and layers each tier gets. */
const SCALE = [0.85, 0.95, 1.05, 1.2, 1.35, 1.5];
const LUMPS = [3, 5, 6, 8, 10, 13];
const BLOOMS = [0, 0, 6, 9, 13, 18];
const LAYERS = [4, 4, 5, 5, 6, 7];

/** Crown lumps: x, y, z and radius, from the middle outwards (so a smaller tier is a rounder, smaller crown). */
const CROWN: [number, number, number, number][] = [
  [0, 1.15, 0, 0.5],
  [-0.34, 0.95, 0.1, 0.34],
  [0.34, 0.98, -0.08, 0.36],
  [0.05, 1.5, 0.05, 0.34],
  [0.05, 0.92, 0.38, 0.3],
  [-0.05, 0.94, -0.38, 0.3],
  [-0.5, 1.2, -0.1, 0.28],
  [0.5, 1.22, 0.12, 0.28],
  [-0.2, 1.46, 0.28, 0.26],
  [0.22, 1.5, -0.26, 0.26],
  [0, 1.74, 0, 0.26],
  [-0.62, 0.98, 0.2, 0.22],
  [0.6, 0.96, -0.22, 0.22],
];

function Tree3D({ species, tier, withered, progress }: { species: FocusSpecies; tier: TreeTier; withered: boolean; progress: number }) {
  const pal = withered ? DEAD : PAL[species];
  const s = withered ? 0.8 : SCALE[tier - 1];
  const grow = withered ? Math.max(0.5, progress) : 1;
  const trunkH = 0.7 * grow;

  const blooms = useMemo(() => {
    const out: [number, number, number][] = [];
    const n = withered ? 0 : BLOOMS[tier - 1];
    for (let i = 0; i < n; i++) {
      const c = CROWN[(i * 3) % LUMPS[tier - 1]];
      const a = (hash(i, tier) / 9973) * Math.PI * 2;
      out.push([c[0] + Math.cos(a) * c[3] * 0.95, c[1] + 0.05 + (hash(i, 9) % 10) / 100, c[2] + Math.sin(a) * c[3] * 0.95]);
    }
    return out;
  }, [tier, withered]);

  return (
    <group scale={s}>
      {/* a soft contact shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.55 + tier * 0.04, 20]} />
        <meshBasicMaterial color="#04150d" transparent opacity={0.22} />
      </mesh>

      {/* trunk (and roots for the grand trees) */}
      <mesh position={[0, trunkH / 2, 0]}>
        <cylinderGeometry args={[0.07 + tier * 0.012, 0.12 + tier * 0.02, trunkH, 7]} />
        <meshStandardMaterial color={pal.trunk} flatShading />
      </mesh>
      {!withered && tier >= 4 &&
        [0, 2.1, 4.2].map((a) => (
          <mesh key={a} position={[Math.cos(a) * 0.14, 0.04, Math.sin(a) * 0.14]} rotation={[Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9]}>
            <cylinderGeometry args={[0.025, 0.05, 0.22, 5]} />
            <meshStandardMaterial color={pal.trunk} flatShading />
          </mesh>
        ))}

      {withered ? (
        <>
          {/* bare, drooping branches and a few dry lumps */}
          {[-0.6, 0.5, 2.2].map((a, i) => (
            <mesh key={i} position={[Math.cos(a) * 0.14, 0.55 + i * 0.08, Math.sin(a) * 0.14]} rotation={[0.5, a, 0.9]}>
              <cylinderGeometry args={[0.012, 0.03, 0.4, 5]} />
              <meshStandardMaterial color={pal.trunk} flatShading />
            </mesh>
          ))}
          <mesh position={[0.12, 0.62, 0]}>
            <icosahedronGeometry args={[0.16, 0]} />
            <meshStandardMaterial color={pal.leaf[1]} flatShading />
          </mesh>
        </>
      ) : species === "pine" ? (
        <group position={[0, 0.5, 0]}>
          {Array.from({ length: LAYERS[tier - 1] }, (_, i) => {
            const n = LAYERS[tier - 1];
            const r = 0.62 - (i / (n - 1)) * 0.42;
            const y = 0.18 + i * (1.2 / (n - 1));
            return (
              <group key={i}>
                <mesh position={[0, y + 0.3, 0]}>
                  <coneGeometry args={[r, 0.62, 8]} />
                  <meshStandardMaterial color={i === 0 ? pal.leaf[0] : i >= n - 1 ? pal.leaf[2] : pal.leaf[1]} flatShading />
                </mesh>
                {tier >= 3 && (
                  <>
                    <mesh position={[r * 0.55, y + 0.12, 0.05]}>
                      <sphereGeometry args={[0.045, 8, 8]} />
                      <meshStandardMaterial color={i % 2 ? "#ffd54a" : "#ff5c6c"} emissive={i % 2 ? "#a8801a" : "#8a1f2a"} emissiveIntensity={tier >= 5 ? 0.9 : 0.3} />
                    </mesh>
                    <mesh position={[-r * 0.45, y + 0.18, -0.1]}>
                      <sphereGeometry args={[0.045, 8, 8]} />
                      <meshStandardMaterial color={i % 2 ? "#ff5c6c" : "#ffd54a"} emissive={i % 2 ? "#8a1f2a" : "#a8801a"} emissiveIntensity={tier >= 5 ? 0.9 : 0.3} />
                    </mesh>
                  </>
                )}
              </group>
            );
          })}
          {tier >= 6 && (
            <mesh position={[0, 1.78, 0]}>
              <octahedronGeometry args={[0.16, 0]} />
              <meshStandardMaterial color="#ffd54a" emissive="#ffb300" emissiveIntensity={1.4} />
            </mesh>
          )}
        </group>
      ) : (
        <group position={[0, 0.5, 0]}>
          {CROWN.slice(0, LUMPS[tier - 1]).map(([x, y, z, r], i) => (
            <mesh key={i} position={[x, y - 0.5 + 0.6, z]}>
              <icosahedronGeometry args={[r, tier >= 4 ? 1 : 0]} />
              <meshStandardMaterial color={pal.leaf[i % 3]} flatShading />
            </mesh>
          ))}
          {blooms.map(([x, y, z], i) => {
            const fruit = tier >= 5 && i % 3 === 0;
            return (
              <mesh key={i} position={[x, y - 0.5 + 0.6, z]}>
                <sphereGeometry args={[fruit ? 0.06 : 0.05, 8, 8]} />
                <meshStandardMaterial color={fruit ? (tier >= 6 ? "#ffd54a" : "#e5484d") : pal.bloom} emissive={fruit && tier >= 6 ? "#ffb300" : "#000000"} emissiveIntensity={fruit && tier >= 6 ? 1.2 : 0} />
              </mesh>
            );
          })}
        </group>
      )}

      {/* glow, fireflies and rays for the biggest tiers */}
      {!withered && tier >= 5 && (
        <mesh position={[0, 1.2, 0]}>
          <sphereGeometry args={[0.95, 16, 16]} />
          <meshBasicMaterial color="#fff2a8" transparent opacity={tier >= 6 ? 0.1 : 0.06} depthWrite={false} />
        </mesh>
      )}
      {!withered && tier >= 5 && <Sparkles count={tier >= 6 ? 14 : 8} scale={[1.6, 1.8, 1.6]} position={[0, 1.2, 0]} size={tier >= 6 ? 3.2 : 2.4} speed={0.4} color="#fff6a8" />}
      {!withered && tier >= 6 && (
        <>
          <Sparkles count={10} scale={[1.8, 2.2, 1.8]} position={[0, 1.4, 0]} size={2.6} speed={0.25} color={species === "sakura" ? "#ffd9e8" : "#fbe9a0"} />
          {[0, 1.25, 2.5, 3.75, 5].map((a) => (
            <mesh key={a} position={[Math.cos(a) * 0.1, 2.0, Math.sin(a) * 0.1]} rotation={[0.18, a, 0.34]}>
              <coneGeometry args={[0.22, 2.2, 8, 1, true]} />
              <meshBasicMaterial color="#fff2a8" transparent opacity={0.07} depthWrite={false} side={2} />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}

/** The block of earth: instanced grass tiles, soil layers and tufts. */
function Ground({ n }: { n: number }) {
  const tiles = useRef<InstancedMesh>(null);
  const tufts = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const m = tiles.current;
    if (m) {
      const o = new Object3D();
      const c = new Color();
      let k = 0;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          o.position.set(i - n / 2 + 0.5, 0, j - n / 2 + 0.5);
          o.updateMatrix();
          m.setMatrixAt(k, o.matrix);
          m.setColorAt(k, c.set((i + j) % 2 === 0 ? "#a4d65c" : "#98cc50"));
          k++;
        }
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    const t = tufts.current;
    if (t) {
      const o = new Object3D();
      let k = 0;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++)
          for (let q = 0; q < 2; q++) {
            o.position.set(i - n / 2 + 0.5 + ((hash(i, j + q) % 70) - 35) / 100, 0.13, j - n / 2 + 0.5 + ((hash(j, i + q) % 70) - 35) / 100);
            o.rotation.set(0, (hash(i + q, j) % 628) / 100, 0);
            o.scale.setScalar(0.7 + (hash(i, j) % 5) / 10);
            o.updateMatrix();
            t.setMatrixAt(k++, o.matrix);
          }
      t.instanceMatrix.needsUpdate = true;
    }
  }, [n]);

  return (
    <group position={[0, -0.1, 0]}>
      <instancedMesh ref={tiles} args={[undefined, undefined, n * n]}>
        <boxGeometry args={[0.99, 0.2, 0.99]} />
        <meshStandardMaterial flatShading />
      </instancedMesh>
      <instancedMesh ref={tufts} args={[undefined, undefined, n * n * 2]}>
        <coneGeometry args={[0.035, 0.12, 4]} />
        <meshStandardMaterial color="#6fa334" flatShading />
      </instancedMesh>
      {/* soil, in two layers so it reads as earth */}
      <mesh position={[0, -0.42, 0]}>
        <boxGeometry args={[n, 0.5, n]} />
        <meshStandardMaterial color="#7a4f2b" flatShading />
      </mesh>
      <mesh position={[0, -0.82, 0]}>
        <boxGeometry args={[n * 0.97, 0.34, n * 0.97]} />
        <meshStandardMaterial color="#5d3a1f" flatShading />
      </mesh>
    </group>
  );
}

/**
 * The garden as a real 3D scene: a block of earth you can turn around with a drag, trees standing on it.
 * It uses the same layout and the same six tiers as the 2.5D garden, so the two show the same garden.
 */
export default function Garden3D({ sessions }: { sessions: SessionLite[] }) {
  const { n, placed } = layoutGarden(sessions.filter((s) => s.status !== "active").slice(-MAX_3D), 5);
  const d = n * 0.95 + 3;

  return (
    <Canvas camera={{ position: [d, d * 0.8, d], fov: 32 }} dpr={[1, 1.75]} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={0.85} />
      <hemisphereLight args={["#e8ffd0", "#3b2a14", 0.55]} />
      <directionalLight position={[n, n * 1.4, n * 0.6]} intensity={1.7} color="#fff6dc" />
      <Ground n={n} />
      {placed.map(({ s, i, j }) => (
        <group key={s.id} position={[i - n / 2 + 0.5, 0.1, j - n / 2 + 0.5]}>
          <Tree3D species={s.species} tier={treeTier(s.plannedSeconds)} withered={s.status === "withered"} progress={s.status === "completed" ? 1 : Math.max(0.3, s.focusedSeconds / s.plannedSeconds)} />
        </group>
      ))}
      <OrbitControls enablePan={false} enableZoom minDistance={d * 0.6} maxDistance={d * 1.5} minPolarAngle={0.55} maxPolarAngle={1.35} autoRotate autoRotateSpeed={0.7} target={[0, 0.5, 0]} />
    </Canvas>
  );
}
