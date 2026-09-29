"use client";

import dynamic from "next/dynamic";
import type { LanternSceneProps } from "./scene";

const LanternSceneImpl = dynamic(() => import("./scene").then((m) => m.LanternScene), {
  ssr: false,
  loading: () => (
    <div className="flex h-56 w-full items-center justify-center rounded-3xl bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-800">
      <p className="text-xs font-medium text-neutral-500">Lighting your lantern&hellip;</p>
    </div>
  ),
});

export function Lantern3D(props: LanternSceneProps) {
  return <LanternSceneImpl {...props} />;
}
