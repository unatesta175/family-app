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
  type SpriteMaterial,
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
/**
 * A soft radial falloff with a mid-stop (not just opaque-center-to-transparent-edge) so it reads
 * as a smooth glow rather than a disc with a visible rim once additive-blended — a plain 2-stop
 * gradient plateaus at full opacity across too much of the center and looks like a hard coin.
 */
function getSoftTexture(): CanvasTexture | undefined {
  if (softTexCache) return softTexCache;
  if (typeof document === "undefined") return undefined;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,0.95)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.55)");
  grad.addColorStop(0.7, "rgba(255,255,255,0.14)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
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
  const haloRef = useRef<SpriteType>(null);
  const midGlowRef = useRef<SpriteType>(null);
  const coreGlowRef = useRef<SpriteType>(null);
  const shaftRef = useRef<SpriteType>(null);
  const groundGlowRef = useRef<SpriteType>(null);
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
    // Two overlapping frequencies read as organic flicker rather than a metronomic pulse.
    const flicker = 0.86 + Math.sin(t * 9.5) * 0.07 + Math.sin(t * 3.1 + 1.7) * 0.07;
    const glowPower = targetIntensity * flicker;

    if (lightRef.current) {
      lightRef.current.intensity = glowPower;
      lightRef.current.color.copy(flameColor);
    }
    if (rimLightRef.current) {
      rimLightRef.current.intensity = glowPower * 0.4;
      rimLightRef.current.color.copy(flameColor);
    }
    // Soft additive glow, layered from a small warm core out to a wide faint halo, each layer
    // sized to overlap the next so the falloff reads as one continuous glow rather than
    // concentric rings or a stark bright disc — the core stays warm-tinted (not white) except
    // at a true golden-blaze day, so it doesn't look like a disconnected white coin.
    if (coreGlowRef.current) {
      const s = 0.34 + glowPower * 0.16;
      coreGlowRef.current.scale.set(s, s, 1);
      const mat = coreGlowRef.current.material as SpriteMaterial;
      mat.color.copy(flameColor).lerp(BLAZE_COLOR, hasMissed ? 0 : blaze ? 0.6 : 0.2);
      mat.opacity = Math.min(0.9, 0.28 + glowPower * 0.18);
    }
    if (midGlowRef.current) {
      const s = 0.7 + glowPower * 0.4;
      midGlowRef.current.scale.set(s, s, 1);
      const mat = midGlowRef.current.material as SpriteMaterial;
      mat.color.copy(flameColor);
      mat.opacity = Math.min(0.75, 0.16 + glowPower * 0.18);
    }
    if (haloRef.current) {
      const s = 1.3 + glowPower * 0.8;
      haloRef.current.scale.set(s, s, 1);
      const mat = haloRef.current.material as SpriteMaterial;
      mat.color.copy(flameColor);
      mat.opacity = Math.min(0.45, 0.05 + glowPower * 0.09);
    }
    if (shaftRef.current) {
      const h = 1.1 + glowPower * 0.55;
      shaftRef.current.scale.set(0.16, h, 1);
      const mat = shaftRef.current.material as SpriteMaterial;
      mat.color.copy(flameColor);
      mat.opacity = hasMissed ? 0 : Math.min(0.3, glowPower * 0.075);
    }
    if (groundGlowRef.current) {
      const s = 0.9 + glowPower * 0.4;
      groundGlowRef.current.scale.set(s * 1.4, s * 0.5, 1);
      const mat = groundGlowRef.current.material as SpriteMaterial;
      mat.color.copy(flameColor);
      mat.opacity = Math.min(0.4, 0.04 + glowPower * 0.07);
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

      {/* flame: purely layered additive glow sprites (soft bloom "faked" without a full
          postprocessing pipeline) — no solid mesh at all, so there's no hard silhouette to
          read as a disconnected "coin" against the glow around it */}
      {tex && (
        <>
          <sprite ref={haloRef} position={[0, -0.1, 0]}>
            <spriteMaterial map={tex} blending={AdditiveBlending} transparent depthWrite={false} toneMapped={false} />
          </sprite>
          <sprite ref={midGlowRef} position={[0, -0.12, 0]}>
            <spriteMaterial map={tex} blending={AdditiveBlending} transparent depthWrite={false} toneMapped={false} />
          </sprite>
          <sprite ref={coreGlowRef} position={[0, -0.15, 0]}>
            <spriteMaterial map={tex} blending={AdditiveBlending} transparent depthWrite={false} toneMapped={false} />
          </sprite>
          <sprite ref={shaftRef} position={[0, 0.45, 0]}>
            <spriteMaterial map={tex} blending={AdditiveBlending} transparent depthWrite={false} toneMapped={false} />
          </sprite>
        </>
      )}
      <pointLight ref={lightRef} position={[0, -0.1, 0]} distance={4.5} decay={2} />
      <pointLight ref={rimLightRef} position={[0, 0.6, 0.3]} distance={3} decay={2} />

      {tex &&
        Array.from({ length: sparkCount }, (_, i) => (
          <sprite key={i} ref={(el) => void (sparkRefs.current[i] = el)}>
            <spriteMaterial map={tex} color={BLAZE_COLOR} blending={AdditiveBlending} transparent depthWrite={false} />
          </sprite>
        ))}

      {/* soft contact glow pooling under the base, like real light hitting a surface */}
      {tex && (
        <sprite ref={groundGlowRef} position={[0, -1.28, 0.05]}>
          <spriteMaterial map={tex} blending={AdditiveBlending} transparent depthWrite={false} toneMapped={false} />
        </sprite>
      )}
    </group>
  );
}

export function LanternScene(props: LanternSceneProps) {
  return (
    <div className="h-56 w-full overflow-hidden rounded-3xl bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-800">
      <Canvas dpr={[1, 2]} gl={{ antialias: true }} camera={{ position: [0, 0.4, 4.2], fov: 38 }}>
        <ambientLight intensity={0.16} />
        {/* faint cool rim so the frame reads with some shape even when the flame is nearly out */}
        <directionalLight position={[-2, 2, 3]} intensity={0.18} color="#8fa8c9" />
        <LanternRig {...props} />
      </Canvas>
    </div>
  );
}
