"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  LineCurve3,
  Vector2,
  Vector3,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type MeshPhysicalMaterial,
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

const FRAME_BRONZE = "#3a2e24";
const FRAME_BRONZE_DARK = "#241c15";
const FACETS = 8; // low-poly: octagonal, not round

// Classic hurricane/camping-lantern silhouette (flared foot -> waist -> barrel glass -> shoulder
// -> neck -> flared cap -> chimney, plus a bent-wire carry handle) instead of a hexagonal cage.
const GLASS_BOTTOM_Y = -0.84;
const GLASS_TOP_Y = 0.5;
const SHOULDER_Y = 0.55;
const HANDLE_MOUNT_Y = 0.72;
const HANDLE_MOUNT_X = 0.3;
const HANDLE_PEAK_Y = 1.7;

/** Revolve profile for the faceted glass globe: (radius, y) pairs from bottom to top. */
const GLASS_PROFILE: [number, number][] = [
  [0.3, GLASS_BOTTOM_Y],
  [0.5, -0.4],
  [0.52, 0.0],
  [0.42, 0.35],
  [0.3, GLASS_TOP_Y],
];

function LanternRig({ quality, goldenFraction, missedCount }: LanternSceneProps) {
  const haloRef = useRef<SpriteType>(null);
  const midGlowRef = useRef<SpriteType>(null);
  const coreGlowRef = useRef<SpriteType>(null);
  const shaftRef = useRef<SpriteType>(null);
  const groundGlowRef = useRef<SpriteType>(null);
  const lightRef = useRef<PointLight>(null);
  const rimLightRef = useRef<PointLight>(null);
  const groupRef = useRef<Group>(null);
  const glassRef = useRef<Mesh>(null);
  const orbRef = useRef<Mesh>(null);
  const sparkRefs = useRef<(SpriteType | null)[]>([]);
  const tex = getSoftTexture();

  const glassPoints = useMemo(() => GLASS_PROFILE.map(([r, y]) => new Vector2(r, y)), []);
  // Two straight struts meeting at a peak — a pointed triangular arch (like real bent lantern
  // wire) instead of a smooth rounded loop, which read as too small/soft against the reference.
  const handleLeft = useMemo(
    () => new LineCurve3(new Vector3(-HANDLE_MOUNT_X, HANDLE_MOUNT_Y, 0), new Vector3(0, HANDLE_PEAK_Y, 0)),
    []
  );
  const handleRight = useMemo(
    () => new LineCurve3(new Vector3(0, HANDLE_PEAK_Y, 0), new Vector3(HANDLE_MOUNT_X, HANDLE_MOUNT_Y, 0)),
    []
  );

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
    // The actual light source: a small solid glowing sphere sitting dead-center in the glass.
    // Sprites are camera-facing billboards with no real volume — as the lantern rotates they
    // never look "inside" anything from every angle, which is why the glow read as floating
    // rather than emanating from a real object. This orb is real 3D geometry that rotates with
    // the lantern group, so from any angle it visibly sits in the middle of the glass, and the
    // glow sprites layered around it (below) now exist only to soften its edge and bleed light
    // through the glass walls, not to fake the source itself.
    if (orbRef.current) {
      const s = 0.14 + glowPower * 0.06;
      orbRef.current.scale.setScalar(s);
      const mat = orbRef.current.material as MeshBasicMaterial;
      mat.color.copy(flameColor).lerp(BLAZE_COLOR, hasMissed ? 0.1 : blaze ? 0.7 : 0.35);
    }
    if (coreGlowRef.current) {
      const s = 0.24 + glowPower * 0.14;
      coreGlowRef.current.scale.set(s, s, 1);
      const mat = coreGlowRef.current.material as SpriteMaterial;
      mat.color.copy(flameColor).lerp(BLAZE_COLOR, hasMissed ? 0 : blaze ? 0.6 : 0.2);
      mat.opacity = Math.min(1, 0.4 + glowPower * 0.22);
    }
    if (midGlowRef.current) {
      const s = 0.42 + glowPower * 0.24;
      midGlowRef.current.scale.set(s, s, 1);
      const mat = midGlowRef.current.material as SpriteMaterial;
      mat.color.copy(flameColor);
      mat.opacity = Math.min(0.8, 0.2 + glowPower * 0.2);
    }
    if (haloRef.current) {
      const s = 0.6 + glowPower * 0.32;
      haloRef.current.scale.set(s, s, 1);
      const mat = haloRef.current.material as SpriteMaterial;
      mat.color.copy(flameColor);
      mat.opacity = Math.min(0.4, 0.06 + glowPower * 0.08);
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
    if (glassRef.current) {
      const mat = glassRef.current.material as MeshPhysicalMaterial;
      mat.emissive.copy(flameColor);
      mat.emissiveIntensity = Math.min(1.2, 0.15 + glowPower * 0.22);
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
      {/* flared foot: proportionally large, like the reference's wide triangular base */}
      <mesh position={[0, -1.22, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.5, 0.52, FACETS]} />
        <meshStandardMaterial color={FRAME_BRONZE_DARK} roughness={0.55} metalness={0.4} flatShading />
      </mesh>

      {/* waist ring, with the wick-adjuster knob sticking out to one side */}
      <mesh position={[0, -0.9, 0]}>
        <cylinderGeometry args={[0.3, 0.34, 0.12, FACETS]} />
        <meshStandardMaterial color={FRAME_BRONZE} roughness={0.5} metalness={0.5} flatShading />
      </mesh>
      <mesh position={[0.37, -0.9, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.12, FACETS]} />
        <meshStandardMaterial color={FRAME_BRONZE_DARK} roughness={0.4} metalness={0.55} flatShading />
      </mesh>

      {/* the faceted glass globe (low-poly octagonal barrel), lit warm from within by the flame.
          flatShading keeps each of the 8 facets a visible flat pane instead of smoothing them
          into a round highlight, which is what actually reads as "low poly" at a glance. */}
      <mesh ref={glassRef}>
        <latheGeometry args={[glassPoints, FACETS]} />
        <meshPhysicalMaterial
          color="#fdf6e3"
          transparent
          opacity={0.4}
          roughness={0.12}
          metalness={0}
          emissive="#f5a623"
          emissiveIntensity={0.2}
          side={2}
          flatShading
        />
      </mesh>

      {/* shoulder collar, neck, and flared chimney cap */}
      <mesh position={[0, SHOULDER_Y, 0]}>
        <cylinderGeometry args={[0.28, 0.32, 0.1, FACETS]} />
        <meshStandardMaterial color={FRAME_BRONZE} roughness={0.5} metalness={0.5} flatShading />
      </mesh>
      <mesh position={[0, SHOULDER_Y + 0.13, 0]}>
        <cylinderGeometry args={[0.14, 0.16, 0.16, FACETS]} />
        <meshStandardMaterial color={FRAME_BRONZE} roughness={0.45} metalness={0.55} flatShading />
      </mesh>
      <mesh position={[0, SHOULDER_Y + 0.31, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.26, 0.16, FACETS]} />
        <meshStandardMaterial color={FRAME_BRONZE} roughness={0.5} metalness={0.5} flatShading />
      </mesh>
      <mesh position={[0, SHOULDER_Y + 0.45, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 0.1, FACETS]} />
        <meshStandardMaterial color={FRAME_BRONZE} roughness={0.4} metalness={0.6} flatShading />
      </mesh>

      {/* bent-wire carry handle: two straight struts meeting at a tall peak well above the cap,
          a pointed triangular arch like real bent lantern wire */}
      <mesh>
        <tubeGeometry args={[handleLeft, 8, 0.024, 6, false]} />
        <meshStandardMaterial color={FRAME_BRONZE_DARK} roughness={0.4} metalness={0.65} flatShading />
      </mesh>
      <mesh>
        <tubeGeometry args={[handleRight, 8, 0.024, 6, false]} />
        <meshStandardMaterial color={FRAME_BRONZE_DARK} roughness={0.4} metalness={0.65} flatShading />
      </mesh>
      <mesh position={[0, HANDLE_PEAK_Y, 0]}>
        <sphereGeometry args={[0.026, 8, 8]} />
        <meshStandardMaterial color={FRAME_BRONZE_DARK} roughness={0.4} metalness={0.65} flatShading />
      </mesh>

      {/* the light ball itself: real 3D geometry at the exact center of the glass, unlit (always
          full brightness regardless of scene lighting) so it reads as the thing emitting light,
          not a surface reflecting it — visible through the glass from every angle as the
          lantern rotates */}
      <mesh ref={orbRef} position={[0, -0.15, 0]}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial toneMapped={false} />
      </mesh>

      {/* soft additive sprites: feather the orb's edge and bleed its light through the glass
          walls in every direction — no longer faking the source itself (the orb above does
          that), just diffusing it */}
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
      <pointLight ref={lightRef} position={[0, -0.15, 0]} distance={4.5} decay={2} />
      <pointLight ref={rimLightRef} position={[0, 0.6, 0.3]} distance={3} decay={2} />

      {tex &&
        Array.from({ length: sparkCount }, (_, i) => (
          <sprite key={i} ref={(el) => void (sparkRefs.current[i] = el)}>
            <spriteMaterial map={tex} color={BLAZE_COLOR} blending={AdditiveBlending} transparent depthWrite={false} />
          </sprite>
        ))}

      {/* soft contact glow pooling under the base, like real light hitting a surface */}
      {tex && (
        <sprite ref={groundGlowRef} position={[0, -1.56, 0.05]}>
          <spriteMaterial map={tex} blending={AdditiveBlending} transparent depthWrite={false} toneMapped={false} />
        </sprite>
      )}
    </group>
  );
}

export function LanternScene(props: LanternSceneProps) {
  return (
    <div className="h-56 w-full overflow-hidden rounded-3xl bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-800">
      <Canvas dpr={[1, 2]} gl={{ antialias: true }} camera={{ position: [0, 0.35, 5.2], fov: 38 }}>
        <ambientLight intensity={0.16} />
        {/* faint cool rim so the frame reads with some shape even when the flame is nearly out */}
        <directionalLight position={[-2, 2, 3]} intensity={0.18} color="#8fa8c9" />
        <LanternRig {...props} />
      </Canvas>
    </div>
  );
}
