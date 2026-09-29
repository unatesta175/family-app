"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  type Group,
  type Mesh,
  type PointLight,
  type Sprite as SpriteType,
} from "three";

export type LanternSceneProps = {
  /** 0-100: average quality of today's logged prayers (see gardenQuality). Drives flame brightness/color. */
  quality: number;
  /** 0-1: fraction of today's 5 prayers performed so far. Drives the rising fill level inside the glass. */
  performedFraction: number;
  /** 0-1: fraction of today's 5 prayers that were on_time_jamaah. Drives the golden-blaze sparkle bonus. */
  goldenFraction: number;
  /** How many of today's prayers are actively marked missed — a single one dims the whole lantern toward ash. */
  missedCount: number;
};

let softTexCache: CanvasTexture | null = null;
function getSoftTexture(): CanvasTexture | undefined {
  if (softTexCache) return softTexCache;
  if (typeof document === "undefined") return undefined;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  softTexCache = new CanvasTexture(canvas);
  return softTexCache;
}

const ASH_COLOR = new Color("#7a828e");
const DIM_COLOR = new Color("#8a6a3a");
const WARM_COLOR = new Color("#f5a623");
const GOLD_COLOR = new Color("#ffd23f");
const BLAZE_COLOR = new Color("#fff4c2");

const FRAME_BRONZE = "#4a3a26";
const FRAME_BRONZE_DARK = "#3a2d1c";

const POST_COUNT = 6;
const POST_RADIUS = 0.62;

