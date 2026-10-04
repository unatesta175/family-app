"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls } from "@react-three/drei";
import { MathUtils, Object3D, type BufferGeometry, type InstancedMesh, type Mesh } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { SLOTS_PER_FLOOR, type SlotKind, type TowerData, type TowerSlot } from "@/lib/habit-tower";

// --- Geometry constants -----------------------------------------------------------------------
const RING = 2.5; // radius of the block ring
const PITCH = 0.64; // height of one floor (one month)
const BLOCK_H = 0.52;
const BLOCK_W = ((2 * Math.PI * RING) / SLOTS_PER_FLOOR) * 0.78;
const BLOCK_D = 0.7;
const BASE_Y = 0.06;
export const TOWER_SPACING = 7.8;

export type SceneTower = { id: string; name: string; color: string; data: TowerData };

export type HoverInfo = {
  towerId: string;
  name: string;
  date: string;
  kind: SlotKind;
  value: number;
  floorLabel: string;
};

type Item = {
  slot: TowerSlot;
  floor: number;
  month: string;
  floorLabel: string;
  x: number;
  z: number;
  rotY: number;
  baseY: number;
};

const ease = (t: number) => 1 - Math.pow(1 - MathUtils.clamp(t, 0, 1), 3);

/** Splits a tower into the groups that are drawn as separate instanced meshes. */
function partition(data: TowerData, focusMonth: string | null) {
  const out = { done: [] as Item[], streak: [] as Item[], partial: [] as Item[], missed: [] as Item[], skipped: [] as Item[], future: [] as Item[], pending: [] as Item[], dim: [] as Item[] };
  data.floors.forEach((floor, f) => {
    for (const slot of floor.slots) {
      if (slot.kind === "off") continue;
      const theta = ((slot.day - 1) / SLOTS_PER_FLOOR) * Math.PI * 2;
      const item: Item = { slot, floor: f, month: floor.month, floorLabel: floor.label, x: RING * Math.sin(theta), z: RING * Math.cos(theta), rotY: theta, baseY: BASE_Y + f * PITCH };
      if (focusMonth && floor.month !== focusMonth) {
        if (slot.kind !== "missed" && slot.kind !== "future") out.dim.push(item);
        continue;
      }
      if (slot.kind === "done") (slot.streak ? out.streak : out.done).push(item);
      else out[slot.kind].push(item);
    }
  });
  return out;
}

type LayerStyle = {
  size: [number, number, number];
  color: string;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
  roughness?: number;
  metalness?: number;
};

/** One instanced mesh: every block of one kind, drawn in a single call. */
function Layer({
  items,
  geometry,
  style,
  intro,
  interactive,
  onHover,
}: {
  items: Item[];
  geometry: BufferGeometry;
  style: LayerStyle;
  intro: boolean;
  interactive: boolean;
  onHover: (item: Item | null) => void;
}) {
  const ref = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const growing = useRef(intro);
  const start = useRef<number | null>(null);
  const [sw, sh, sd] = style.size;

  const place = (mesh: InstancedMesh, progress: (it: Item) => number) => {
    items.forEach((it, i) => {
      const s = progress(it);
      const h = Math.max(0.0001, sh * s);
      dummy.position.set(it.x, it.baseY + h / 2, it.z);
      dummy.rotation.set(0, it.rotY, 0);
      dummy.scale.set(sw, h, sd);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    start.current = null;
    place(mesh, growing.current ? () => 0 : () => 1);
    mesh.computeBoundingSphere();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, sw, sh, sd]);

  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh || !growing.current) return;
    if (start.current === null) start.current = clock.elapsedTime;
    const t = clock.elapsedTime - start.current;
    place(mesh, (it) => ease((t - it.floor * 0.07 - it.slot.day * 0.005) / 0.5));
    const last = items.reduce((m, it) => Math.max(m, it.floor * 0.07 + it.slot.day * 0.005), 0);
    if (t > last + 0.6) {
      growing.current = false;
      place(mesh, () => 1);
    }
  });

  if (items.length === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, items.length]}
      frustumCulled={false}
      raycast={interactive ? undefined : () => null}
      onPointerMove={
        interactive
          ? (e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation();
              if (e.instanceId !== undefined) onHover(items[e.instanceId] ?? null);
            }
          : undefined
      }
      onPointerOut={interactive ? () => onHover(null) : undefined}
    >
      <meshStandardMaterial
        color={style.color}
        emissive={style.emissive ?? "#000000"}
        emissiveIntensity={style.emissiveIntensity ?? 0}
        transparent={(style.opacity ?? 1) < 1}
        opacity={style.opacity ?? 1}
        roughness={style.roughness ?? 0.4}
        metalness={style.metalness ?? 0.1}
        depthWrite={(style.opacity ?? 1) >= 1}
      />
    </instancedMesh>
  );
}

