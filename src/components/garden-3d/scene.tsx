"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Color, type DirectionalLight, type HemisphereLight, type Mesh } from "three";
import { OrbitControls } from "@react-three/drei";
import { Plots, StageLayer, PlotRing, GardenGround, GardenFence, gridPosition, type GardenCell } from "./plant";
import { GardenSurroundings } from "./surroundings";

export type Garden3DProps = {
  cells: {
    date: string | null;
    stage: GardenCell["stage"];
    pct: number;
    quality: GardenCell["quality"];
    condition: GardenCell["condition"];
    plotState: GardenCell["plotState"];
    bonus: boolean;
    tier: GardenCell["tier"];
  }[];
  cols: number;
  todayDate: string;
  selectedDate: string | null;
  onSelect: (date: string) => void;
};

function SelectPlane({
  cells,
  cols,
  rows,
  onSelect,
  onHover,
}: {
  cells: GardenCell[];
  cols: number;
  rows: number;
  onSelect: (date: string) => void;
  onHover: (hovering: boolean) => void;
}) {
  return (
    <>
      {cells
        .filter((c) => c.date)
        .map((c, i) => {
          const [x, , z] = gridPosition(c.col, c.row, cols, rows);
          return (
            <mesh
              key={i}
              position={[x, 0.05, z]}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(c.date as string);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                onHover(true);
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                onHover(false);
              }}
            >
              <boxGeometry args={[1.35, 0.15, 1.35]} />
              <meshBasicMaterial visible={false} />
            </mesh>
          );
        })}
    </>
  );
}

/**
 * Turns on shadow casting/receiving for every solid (opaque, lit) mesh in the scene once, so the
 * many small decorations in plant.tsx don't each need their own flags. Transparent/unlit meshes
 * (glows, flames, wings, petals, rings) are skipped so they don't leave odd shadow blobs.
 * Meshes that already opted in to receiving (ground, plots) only receive.
 */
function ShadowSetup({ deps }: { deps: unknown }) {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    scene.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh || m.userData.shadowInit) return;
      const mat = m.material;
      if (Array.isArray(mat) || mat.type !== "MeshStandardMaterial" || mat.transparent) return;
      m.userData.shadowInit = true;
      if (!m.receiveShadow) m.castShadow = true;
      m.receiveShadow = true;
    });
  }, [scene, deps]);
  return null;
}

const CYCLE_SECONDS = 60;
const ORBIT_RADIUS = 16;
const ORBIT_DEPTH = -4;

const SKY_DAY = new Color("#dff3e6");
const SKY_NIGHT = new Color("#2a3560");
const GROUND_DAY = new Color("#cfead6");
const GROUND_NIGHT = new Color("#1a2038");
const SUN_COLOR = new Color("#fff1d0");
const MOON_COLOR = new Color("#9fb4e8");
const BG_DAY = new Color("#bfe3f5");
const BG_NIGHT = new Color("#0c1226");

/**
 * Sun and moon orbit the garden once every 60 seconds. The directional light follows whichever
 * body is above the horizon (so shadows sweep across the land as it moves), fading out near the
 * horizon and swapping to the other body's warmer/cooler tone — sun during the day, dim moon at
 * night. The ambient hemisphere light and each body's own glow fade the same way, so the whole
 * scene reads as day turning to night and back, not just a moving shadow.
 */
