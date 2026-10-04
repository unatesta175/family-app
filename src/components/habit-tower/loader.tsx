"use client";

import dynamic from "next/dynamic";
import type { TowerSceneProps } from "./scene";

/** The 3D scene is loaded on demand (it's heavy), with a calm placeholder while it arrives. */
const TowerSceneImpl = dynamic(() => import("./scene").then((m) => m.TowerScene), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <p className="animate-pulse text-xs font-semibold text-h-muted">Building your tower&hellip;</p>
    </div>
  ),
});

export function TowerCanvas(props: TowerSceneProps) {
  return <TowerSceneImpl {...props} />;
}
