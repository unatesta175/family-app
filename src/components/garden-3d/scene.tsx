"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import type { Mesh } from "three";
import { OrbitControls } from "@react-three/drei";
import { Plots, StageLayer, PlotRing, GardenGround, GardenFence, gridPosition, type GardenCell } from "./plant";

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

/** Direction the sun sits in (from the garden's center); shadows fall away from it. */
const SUN_DIR: [number, number, number] = [-6, 10, -5];

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
        {/* softer ambient fill so the sun's shadows actually read */}
        <hemisphereLight args={["#dff3e6", "#cfead6", 0.8]} />
        <directionalLight
          position={SUN_DIR}
          intensity={1.5}
          color="#fff1d0"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-shadowHalf}
          shadow-camera-right={shadowHalf}
          shadow-camera-top={shadowHalf}
          shadow-camera-bottom={-shadowHalf}
          shadow-camera-near={1}
          shadow-camera-far={40}
          shadow-bias={-0.0004}
          shadow-normalBias={0.03}
        />
        {/* the sun itself, far along the light direction */}
        <mesh position={[SUN_DIR[0] * 2.6, SUN_DIR[1] * 2.6, SUN_DIR[2] * 2.6]}>
          <sphereGeometry args={[1.6, 16, 16]} />
          <meshBasicMaterial color="#fff4c2" toneMapped={false} />
        </mesh>
        <ShadowSetup deps={gridCells} />

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