/** A soft pulse on today's slot. */
function TodayMarker({ item, color }: { item: Item; color: string }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const k = 1 + Math.sin(clock.elapsedTime * 3) * 0.06;
    mesh.scale.set(BLOCK_W * 1.18 * k, BLOCK_H * 1.18 * k, BLOCK_D * 1.1 * k);
  });
  return (
    <mesh ref={ref} position={[item.x, item.baseY + BLOCK_H / 2, item.z]} rotation={[0, item.rotY, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color={color} transparent opacity={0.4} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function Beacon({ color, y, size }: { color: string; y: number; size: number }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    mesh.rotation.y += dt * 0.9;
    mesh.position.y = y + Math.sin(clock.elapsedTime * 1.6) * 0.08;
  });
  return (
    <mesh ref={ref} position={[0, y, 0]} scale={size}>
      <octahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} roughness={0.25} metalness={0.2} toneMapped={false} />
    </mesh>
  );
}

function TowerMesh({
  tower,
  offsetX,
  dark,
  focusMonth,
  intro,
  labels,
  showName,
  light,
  onHover,
  onPick,
}: {
  tower: SceneTower;
  offsetX: number;
  dark: boolean;
  focusMonth: string | null;
  intro: boolean;
  labels: boolean;
  showName: boolean;
  light: boolean;
  onHover: (info: HoverInfo | null) => void;
  onPick?: () => void;
}) {
  const { data, color } = tower;
  const geometry = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 3, 0.09), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const parts = useMemo(() => partition(data, focusMonth), [data, focusMonth]);
  const floors = data.floors.length;
  const height = floors * PITCH + 0.12;
  const todayItem = [...parts.done, ...parts.streak, ...parts.pending].find((i) => i.slot.today) ?? null;
  const [hovered, setHovered] = useState<Item | null>(null);

  const report = (item: Item | null) => {
    setHovered(item);
    onHover(item ? { towerId: tower.id, name: tower.name, date: item.slot.date, kind: item.slot.kind, value: item.slot.value, floorLabel: item.floorLabel } : null);
  };

  const emptyColor = dark ? "#1a1f3a" : "#cfd3e6";
  const labelStep = floors > 24 ? 3 : floors > 12 ? 2 : 1;

  return (
    <group position={[offsetX, 0, 0]}>
      {/* Plinth */}
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <cylinderGeometry args={[RING + 1.25, RING + 1.45, 0.3, 64]} />
        <meshStandardMaterial color={dark ? "#171b34" : "#eceef8"} roughness={0.55} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[RING + 1.25, 0.035, 12, 96]} />
        <meshBasicMaterial color={color} transparent opacity={dark ? 0.7 : 0.55} toneMapped={false} />
      </mesh>

      {/* Core column, with a glowing heart */}
      <mesh position={[0, height / 2, 0]} onClick={onPick} onPointerOver={onPick ? () => (document.body.style.cursor = "pointer") : undefined} onPointerOut={onPick ? () => (document.body.style.cursor = "") : undefined}>
        <cylinderGeometry args={[1.05, 1.05, height, 48]} />
        <meshStandardMaterial color={dark ? "#232949" : "#dfe2f2"} roughness={0.35} metalness={0.25} />
      </mesh>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.32, 0.32, height + 0.05, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.65} toneMapped={false} />
      </mesh>

      {/* Floor slabs: one thin glass disc per month */}
      {data.floors.map((f, i) => (
        <mesh key={f.month} position={[0, BASE_Y + i * PITCH - 0.015, 0]}>
          <cylinderGeometry args={[RING + 0.5, RING + 0.5, 0.03, 64]} />
          <meshStandardMaterial color={dark ? "#2b3260" : "#ffffff"} transparent opacity={focusMonth && f.month !== focusMonth ? 0.12 : 0.42} roughness={0.2} depthWrite={false} />
        </mesh>
      ))}

      {/* The blocks */}
      <Layer items={parts.future} geometry={geometry} intro={false} interactive onHover={report} style={{ size: [BLOCK_W, 0.03, BLOCK_D], color: emptyColor, opacity: 0.35, roughness: 0.8 }} />
      <Layer items={parts.missed} geometry={geometry} intro={intro} interactive onHover={report} style={{ size: [BLOCK_W * 0.9, 0.05, BLOCK_D * 0.9], color: dark ? "#0b0e1f" : "#8a90ad", opacity: dark ? 0.9 : 0.55, roughness: 0.9 }} />
      <Layer items={parts.skipped} geometry={geometry} intro={intro} interactive onHover={report} style={{ size: [BLOCK_W, BLOCK_H * 0.7, BLOCK_D], color: dark ? "#8fa0d8" : "#b9c3ec", opacity: 0.5, roughness: 0.15 }} />
      <Layer items={parts.partial} geometry={geometry} intro={intro} interactive onHover={report} style={{ size: [BLOCK_W, BLOCK_H * 0.5, BLOCK_D], color, emissive: color, emissiveIntensity: 0.28, opacity: 0.9, roughness: 0.4 }} />
      <Layer items={parts.done} geometry={geometry} intro={intro} interactive onHover={report} style={{ size: [BLOCK_W, BLOCK_H, BLOCK_D], color, emissive: color, emissiveIntensity: 0.55, roughness: 0.32, metalness: 0.12 }} />
      <Layer items={parts.streak} geometry={geometry} intro={intro} interactive onHover={report} style={{ size: [BLOCK_W, BLOCK_H, BLOCK_D], color, emissive: color, emissiveIntensity: 1.15, roughness: 0.25, metalness: 0.1 }} />
      <Layer items={parts.pending} geometry={geometry} intro={false} interactive onHover={report} style={{ size: [BLOCK_W, 0.05, BLOCK_D], color, emissive: color, emissiveIntensity: 0.4, opacity: 0.6 }} />
      <Layer items={parts.dim} geometry={geometry} intro={false} interactive={false} onHover={report} style={{ size: [BLOCK_W, BLOCK_H * 0.6, BLOCK_D], color: dark ? "#3a4170" : "#c5cae4", opacity: 0.3, roughness: 0.6 }} />

      {todayItem && <TodayMarker item={todayItem} color={color} />}
      {hovered && (
        <mesh position={[hovered.x, hovered.baseY + BLOCK_H / 2, hovered.z]} rotation={[0, hovered.rotY, 0]} scale={[BLOCK_W * 1.2, BLOCK_H * 1.45, BLOCK_D * 1.15]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.28} depthWrite={false} toneMapped={false} />
        </mesh>
      )}

      {/* Beacon: grows with everything you've built */}
      <Beacon color={color} y={height + 0.75} size={1 + Math.min(1, data.totalDone / 200) * 0.9} />
      {light && <pointLight position={[0, height + 1, 0]} color={color} intensity={dark ? 14 : 7} distance={10} decay={2} />}

      {/* Month labels down the left side (single-tower view) */}
      {labels &&
        data.floors.map((f, i) =>
          i % labelStep === 0 || f.month === focusMonth ? (
            <Html key={f.month} position={[-(RING + 1.9), BASE_Y + i * PITCH + 0.2, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
              <span
                className={`whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums ${f.month === focusMonth ? "bg-h-brand text-h-brand-fg" : "bg-h-surface/80 text-h-muted"}`}
              >
                {f.shortLabel}
              </span>
            </Html>
          ) : null
        )}
      {showName && (
        <Html position={[0, height + 2, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
          <span className="whitespace-nowrap rounded-full bg-h-surface/90 px-2.5 py-1 text-[11px] font-extrabold text-h-fg shadow-sm">{tower.name}</span>
        </Html>
      )}
    </group>
  );
}


function CameraRig({ height, width, resetKey, controls }: { height: number; width: number; resetKey: number; controls: React.RefObject<{ target: { set: (x: number, y: number, z: number) => void }; update: () => void } | null> }) {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const dist = Math.max(height * 1.25, width * 0.66, 9);
    camera.position.set(dist * 0.5, height * 0.55 + 3.2, dist);
    camera.lookAt(0, height * 0.4, 0);
    const c = controls.current;
    if (c) {
      c.target.set(0, height * 0.4, 0);
      c.update();
    }
  }, [camera, controls, height, width, resetKey]);
  return null;
}