function DayNightCycle({ shadowHalf }: { shadowHalf: number }) {
  const lightRef = useRef<DirectionalLight>(null!);
  const hemiRef = useRef<HemisphereLight>(null!);
  const sunRef = useRef<Mesh>(null!);
  const moonRef = useRef<Mesh>(null!);
  const { scene } = useThree();

  useFrame(({ clock }) => {
    const phase = (clock.getElapsedTime() % CYCLE_SECONDS) / CYCLE_SECONDS;
    const angle = phase * Math.PI * 2;
    const sunHeight = Math.sin(angle);
    const sunHoriz = -Math.cos(angle);
    const sunX = sunHoriz * ORBIT_RADIUS;
    const sunY = sunHeight * ORBIT_RADIUS;

    sunRef.current?.position.set(sunX, sunY, ORBIT_DEPTH);
    moonRef.current?.position.set(-sunX, -sunY, ORBIT_DEPTH);

    const light = lightRef.current;
    if (light) {
      if (sunHeight >= 0) {
        light.position.set(sunX, Math.max(sunY, 0.6), ORBIT_DEPTH);
        light.intensity = 0.15 + sunHeight * 1.5;
        light.color.copy(SUN_COLOR);
      } else {
        light.position.set(-sunX, Math.max(-sunY, 0.6), ORBIT_DEPTH);
        light.intensity = 0.12 + -sunHeight * 0.55;
        light.color.copy(MOON_COLOR);
      }
    }

    const dayT = Math.min(1, Math.max(0, (sunHeight + 0.2) / 0.4));

    const hemi = hemiRef.current;
    if (hemi) {
      hemi.intensity = 0.32 + dayT * 0.55;
      hemi.color.copy(SKY_NIGHT).lerp(SKY_DAY, dayT);
      hemi.groundColor.copy(GROUND_NIGHT).lerp(GROUND_DAY, dayT);
    }

    // The Canvas's own background, so the sky visible above the terrain/mountains actually
    // darkens at night instead of staying a static daytime blue behind the 3D content.
    if (!(scene.background instanceof Color)) scene.background = new Color();
    (scene.background as Color).copy(BG_NIGHT).lerp(BG_DAY, dayT);
  });

  return (
    <>
      <hemisphereLight ref={hemiRef} args={["#dff3e6", "#cfead6", 0.8]} />
      <directionalLight
        ref={lightRef}
        intensity={1.5}
        color="#fff1d0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-shadowHalf}
        shadow-camera-right={shadowHalf}
        shadow-camera-top={shadowHalf}
        shadow-camera-bottom={-shadowHalf}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      <mesh ref={sunRef}>
        <sphereGeometry args={[1.6, 16, 16]} />
        <meshBasicMaterial color="#fff4c2" toneMapped={false} />
      </mesh>
      <mesh ref={moonRef}>
        <sphereGeometry args={[1.1, 16, 16]} />
        <meshBasicMaterial color="#e8ecf7" toneMapped={false} />
      </mesh>
    </>
  );
}

export function Garden3DScene({ cells, cols, todayDate, selectedDate, onSelect }: Garden3DProps) {
  const rows = Math.ceil(cells.length / cols);
  const [hovering, setHovering] = useState(false);

  const gridCells: GardenCell[] = useMemo(
    () =>
      cells.map((c, i) => ({
        ...c,
        col: i % cols,
        row: Math.floor(i / cols),
      })),
    [cells, cols]
  );

  // orthographic shadow frustum just big enough to cover the whole lawn
  const shadowHalf = (Math.max(cols * 1.4, rows * 1.4) / 2) * 1.5 + 2;

  const todayCell = gridCells.find((c) => c.date === todayDate);
  const selectedCell = gridCells.find((c) => c.date === selectedDate && c.date !== todayDate);

  return (
    <div
      className="h-72 w-full overflow-hidden rounded-3xl bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50"
      style={{ cursor: hovering ? "pointer" : "grab" }}
    >
      <Canvas
        dpr={[1, 2.5]}
        shadows
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 11, 10.5], fov: 42 }}
      >
        <DayNightCycle shadowHalf={shadowHalf} />
        <ShadowSetup deps={gridCells} />

        <GardenSurroundings cols={cols} rows={rows} />
        <GardenGround cols={cols} rows={rows} />
        <GardenFence cols={cols} rows={rows} />
        <Plots cells={gridCells} cols={cols} rows={rows} />
        <StageLayer cells={gridCells} cols={cols} rows={rows} />
        {todayCell && <PlotRing cell={todayCell} cols={cols} rows={rows} color="#0f7a4c" />}
        {selectedCell && <PlotRing cell={selectedCell} cols={cols} rows={rows} color="#f59e0b" />}
        <SelectPlane cells={gridCells} cols={cols} rows={rows} onSelect={onSelect} onHover={setHovering} />

        <OrbitControls
          enablePan={false}
          minDistance={8}
          maxDistance={20}
          minPolarAngle={0.3}
          maxPolarAngle={1.15}
        />
      </Canvas>
    </div>
  );
}
