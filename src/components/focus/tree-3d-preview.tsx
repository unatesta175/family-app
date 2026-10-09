"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Tree3D } from "@/components/focus/garden-3d";
import type { FocusSpecies, TreeTier } from "@/lib/focus";

/**
 * One tree in 3D on a small patch of grass, for the start screen: it shows how the tree of the chosen
 * session length grows. It is the same Tree3D (and so the same tier design) the 3D garden uses.
 */
export default function Tree3DPreview({ progress, species, tier }: { progress: number; species: FocusSpecies; tier: TreeTier }) {
  return (
    <Canvas flat camera={{ position: [2.7, 1.9, 3.1], fov: 30 }} dpr={[1, 1.75]} gl={{ alpha: true, antialias: true, failIfMajorPerformanceCaveat: false }}>
      <ambientLight intensity={1.35} />
      <hemisphereLight args={["#f3ffe0", "#9ac56a", 1.0]} />
      <directionalLight position={[3, 5, 2]} intensity={1.5} color="#fff3d0" />
      <directionalLight position={[-3, 2, -2]} intensity={0.5} color="#d8f5ff" />
      {/* a round patch of grass and soil to stand on */}
      <mesh position={[0, -0.04, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 0.08, 32]} />
        <meshStandardMaterial color="#a4d65c" emissive="#6f9e2c" emissiveIntensity={0.35} flatShading />
      </mesh>
      <mesh position={[0, -0.22, 0]}>
        <cylinderGeometry args={[0.8, 0.68, 0.28, 32]} />
        <meshStandardMaterial color="#9a6a3c" emissive="#3a2210" emissiveIntensity={0.25} flatShading />
      </mesh>
      <mesh position={[0, -0.42, 0]}>
        <cylinderGeometry args={[0.68, 0.5, 0.12, 32]} />
        <meshStandardMaterial color="#7a4e29" emissive="#2a180a" emissiveIntensity={0.25} flatShading />
      </mesh>
      <Tree3D species={species} tier={tier} withered={false} progress={progress} />
      <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={0.7} maxPolarAngle={1.45} autoRotate autoRotateSpeed={1.1} target={[0, 0.6, 0]} />
    </Canvas>
  );
}
