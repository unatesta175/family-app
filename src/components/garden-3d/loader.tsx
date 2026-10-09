"use client";

import dynamic from "next/dynamic";
import { Sprout } from "lucide-react";
import { useWebGLSupported } from "@/lib/use-webgl";
import type { Garden3DProps } from "./scene";

const Garden3DScene = dynamic(() => import("./scene").then((m) => m.Garden3DScene), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 w-full items-center justify-center rounded-3xl bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50">
      <p className="text-xs font-medium text-neutral-400">Growing your garden&hellip;</p>
    </div>
  ),
});

/** Shown when the browser can't run WebGL (e.g. hardware acceleration is off on a desktop browser). */
function GardenFallback() {
  return (
    <div className="flex h-72 w-full flex-col items-center justify-center gap-2 rounded-3xl bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50 px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
        <Sprout className="h-6 w-6" />
      </span>
      <p className="text-sm font-semibold text-neutral-700">3D garden needs WebGL</p>
      <p className="max-w-xs text-xs text-neutral-500">
        Your browser has it turned off. Enable &ldquo;hardware acceleration&rdquo; in your browser settings (or try another browser) to see the garden grow.
      </p>
    </div>
  );
}

export function Garden3D(props: Garden3DProps) {
  // null = still checking (first paint), true = render the scene, false = WebGL unavailable.
  const supported = useWebGLSupported();

  if (supported === false) return <GardenFallback />;
  if (supported === null) {
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-3xl bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50">
        <p className="text-xs font-medium text-neutral-400">Growing your garden&hellip;</p>
      </div>
    );
  }
  return <Garden3DScene {...props} />;
}