function LanternRig({ quality, performedFraction, goldenFraction, missedCount }: LanternSceneProps) {
  const flameRef = useRef<Mesh>(null);
  const lightRef = useRef<PointLight>(null);
  const rimLightRef = useRef<PointLight>(null);
  const fillRef = useRef<Mesh>(null);
  const groupRef = useRef<Group>(null);
  const sparkRefs = useRef<(SpriteType | null)[]>([]);
  const tex = getSoftTexture();

  const hasMissed = missedCount > 0;
  const q = Math.max(0, Math.min(1, quality / 100));
  const blaze = !hasMissed && goldenFraction >= 0.8;

  // Flame color: ash when any prayer is missed, otherwise warm -> gold -> blaze white-gold with quality.
  const flameColor = useMemo(() => {
    if (hasMissed) return ASH_COLOR.clone().lerp(DIM_COLOR, q * 0.4);
    if (blaze) return GOLD_COLOR.clone().lerp(BLAZE_COLOR, 0.6);
    const base = DIM_COLOR.clone().lerp(WARM_COLOR, Math.min(1, q * 1.6));
    return base.lerp(GOLD_COLOR, Math.max(0, q - 0.5) * 2);
  }, [hasMissed, blaze, q]);

  // Overall brightness: near-dark unlit, rising with quality, sharply muted if anything's missed.
  const targetIntensity = useMemo(() => {
    const base = 0.35 + q * 3.2;
    return hasMissed ? base * 0.3 : blaze ? base * 1.25 : base;
  }, [q, hasMissed, blaze]);

  const fillColor = hasMissed ? "#5b6472" : "#e8b23d";
  const sparkCount = blaze ? 6 : 0;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const flicker = 0.88 + Math.sin(t * 9) * 0.06 + Math.sin(t * 3.3) * 0.06;

    if (lightRef.current) {
      lightRef.current.intensity = targetIntensity * flicker;
      lightRef.current.color.copy(flameColor);
    }
    if (rimLightRef.current) {
      rimLightRef.current.intensity = targetIntensity * 0.4 * flicker;
      rimLightRef.current.color.copy(flameColor);
    }
    if (flameRef.current) {
      const s = 0.34 + q * 0.22 * flicker + (blaze ? 0.08 : 0);
      flameRef.current.scale.setScalar(s);
      const mat = flameRef.current.material as import("three").MeshBasicMaterial;
      mat.color.copy(flameColor);
    }
    if (fillRef.current) {
      const h = Math.max(0.02, performedFraction);
      fillRef.current.scale.y = h;
      fillRef.current.position.y = -0.78 + (h * 1.3) / 2;
    }
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.15;
    }
    for (let i = 0; i < sparkCount; i++) {
      const sp = sparkRefs.current[i];
      if (!sp) continue;
      const ph = i * 1.7;
      const cycle = (t * 0.25 + ph * 0.3) % 1;
      sp.position.set(Math.sin(ph * 3 + t * 0.6) * 0.5, -0.5 + cycle * 2.1, Math.cos(ph * 2 + t * 0.5) * 0.5);
      const mat = sp.material as import("three").SpriteMaterial;
      mat.opacity = Math.sin(cycle * Math.PI) * 0.9;
      sp.scale.setScalar(0.1);
    }
  });

  return (
    <group ref={groupRef}>
      {/* base */}
      <mesh position={[0, -1.15, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.62, 0.22, 8]} />
        <meshStandardMaterial color={FRAME_BRONZE_DARK} roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, -1.0, 0]}>
        <cylinderGeometry args={[0.46, 0.5, 0.1, 8]} />
        <meshStandardMaterial color={FRAME_BRONZE} roughness={0.5} metalness={0.5} />
      </mesh>

      {/* corner posts */}
      {Array.from({ length: POST_COUNT }, (_, i) => {
        const a = (i / POST_COUNT) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * POST_RADIUS, 0, Math.sin(a) * POST_RADIUS]}>
            <cylinderGeometry args={[0.035, 0.035, 2, 6]} />
            <meshStandardMaterial color={FRAME_BRONZE} roughness={0.45} metalness={0.55} />
          </mesh>
        );
      })}

      {/* glass panels */}
      {Array.from({ length: POST_COUNT }, (_, i) => {
        const a = ((i + 0.5) / POST_COUNT) * Math.PI * 2;
        return (
          <mesh key={`glass${i}`} position={[Math.cos(a) * POST_RADIUS, 0, Math.sin(a) * POST_RADIUS]} rotation={[0, -a, 0]}>
            <planeGeometry args={[0.62, 1.9]} />
            <meshPhysicalMaterial
              color="#fff8e1"
              transparent
              opacity={0.1}
              roughness={0.1}
              metalness={0}
              side={2}
            />
          </mesh>
        );
      })}

      {/* top cap + ring */}
      <mesh position={[0, 1.05, 0]}>
        <coneGeometry args={[0.6, 0.4, 8]} />
        <meshStandardMaterial color={FRAME_BRONZE} roughness={0.5} metalness={0.5} />
      </mesh>
      <mesh position={[0, 1.32, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.1, 0.025, 8, 16]} />
        <meshStandardMaterial color={FRAME_BRONZE} roughness={0.4} metalness={0.6} />
      </mesh>

      {/* rising fill (how many of today's prayers performed) */}
      <mesh ref={fillRef} position={[0, -0.78, 0]}>
        <cylinderGeometry args={[0.38, 0.4, 1.3, 8]} />
        <meshStandardMaterial
          color={fillColor}
          transparent
          opacity={0.28}
          emissive={fillColor}
          emissiveIntensity={0.3}
          roughness={0.4}
        />
      </mesh>

      {/* flame */}
      <mesh ref={flameRef} position={[0, -0.15, 0]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color={flameColor} />
      </mesh>
      <pointLight ref={lightRef} position={[0, -0.1, 0]} distance={4.5} decay={2} />
      <pointLight ref={rimLightRef} position={[0, 0.6, 0.3]} distance={3} decay={2} />

      {tex &&
        Array.from({ length: sparkCount }, (_, i) => (
          <sprite key={i} ref={(el) => void (sparkRefs.current[i] = el)}>
            <spriteMaterial map={tex} color={BLAZE_COLOR} blending={AdditiveBlending} transparent depthWrite={false} />
          </sprite>
        ))}
    </group>
  );
}

export function LanternScene(props: LanternSceneProps) {
  return (
    <div className="h-56 w-full overflow-hidden rounded-3xl bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-800">
      <Canvas dpr={[1, 2]} gl={{ antialias: true }} camera={{ position: [0, 0.4, 4.2], fov: 38 }}>
        <ambientLight intensity={0.12} />
        <LanternRig {...props} />
      </Canvas>
    </div>
  );
}
