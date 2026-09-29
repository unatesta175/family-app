"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { Lantern3D } from "./loader";
import { cn } from "@/lib/utils";

type LanternState = "unlit" | "dimmed" | "flickering" | "glowing" | "bright" | "blazing";

function lanternState(quality: number, performedFraction: number, goldenFraction: number, missedCount: number): LanternState {
  if (missedCount > 0) return "dimmed";
  if (performedFraction <= 0) return "unlit";
  if (goldenFraction >= 0.8) return "blazing";
  if (quality >= 80) return "bright";
  if (quality >= 40) return "glowing";
  return "flickering";
}

const STATE_META: Record<LanternState, { label: string; badge: string; glow: string }> = {
  unlit: { label: "Unlit", badge: "bg-neutral-800 text-neutral-400", glow: "#525252" },
  dimmed: { label: "Dimmed", badge: "bg-neutral-700 text-neutral-300", glow: "#6b7280" },
  flickering: { label: "Flickering", badge: "bg-amber-950 text-amber-400", glow: "#b45309" },
  glowing: { label: "Glowing", badge: "bg-amber-900 text-amber-200", glow: "#d97706" },
  bright: { label: "Bright", badge: "bg-amber-700 text-amber-50", glow: "#f59e0b" },
  blazing: { label: "Blazing gold", badge: "bg-gradient-to-r from-amber-300 to-yellow-200 text-neutral-900", glow: "#ffd23f" },
};

export function LanternCard({
  quality,
  performedFraction,
  goldenFraction,
  missedCount,
}: {
  quality: number;
  performedFraction: number;
  goldenFraction: number;
  missedCount: number;
}) {
  const state = lanternState(quality, performedFraction, goldenFraction, missedCount);
  const meta = STATE_META[state];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-800 p-4 shadow-lg shadow-black/20"
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-8 -z-10 rounded-full blur-3xl"
        style={{ backgroundColor: meta.glow }}
        animate={{ opacity: [0.12, 0.28, 0.12], scale: [0.92, 1.05, 0.92] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
            <Flame className="h-3.5 w-3.5 text-amber-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Today&apos;s light</p>
            <p className="text-[11px] text-neutral-400">Relights fresh at Fajr</p>
          </div>
        </div>
        <motion.span
          key={state}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide", meta.badge)}
        >
          {meta.label}
        </motion.span>
      </div>

      <Lantern3D
        quality={quality}
        performedFraction={performedFraction}
        goldenFraction={goldenFraction}
        missedCount={missedCount}
      />

      <p className="mt-3 text-center text-[11px] leading-relaxed text-neutral-400">
        Glows brighter with every prayer on time and in jamaah &mdash; a missed prayer dims it for the
        whole day.
      </p>
    </motion.div>
  );
}