export type TowerSceneProps = {
  towers: SceneTower[];
  dark: boolean;
  focusMonth: string | null;
  autoRotate: boolean;
  resetKey: number;
  intro: boolean;
  onHover: (info: HoverInfo | null) => void;
  onPickTower?: (id: string) => void;
};

/** The 3D scene: one or more habit towers on a shared stage. */
export function TowerScene({ towers, dark, focusMonth, autoRotate, resetKey, intro, onHover, onPickTower }: TowerSceneProps) {
  const controls = useRef<{ target: { set: (x: number, y: number, z: number) => void }; update: () => void } | null>(null);
  const maxFloors = Math.max(1, ...towers.map((t) => t.data.floors.length));
  const height = maxFloors * PITCH + 2;
  const width = (towers.length - 1) * TOWER_SPACING + (RING + 2) * 2;
  const single = towers.length === 1;

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: 36, near: 0.1, far: 200, position: [8, 8, 16] }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <ambientLight intensity={dark ? 0.5 : 0.75} />
      <hemisphereLight args={[dark ? "#6f7bd8" : "#ffffff", dark ? "#0b0e1f" : "#cdd3ee", dark ? 0.4 : 0.55]} />
      <directionalLight position={[7, 14, 9]} intensity={dark ? 1.0 : 1.35} color="#ffffff" />
      <directionalLight position={[-9, 6, -7]} intensity={dark ? 0.35 : 0.45} color={dark ? "#7c8cff" : "#b9c6ff"} />

      {towers.map((t, i) => (
        <TowerMesh
          key={t.id}
          tower={t}
          offsetX={(i - (towers.length - 1) / 2) * TOWER_SPACING}
          dark={dark}
          focusMonth={single ? focusMonth : null}
          intro={intro}
          labels={single}
          showName={!single}
          light={towers.length <= 3}
          onHover={onHover}
          onPick={onPickTower ? () => onPickTower(t.id) : undefined}
        />
      ))}

      <ContactShadows position={[0, 0.002, 0]} opacity={dark ? 0.55 : 0.32} scale={width + 16} blur={2.6} far={height + 4} resolution={512} />
      <CameraRig height={height} width={width} resetKey={resetKey} controls={controls} />
      <OrbitControls
        ref={(c) => {
          controls.current = c as unknown as typeof controls.current;
        }}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={7}
        maxDistance={Math.max(34, width * 1.4)}
        minPolarAngle={0.25}
        maxPolarAngle={1.5}
        autoRotate={autoRotate}
        autoRotateSpeed={0.7}
      />
    </Canvas>
  );
}
