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
    <Canvas camera={{ position: [2.3, 1.7, 2.6], fov: 34 }} dpr={[1, 1.75]} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={0.9} />
      <hemisphereLight args={["#e8ffd0", "#3b2a14", 0.55]} />
      <directionalLight position={[3, 5, 2]} intensity={1.7} color="#fff6dc" />
      {/* a round patch of grass and soil to stand on */}
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[1.05, 1.05, 0.1, 28]} />
        <meshStandardMaterial color="#a4d65c" flatShading />
      </mesh>
      <mesh position={[0, -0.28, 0]}>
        <cylinderGeometry args={[1.05, 0.95, 0.36, 28]} />
        <meshStandardMaterial color="#7a4f2b" flatShading />
      </mesh>
      <Tree3D species={species} tier={tier} withered={false} progress={progress} />
      <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={0.7} maxPolarAngle={1.45} autoRotate autoRotateSpeed={1.1} target={[0, 0.75, 0]} />
    </Canvas>
  );
}
