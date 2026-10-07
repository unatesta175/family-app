"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Sparkles } from "@react-three/drei";
import { Color, CubicBezierCurve3, DoubleSide, InstancedMesh, Object3D, QuadraticBezierCurve3, Vector3 } from "three";
import { treeTier, type FocusSpecies, type SessionLite, type TreeTier } from "@/lib/focus";
import { treeSpec, type Curve } from "@/lib/focus-tree";
import { hash, layoutGarden } from "@/lib/focus-layout";

/** A real 3D garden has to stay light on a phone, so it draws the newest trees only. */
const MAX_3D = 140;

/** The 2D drawing is 100 units wide with the ground at y = 105 and y pointing down; this maps it into the world. */
const K = 0.017;
const wx = (x: number) => (x - 50) * K;
const wy = (y: number) => (105 - y) * K;
const deg = (d: number) => (d * Math.PI) / 180;

/** A smooth tube between points, so trunks and branches are curved and thick enough to hold the crown. */
function Tube({ curve, radius, color }: { curve: CubicBezierCurve3 | QuadraticBezierCurve3; radius: number; color: string }) {
  return (
    <mesh>
      <tubeGeometry args={[curve, 14, radius, 7, false]} />
      <meshStandardMaterial color={color} flatShading />
    </mesh>
  );
}

function branchCurve(b: Curve, zOff: number) {
  return new QuadraticBezierCurve3(new Vector3(wx(b.from[0]), wy(b.from[1]), 0), new Vector3(wx(b.ctrl[0]), wy(b.ctrl[1]), zOff * 0.5), new Vector3(wx(b.to[0]), wy(b.to[1]), zOff));
}

/**
 * One tree in 3D, built from the same `treeSpec` as the 2.5D drawing: the same trunk, branches, leaves,
 * blossoms, glow, rays, roots and pine layers for each tier, just given depth. Leaves are placed from
 * the same coordinates relative to the trunk top, so the crown always sits on the trunk.
 */
