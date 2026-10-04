"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Edges, Html, OrbitControls, Sparkles } from "@react-three/drei";
import { AdditiveBlending, MathUtils, Object3D, OctahedronGeometry, type BufferGeometry, type Group, type InstancedMesh, type Mesh } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { SLOTS_PER_FLOOR, towerLevel, type SlotKind, type TowerData, type TowerSlot } from "@/lib/habit-tower";

// --- Geometry constants -----------------------------------------------------------------------
const RING = 2.5; // radius of the block ring
const PITCH = 0.64; // height of one floor (one month)
const BLOCK_H = 0.52;
const BLOCK_W = ((2 * Math.PI * RING) / SLOTS_PER_FLOOR) * 0.78;
const BLOCK_D = 0.7;
const BASE_Y = 0.06;
export const TOWER_SPACING = 7.8;

/** The colours that tell the states apart. They stay the same whatever the habit's own colour is. */
const GOLD = "#ffb020";
const GOLD_HOT = "#ff8a00";
const RED = "#ef4444";
const ICE = "#7dd3fc";

type ControlsLike = { target: { set: (x: number, y: number, z: number) => void; y: number }; update: () => void };

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
  /** Not drawn; only used to catch taps and hovers. */
  invisible?: boolean;
  /** Lift above the floor, in world units (a gem sits on top of its block). */
  yOffset?: number;
  /** Extra turn about the vertical axis, in radians (the arms of the missed cross). */
  rot?: number;
};

