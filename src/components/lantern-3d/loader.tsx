"use client";

import dynamic from "next/dynamic";
import { Flame } from "lucide-react";
import { useWebGLSupported } from "@/lib/use-webgl";
import type { LanternSceneProps } from "./scene";

const LanternSceneImpl = dynamic(() => import("./scene").then((m) => m.LanternScene), {
  ssr: false,
  loading: () => (
    <div className="flex h-56 w-full items-center justify-center rounded-3xl bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-800">
      <p className="text-xs font-medium text-neutral-500">Lighting your lantern&hellip;</p>
    </div>
  ),
});

/** Shown when the browser can't run WebGL (e.g. hardware acceleration is off on a desktop browser). */
function LanternFallback() {
  return (
    <div className="flex h-56 w-full flex-col items-center justify-center gap-2 rounded-3xl bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-800 px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-amber-300">
        <Flame className="h-6 w-6" />
      </span>
      <p className="text-sm font-semibold text-neutral-100">3D lantern needs WebGL</p>
      <p className="max-w-xs text-xs text-neutral-400">
        Your browser has it turned off. Enable &ldquo;hardware acceleration&rdquo; in your browser settings (or try another browser) to see the lantern glow.
      </p>
    </div>
  );
}

export function Lantern3D(props: LanternSceneProps) {
  // null = still checking (first paint), true = render the scene, false = WebGL unavailable.
  const supported = useWebGLSupported();

  if (supported === false) return <LanternFallback />;
  if (supported === null) {
    return (
      <div className="flex h-56 w-full items-center justify-center rounded-3xl bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-800">
        <p className="text-xs font-medium text-neutral-500">Lighting your lantern&hellip;</p>
      </div>
    );
  }
  return <LanternSceneImpl {...props} />;
}