export function Tree3D({ species, tier, withered, progress }: { species: FocusSpecies; tier: TreeTier; withered: boolean; progress: number }) {
  const s = useMemo(() => treeSpec({ progress, species, tier, withered }), [progress, species, tier, withered]);
  const t = s.trunk;
  const topX = wx(s.top[0]);

  const trunkCurve = useMemo(
    () => new CubicBezierCurve3(new Vector3(wx(t.x0), wy(t.y0), 0), new Vector3(wx(t.c1[0]), wy(t.c1[1]), 0), new Vector3(wx(t.c2[0]), wy(t.c2[1]), 0), new Vector3(wx(t.x1), wy(t.y1), 0)),
    [t.x0, t.y0, t.c1, t.c2, t.x1, t.y1]
  );
  const branches = useMemo(() => s.branches.map((b, i) => ({ b, curve: branchCurve(b, (i % 2 ? 1 : -1) * 0.1) })), [s.branches]);
  const roots = useMemo(
    () => (s.roots ? [[-1, 0], [1, 0], ...(s.roots.deep ? [[-0.5, 1], [0.5, 1]] : [])].map(([side, deep]) => new QuadraticBezierCurve3(new Vector3(0, wy(104), 0), new Vector3(side * 8 * K, wy(deep ? 106 : 104), deep ? 0.04 : 0), new Vector3(side * (deep ? 8 : 14) * K, wy(deep ? 111 : 108), deep ? side * 0.05 : 0))) : []),
    [s.roots]
  );

  const crownY = wy(s.top[1] - 6);

  return (
    <group>
      {/* soft contact shadow, and the golden ring for the biggest tiers */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <circleGeometry args={[s.shadow.rx * K * 1.05, 24]} />
        <meshBasicMaterial color="#04150d" transparent opacity={0.24} />
      </mesh>
      {s.ring && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <torusGeometry args={[s.ring.rx * K, 0.012, 6, 48]} />
          <meshBasicMaterial color="#ffd966" transparent opacity={s.ring.opacity} />
        </mesh>
      )}

      {/* the legendary tree's rays, and a soft glow behind the crown */}
      {s.rays && (
        <group position={[0, wy(52), 0]}>
          {[-60, -30, 0, 30, 60].map((a) =>
            [0, Math.PI / 2].map((yaw) => (
              <group key={`${a}-${yaw}`} rotation={[0, yaw, -deg(a)]}>
                <mesh position={[0, 29 * K, 0]}>
                  <coneGeometry args={[6 * K, 58 * K, 4, 1, true]} />
                  <meshBasicMaterial color="#fff2a8" transparent opacity={0.07 * s.rays!.opacity} depthWrite={false} side={DoubleSide} />
                </mesh>
              </group>
            ))
          )}
        </group>
      )}
      {s.halo && (
        <mesh position={[0, wy(s.halo.cy), 0]}>
          <sphereGeometry args={[s.halo.r * K, 18, 18]} />
          <meshBasicMaterial color="#fff2a8" transparent opacity={0.1 * s.halo.opacity} depthWrite={false} />
        </mesh>
      )}

      {/* roots */}
      {roots.map((c, i) => (
        <Tube key={i} curve={c} radius={(s.roots!.width * K) / 2} color={s.col.trunkDark} />
      ))}

      {s.kind === "pine" ? (
        <PineBody s={s} />
      ) : (
        <>
          <Tube curve={trunkCurve} radius={(t.width * K) / 2} color={s.col.trunk} />
          {branches.map(({ b, curve }, i) => (
            <Tube key={i} curve={curve} radius={(b.width * K) / 2} color={s.col.trunkDark} />
          ))}

          {/* leaves: the same ellipses as the drawing, tilted the same way, spread around the trunk for depth */}
          {s.leaves.map((l, i) => {
            const theta = (hash(i, 3) % 628) / 100;
            const dx = Math.abs(l.x - s.top[0]);
            const z = Math.sin(theta) * (dx * K * 0.75 + 0.05);
            const yaw = ((hash(i, 11) % 100) / 100 - 0.5) * 1.1;
            return (
              <group key={i} position={[wx(l.x), wy(l.y), z]} rotation={[0, yaw, -deg(l.rot)]}>
                {l.round ? (
                  <mesh position={[0, 5 * K * l.size, 0]} scale={[l.size, l.size, l.size]}>
                    <sphereGeometry args={[6.2 * K, 9, 7]} />
                    <meshStandardMaterial color={l.fill} flatShading />
                  </mesh>
                ) : (
                  <mesh position={[0, 6 * K * l.size, 0]} scale={[4.4 * K * l.size, 9.4 * K * l.size, 1.1 * K * l.size]}>
                    <sphereGeometry args={[1, 9, 7]} />
                    <meshStandardMaterial color={l.fill} flatShading />
                  </mesh>
                )}
              </group>
            );
          })}

          {/* blossoms, and glowing fruit on the biggest trees */}
          {s.blooms.map((b, i) => {
            const theta = (hash(i, 5) % 628) / 100;
            const z = Math.sin(theta) * (Math.abs(b.x - s.top[0]) * K * 0.75 + 0.06);
            return (
              <mesh key={i} position={[wx(b.x), wy(b.y), z]} scale={b.scale}>
                <sphereGeometry args={[b.r * K * 1.15, 9, 9]} />
                <meshStandardMaterial color={b.color} emissive={b.pulse ? "#ffb300" : b.fruit ? "#7a1a1f" : "#000000"} emissiveIntensity={b.pulse ? 1.3 : b.fruit ? 0.4 : 0} />
              </mesh>
            );
          })}
        </>
      )}

      {/* fireflies and drifting petals around the crown */}
      {s.sparks && (
        <>
          <Sparkles count={s.sparks.tier >= 6 ? 16 : 9} scale={[62 * K, 60 * K, 62 * K]} position={[topX, crownY + 0.1, 0]} size={s.sparks.tier >= 6 ? 3.4 : 2.6} speed={0.4} color="#fff6a8" />
          {s.sparks.tier >= 6 && <Sparkles count={10} scale={[70 * K, 90 * K, 70 * K]} position={[topX, crownY, 0]} size={2.8} speed={0.25} color={species === "sakura" ? "#ffd9e8" : species === "maple" ? "#fbbf24" : "#d7f7a8"} />}
        </>
      )}

      {/* little flowers and a mushroom at the foot of the biggest trees */}
      {s.foot && (
        <>
          <mesh position={[wx(30), wy(108) + 0.02, 0.06]}>
            <sphereGeometry args={[1.7 * K * 1.3, 8, 8]} />
            <meshStandardMaterial color="#ffd1dc" />
          </mesh>
          <mesh position={[wx(71), wy(109) + 0.02, -0.05]}>
            <sphereGeometry args={[1.7 * K * 1.3, 8, 8]} />
            <meshStandardMaterial color="#fff3a3" />
          </mesh>
          {s.foot.tier >= 5 && (
            <mesh position={[wx(38), wy(110) + 0.02, 0.1]}>
              <sphereGeometry args={[1.5 * K * 1.3, 8, 8]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          )}
          {s.foot.tier >= 6 && (
            <group position={[wx(64), wy(110), 0.08]}>
              <mesh position={[0, 1.2 * K, 0]}>
                <cylinderGeometry args={[0.6 * K, 0.8 * K, 2.4 * K, 6]} />
                <meshStandardMaterial color="#f4ead6" />
              </mesh>
              <mesh position={[0, 3.2 * K, 0]}>
                <sphereGeometry args={[2.4 * K, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#e5484d" />
              </mesh>
            </group>
          )}
        </>
      )}
    </group>
  );
}

/** The conifer: a trunk and stacked cones, with baubles, white tips and a golden star as the tier rises. */
function PineBody({ s }: { s: ReturnType<typeof treeSpec> }) {
  const pine = s.pine!;
  return (
    <group>
      <mesh position={[0, (pine.trunkH * K) / 2, 0]}>
        <cylinderGeometry args={[(pine.trunkW * K) / 2.2, (pine.trunkW * K) / 1.7, pine.trunkH * K, 7]} />
        <meshStandardMaterial color={s.col.trunk} flatShading />
      </mesh>
      {pine.layers.map((l, i) => {
        const h = l.h * l.scale * K;
        const r = (l.w / 2) * l.scale * K;
        const base = wy(l.baseY);
        return (
          <group key={i}>
            <mesh position={[0, base + h / 2, 0]}>
              <coneGeometry args={[r, h, 9]} />
              <meshStandardMaterial color={l.color} flatShading />
            </mesh>
            {l.tip && (
              <mesh position={[0, base + h - h * 0.19, 0]}>
                <coneGeometry args={[(l.w * 0.2 * l.scale * K) * 1.02, h * 0.38, 9]} />
                <meshStandardMaterial color="#ffffff" transparent opacity={0.55} />
              </mesh>
            )}
            {l.baubles &&
              l.bauble.map(([, by, c], k) => {
                const f = Math.min(0.9, -by / l.h); // how far up the cone this bauble sits
                const rad = (l.w / 2) * l.scale * K * (1 - f) * 0.96;
                const theta = (k === 0 ? 0.7 : 3.6) + i * 0.9;
                return (
                  <mesh key={k} position={[Math.cos(theta) * rad, base + f * h, Math.sin(theta) * rad]}>
                    <sphereGeometry args={[1.7 * K * 1.2, 8, 8]} />
                    <meshStandardMaterial color={c} emissive={c} emissiveIntensity={s.tier >= 5 ? 0.9 : 0.25} />
                  </mesh>
                );
              })}
          </group>
        );
      })}
      {pine.star && (
        <mesh position={[0, wy(pine.star.y), 0]} scale={7 * K * pine.star.scale}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#ffd54a" emissive="#ffb300" emissiveIntensity={1.4} />
        </mesh>
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
 * It uses the same layout and the same tree description (and so the same six tiers) as the 2.5D garden,
 * so the two show the same garden.
 */
export default function Garden3D({ sessions }: { sessions: SessionLite[] }) {
  const { n, placed } = layoutGarden(sessions.filter((s) => s.status !== "active").slice(-MAX_3D), 5);
  const d = n * 0.95 + 3.4;

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
      <OrbitControls enablePan={false} enableZoom minDistance={d * 0.55} maxDistance={d * 1.5} minPolarAngle={0.55} maxPolarAngle={1.35} autoRotate autoRotateSpeed={0.7} target={[0, 0.7, 0]} />
    </Canvas>
  );
}