/** One instanced mesh: every block of one kind, drawn in a single call. */
function Layer({
  items,
  geometry,
  style,
  intro,
  interactive,
  onHover,
  onPick,
}: {
  items: Item[];
  geometry: BufferGeometry;
  style: LayerStyle;
  intro: boolean;
  interactive: boolean;
  onHover: (item: Item | null) => void;
  onPick?: (item: Item) => void;
}) {
  const ref = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const growing = useRef(intro);
  const start = useRef<number | null>(null);
  const [sw, sh, sd] = style.size;
  const lift = style.yOffset ?? 0;
  const rot = style.rot ?? 0;

  const place = (mesh: InstancedMesh, progress: (it: Item) => number) => {
    items.forEach((it, i) => {
      const s = progress(it);
      const h = Math.max(0.0001, sh * s);
      dummy.position.set(it.x, it.baseY + lift + h / 2, it.z);
      dummy.rotation.set(0, it.rotY + rot, 0);
      dummy.scale.set(sw * (lift > 0 ? Math.max(0.0001, s) : 1), h, sd * (lift > 0 ? Math.max(0.0001, s) : 1));
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
      onClick={
        interactive && onPick
          ? (e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              if (e.instanceId !== undefined && items[e.instanceId]) onPick(items[e.instanceId]);
            }
          : undefined
      }
    >
      <meshStandardMaterial
        visible={!style.invisible}
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

/** Today's slot when it is still empty: an outlined ghost of the block you could place, gently pulsing. */
function TodayGhost({ item, color }: { item: Item; color: string }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const k = 1 + Math.sin(clock.elapsedTime * 3) * 0.07;
    mesh.scale.set(BLOCK_W * 1.1 * k, BLOCK_H * 1.1 * k, BLOCK_D * 1.05 * k);
    mesh.position.y = item.baseY + BLOCK_H * 0.58 + Math.sin(clock.elapsedTime * 2.2) * 0.04;
  });
  return (
    <mesh ref={ref} position={[item.x, item.baseY + BLOCK_H * 0.58, item.z]} rotation={[0, item.rotY, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color={color} transparent opacity={0.22} depthWrite={false} toneMapped={false} />
      <Edges color="#ffffff" threshold={15} />
    </mesh>
  );
}

/** A pulsing white frame around the block you picked. */
function SelectedMarker({ item }: { item: Item }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const k = 1 + Math.sin(clock.elapsedTime * 5) * 0.035;
    mesh.scale.set(BLOCK_W * 1.3 * k, BLOCK_H * 1.7 * k, BLOCK_D * 1.2 * k);
  });
  return (
    <mesh ref={ref} position={[item.x, item.baseY + BLOCK_H * 0.5, item.z]} rotation={[0, item.rotY, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.14} depthWrite={false} toneMapped={false} />
      <Edges color="#ffffff" threshold={15} />
    </mesh>
  );
}

/** Where a date's block sits, for turning the camera to face it. */
function locate(data: TowerData, date: string) {
  for (let f = 0; f < data.floors.length; f++) {
    const slot = data.floors[f].slots.find((s) => s.date === date);
    if (slot) {
      const theta = ((slot.day - 1) / SLOTS_PER_FLOOR) * Math.PI * 2;
      return { x: RING * Math.sin(theta), z: RING * Math.cos(theta), y: BASE_Y + f * PITCH + BLOCK_H / 2 };
    }
  }
  return null;
}

/** Eases the camera round to face a newly selected block, then lets go so you can still orbit freely. */
function SelectionRig({ target, controls }: { target: { x: number; y: number; z: number } | null; controls: React.RefObject<ControlsLike | null> }) {
  const rig = useRef<{ goal: { x: number; y: number; z: number } | null; until: number }>({ goal: null, until: 0 });
  const key = target ? `${target.x.toFixed(3)}|${target.y.toFixed(3)}|${target.z.toFixed(3)}` : "";
  useEffect(() => {
    rig.current = { goal: target, until: performance.now() + 1600 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useFrame((state) => {
    const { goal, until } = rig.current;
    const c = controls.current;
    if (!goal || !c || performance.now() > until) return;
    const cam = state.camera;
    const r = Math.hypot(cam.position.x, cam.position.z);
    const cur = Math.atan2(cam.position.x, cam.position.z);
    let d = Math.atan2(goal.x, goal.z) - cur;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    const az = cur + d * 0.12;
    cam.position.set(r * Math.sin(az), cam.position.y + (goal.y + 2.4 - cam.position.y) * 0.08, r * Math.cos(az));
    c.target.set(0, c.target.y + (goal.y - c.target.y) * 0.1, 0);
    c.update();
  });
  return null;
}

/** The glowing crystal on top: it grows with the tower's level, and one ring circles it per level gained. */
function Beacon({ color, y, level }: { color: string; y: number; level: number }) {
  const gem = useRef<Mesh>(null);
  const rings = useRef<Group>(null);
  useFrame(({ clock }, dt) => {
    if (gem.current) {
      gem.current.rotation.y += dt * 0.9;
      gem.current.position.y = y + Math.sin(clock.elapsedTime * 1.6) * 0.08;
    }
    if (rings.current) {
      rings.current.rotation.y += dt * 0.7;
      rings.current.position.y = y + Math.sin(clock.elapsedTime * 1.6) * 0.08;
    }
  });
  const size = 1 + (level - 1) * 0.16;
  const ringCount = Math.min(6, level - 1);
  return (
    <>
      <mesh ref={gem} position={[0, y, 0]} scale={size}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} roughness={0.2} metalness={0.25} toneMapped={false} />
      </mesh>
      <group ref={rings} position={[0, y, 0]}>
        {Array.from({ length: ringCount }, (_, i) => (
          <mesh key={i} rotation={[Math.PI / 2 + i * 0.5, i * 0.7, 0]}>
            <torusGeometry args={[0.62 * size + i * 0.16, 0.018, 8, 64]} />
            <meshBasicMaterial color={i % 2 ? GOLD : color} transparent opacity={0.85} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </>
  );
}

/** A beam of light up from the beacon. The longer your streak, the higher it reaches. */
function StreakBeam({ y, streak }: { y: number; streak: number }) {
  const ref = useRef<Mesh>(null);
  const h = 2.2 + Math.min(streak, 30) * 0.5;
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const mat = m.material as { opacity: number };
    mat.opacity = 0.14 + Math.sin(clock.elapsedTime * 2) * 0.03 + Math.min(streak, 30) * 0.004;
  });
  return (
    <mesh ref={ref} position={[0, y + h / 2, 0]}>
      <cylinderGeometry args={[0.28, 0.62, h, 24, 1, true]} />
      <meshBasicMaterial color={GOLD} transparent opacity={0.16} blending={AdditiveBlending} depthWrite={false} toneMapped={false} side={2} />
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
  selectedDate,
  onSelect,
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
  selectedDate: string | null;
  onSelect: (info: HoverInfo | null) => void;
}) {
  const { data, color } = tower;
  const box = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 3, 0.09), []);
  const gem = useMemo(() => new OctahedronGeometry(0.5, 0), []);
  useEffect(
    () => () => {
      box.dispose();
      gem.dispose();
    },
    [box, gem]
  );
  const parts = useMemo(() => partition(data, focusMonth), [data, focusMonth]);
  const floors = data.floors.length;
  const height = floors * PITCH + 0.12;
  const level = towerLevel(data.totalDone).level;
  const todayItem = [...parts.done, ...parts.streak, ...parts.pending].find((i) => i.slot.today) ?? null;
  const [hovered, setHovered] = useState<Item | null>(null);

  const toInfo = (item: Item): HoverInfo => ({ towerId: tower.id, name: tower.name, date: item.slot.date, kind: item.slot.kind, value: item.slot.value, floorLabel: item.floorLabel });
  const report = (item: Item | null) => {
    setHovered(item);
    onHover(item ? toInfo(item) : null);
  };
  const pick = (item: Item) => onSelect(toInfo(item));
  // Every block that can be tapped (not the dimmed ones when a month is in focus).
  const allItems = useMemo(() => [...parts.done, ...parts.streak, ...parts.partial, ...parts.missed, ...parts.skipped, ...parts.pending, ...parts.future], [parts]);
  const selectedItem = selectedDate ? (allItems.find((i) => i.slot.date === selectedDate) ?? null) : null;

  const emptyColor = dark ? "#1a1f3a" : "#cfd3e6";
  const labelStep = floors > 24 ? 3 : floors > 12 ? 2 : 1;
  const showGhost = todayItem && todayItem.slot.kind === "pending";

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

      {/* Floor slabs: one thin glass disc per month. Strong months get a glowing rim, perfect ones a gold rim. */}
      {data.floors.map((f, i) => (
        <group key={f.month}>
          <mesh position={[0, BASE_Y + i * PITCH - 0.015, 0]}>
            <cylinderGeometry args={[RING + 0.5, RING + 0.5, 0.03, 64]} />
            <meshStandardMaterial color={dark ? "#2b3260" : "#ffffff"} transparent opacity={focusMonth && f.month !== focusMonth ? 0.12 : 0.42} roughness={0.2} depthWrite={false} />
          </mesh>
          {f.rating && (
            <mesh position={[0, BASE_Y + i * PITCH, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[RING + 0.5, f.rating === "perfect" ? 0.045 : 0.03, 8, 96]} />
              <meshBasicMaterial color={f.rating === "perfect" ? GOLD : color} transparent opacity={0.95} toneMapped={false} />
            </mesh>
          )}
        </group>
      ))}

      {/* States, told apart by shape and colour, not just brightness:
          done = a solid block topped with a gem; streak = a taller gold block with a hot gem;
          partly done = a half block; rest day = a pale ice block; missed = a red pit with a cross;
          still to come = a faint outline. */}
      <Layer items={parts.future} geometry={box} intro={false} interactive={false} onHover={report} style={{ size: [BLOCK_W, 0.03, BLOCK_D], color: emptyColor, opacity: 0.35, roughness: 0.8 }} />
      <Layer items={parts.missed} geometry={box} intro={intro} interactive={false} onHover={report} style={{ size: [BLOCK_W * 0.86, 0.06, BLOCK_D * 0.86], color: RED, emissive: RED, emissiveIntensity: dark ? 0.55 : 0.4, roughness: 0.6 }} />
      <Layer items={parts.missed} geometry={box} intro={intro} interactive={false} onHover={report} style={{ size: [BLOCK_W * 0.7, 0.05, 0.09], color: "#fee2e2", emissive: "#ffffff", emissiveIntensity: 0.5, yOffset: 0.06, rot: Math.PI / 4 }} />
      <Layer items={parts.missed} geometry={box} intro={intro} interactive={false} onHover={report} style={{ size: [BLOCK_W * 0.7, 0.05, 0.09], color: "#fee2e2", emissive: "#ffffff", emissiveIntensity: 0.5, yOffset: 0.06, rot: -Math.PI / 4 }} />
      <Layer items={parts.skipped} geometry={box} intro={intro} interactive={false} onHover={report} style={{ size: [BLOCK_W, BLOCK_H * 0.5, BLOCK_D], color: ICE, emissive: "#38bdf8", emissiveIntensity: 0.3, opacity: 0.62, roughness: 0.12 }} />
      <Layer items={parts.partial} geometry={box} intro={intro} interactive={false} onHover={report} style={{ size: [BLOCK_W, BLOCK_H * 0.52, BLOCK_D], color, emissive: color, emissiveIntensity: 0.3, opacity: 0.9, roughness: 0.4 }} />
      <Layer items={parts.done} geometry={box} intro={intro} interactive={false} onHover={report} style={{ size: [BLOCK_W, BLOCK_H, BLOCK_D], color, emissive: color, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.12 }} />
      <Layer items={parts.done} geometry={gem} intro={intro} interactive={false} onHover={report} style={{ size: [0.2, 0.3, 0.2], color: "#ffffff", emissive: color, emissiveIntensity: 1.3, yOffset: BLOCK_H + 0.02, roughness: 0.15 }} />
      <Layer items={parts.streak} geometry={box} intro={intro} interactive={false} onHover={report} style={{ size: [BLOCK_W, BLOCK_H * 1.14, BLOCK_D], color: GOLD, emissive: GOLD_HOT, emissiveIntensity: 1.1, roughness: 0.22, metalness: 0.2 }} />
      <Layer items={parts.streak} geometry={gem} intro={intro} interactive={false} onHover={report} style={{ size: [0.26, 0.38, 0.26], color: "#fff3b0", emissive: GOLD, emissiveIntensity: 1.8, yOffset: BLOCK_H * 1.14 + 0.02, roughness: 0.1 }} />
      <Layer items={parts.pending} geometry={box} intro={false} interactive={false} onHover={report} style={{ size: [BLOCK_W, 0.05, BLOCK_D], color, emissive: color, emissiveIntensity: 0.4, opacity: 0.6 }} />
      <Layer items={parts.dim} geometry={box} intro={false} interactive={false} onHover={report} style={{ size: [BLOCK_W, BLOCK_H * 0.6, BLOCK_D], color: dark ? "#3a4170" : "#c5cae4", opacity: 0.3, roughness: 0.6 }} />

      {/* A generous invisible hit box over every block, so taps land easily on a phone. */}
      <Layer items={allItems} geometry={box} intro={false} interactive onHover={report} onPick={pick} style={{ size: [BLOCK_W * 1.45, BLOCK_H * 1.9, BLOCK_D * 1.3], color: "#ffffff", invisible: true }} />

      {/* The floor being built right now gets a glowing ring. */}
      <mesh position={[0, BASE_Y + (floors - 1) * PITCH + BLOCK_H + 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[RING + 0.5, 0.028, 8, 96]} />
        <meshBasicMaterial color={color} transparent opacity={0.75} toneMapped={false} />
      </mesh>

      {showGhost && todayItem && <TodayGhost item={todayItem} color={color} />}
      {selectedItem && <SelectedMarker item={selectedItem} />}
      {hovered && !selectedItem && (
        <mesh position={[hovered.x, hovered.baseY + BLOCK_H / 2, hovered.z]} rotation={[0, hovered.rotY, 0]} scale={[BLOCK_W * 1.2, BLOCK_H * 1.45, BLOCK_D * 1.15]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.28} depthWrite={false} toneMapped={false} />
        </mesh>
      )}

      {/* Beacon, level rings and the streak beam */}
      {labels && <Sparkles count={Math.min(70, 14 + Math.round(data.totalDone / 3))} scale={[RING * 2.4, height + 3, RING * 2.4]} position={[0, (height + 3) / 2, 0]} size={3.2} speed={0.35} color={color} opacity={0.85} />}
      {labels && data.streak > 0 && <Sparkles count={Math.min(50, 8 + data.streak * 2)} scale={[1.6, 3 + Math.min(data.streak, 30) * 0.5, 1.6]} position={[0, height + 1 + (3 + Math.min(data.streak, 30) * 0.5) / 2, 0]} size={4} speed={0.8} color={GOLD} opacity={0.95} />}
      <Beacon color={color} y={height + 0.75} level={level} />
      {data.streak > 0 && <StreakBeam y={height + 1.1} streak={data.streak} />}
      {light && <pointLight position={[0, height + 1, 0]} color={data.streak > 0 ? GOLD : color} intensity={dark ? 14 : 7} distance={10} decay={2} />}

      {/* Month labels down the left side (single-tower view); a star marks a strong or perfect month */}
      {labels &&
        data.floors.map((f, i) =>
          i % labelStep === 0 || f.month === focusMonth || f.rating ? (
            <Html key={f.month} position={[-(RING + 1.9), BASE_Y + i * PITCH + 0.2, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
              <span className={`whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums ${f.month === focusMonth ? "bg-h-brand text-h-brand-fg" : "bg-h-surface/80 text-h-muted"}`}>
                {f.rating === "perfect" ? "★ " : f.rating === "strong" ? "☆ " : ""}
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

function CameraRig({ height, width, resetKey, controls }: { height: number; width: number; resetKey: number; controls: React.RefObject<ControlsLike | null> }) {
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
  /** The block currently selected (by tap or the previous / next buttons). */
  selected: { towerId: string; date: string } | null;
  onSelect: (info: HoverInfo | null) => void;
};

/** The 3D scene: one or more habit towers on a shared stage. */
export function TowerScene({ towers, dark, focusMonth, autoRotate, resetKey, intro, onHover, onPickTower, selected, onSelect }: TowerSceneProps) {
  const controls = useRef<ControlsLike | null>(null);
  const maxFloors = Math.max(1, ...towers.map((t) => t.data.floors.length));
  const maxStreak = Math.max(0, ...towers.map((t) => t.data.streak));
  const height = maxFloors * PITCH + 2 + (maxStreak > 0 ? 1.5 : 0);
  const width = (towers.length - 1) * TOWER_SPACING + (RING + 2) * 2;
  const single = towers.length === 1;
  const selTower = selected ? towers.find((t) => t.id === selected.towerId) : undefined;
  const selPos = single && selected && selTower ? locate(selTower.data, selected.date) : null;

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: 36, near: 0.1, far: 200, position: [8, 8, 16] }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      onPointerMissed={() => onSelect(null)}
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
          selectedDate={selected && selected.towerId === t.id ? selected.date : null}
          onSelect={onSelect}
        />
      ))}

      <ContactShadows position={[0, 0.002, 0]} opacity={dark ? 0.55 : 0.32} scale={width + 16} blur={2.6} far={height + 4} resolution={512} />
      <CameraRig height={height} width={width} resetKey={resetKey} controls={controls} />
      <SelectionRig target={selPos} controls={controls} />
      <OrbitControls
        ref={(c) => {
          controls.current = c as unknown as ControlsLike | null;
        }}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={7}
        maxDistance={Math.max(34, width * 1.4)}
        minPolarAngle={0.25}
        maxPolarAngle={1.5}
        autoRotate={autoRotate && !selected}
        autoRotateSpeed={0.7}
      />
    </Canvas>
  );
}
