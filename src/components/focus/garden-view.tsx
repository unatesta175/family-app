"use client";

import { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { Box, Layers } from "lucide-react";
import { IsoGarden } from "@/components/focus/iso-garden";
import type { SessionLite } from "@/lib/focus";
import { cn } from "@/lib/utils";

const Garden3D = dynamic(() => import("@/components/focus/garden-3d"), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white/70">Growing your garden…</div>,
});

const KEY = "focus-garden-mode";
type Mode = "2.5d" | "3d";

// The choice is remembered on this device and shared by every garden on the page.
function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(KEY, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(KEY, cb);
  };
}
const read = (): Mode => {
  try {
    return localStorage.getItem(KEY) === "3d" ? "3d" : "2.5d";
  } catch {
    return "2.5d";
  }
};
function save(m: Mode) {
  try {
    localStorage.setItem(KEY, m);
  } catch {
    /* private mode: the choice just isn't remembered */
  }
  window.dispatchEvent(new Event(KEY));
}

let webglChecked: boolean | null = null;
function hasWebGL(): boolean {
  if (webglChecked !== null) return webglChecked;
  try {
    const c = document.createElement("canvas");
    webglChecked = !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    webglChecked = false;
  }
  return webglChecked;
}

/**
 * The garden with a switch between the 2.5D block and the 3D scene. Devices with no WebGL stay on 2.5D.
 * `overlay` sits in the corner of the garden (the Grove puts its tree counters there).
 */
export function GardenView({ sessions, overlay, className }: { sessions: SessionLite[]; overlay?: React.ReactNode; className?: string }) {
  const stored = useSyncExternalStore(subscribe, read, () => "2.5d" as Mode);
  // Assumed fine on the server, checked once in the browser.
  const webgl = useSyncExternalStore(() => () => undefined, hasWebGL, () => true);
  const mode: Mode = webgl ? stored : "2.5d";

  return (
    <div className={cn("relative", className)}>
      <div className="relative z-10 flex justify-end pb-1">
        <div role="tablist" aria-label="Garden view" className="flex rounded-full bg-black/25 p-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
          {(
            [
              { key: "2.5d", label: "2.5D", icon: Layers },
              { key: "3d", label: "3D", icon: Box },
            ] as const
          ).map((o) => (
            <button
              key={o.key}
              type="button"
              role="tab"
              aria-selected={mode === o.key}
              disabled={o.key === "3d" && !webgl}
              onClick={() => save(o.key)}
              title={o.key === "3d" && !webgl ? "3D needs WebGL, which this device doesn't have" : undefined}
              className={cn("flex items-center gap-1 rounded-full px-3 py-1 transition-colors disabled:opacity-40", mode === o.key ? "bg-white text-[#14503b] shadow" : "text-white/85 hover:bg-white/10")}
            >
              <o.icon className="h-3 w-3" />
              {o.label}
            </button>
          ))}
        </div>
      </div>
      {mode === "3d" ? (
        <div className="aspect-[4/3] w-full">
          <Garden3D sessions={sessions} />
        </div>
      ) : (
        <IsoGarden sessions={sessions} className="w-full" />
      )}
      {overlay}
    </div>
  );
}
