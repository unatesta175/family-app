"use client";

import dynamic from "next/dynamic";
import type { Garden3DProps } from "./scene";

const Garden3DScene = dynamic(() => import("./scene").then((m) => m.Garden3DScene), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 w-full items-center justify-center rounded-3xl bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50">
      <p className="text-xs font-medium text-neutral-400">Growing your garden&hellip;</p>
    </div>
  ),
});

export function Garden3D(props: Garden3DProps) {
  return <Garden3DScene {...props} />;
}
