"use client";

import { useState } from "react";
import { Sparkle } from "lucide-react";

const RING_COUNTS = [8, 12] as const;
const RING_RADII = [58, 100] as const;
const RING_SIZES = [9, 13] as const;
const RING_DURATIONS = [18, 28] as const;
const COLORS = ["#f59e0b", "#34d399", "#fbbf24", "#6ee7b7"];
const RIPPLE_DELAYS = [0, 1.1, 2.2];

type AuraParticle = {
  key: string;
  ring: number;
  x: number;
  y: number;
  size: number;
  color: string;
  pulseDelay: number;
  pulseDuration: number;
};

/**
 * Positions are precomputed with plain trigonometry (not the rotate+translate "clock hand" trick),
 * so each particle's placement is a single unambiguous translate() — nothing to get subtly wrong
 * by stacking transforms with different origins. The whole ring then spins via a separate wrapper.
 */
function generateAura(): AuraParticle[] {
  const particles: AuraParticle[] = [];
  RING_COUNTS.forEach((count, ring) => {
    const radius = RING_RADII[ring];
    for (let i = 0; i < count; i++) {
      const angle = ((360 / count) * i * Math.PI) / 180;
      particles.push({
        key: `${ring}-${i}`,
        ring,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        size: RING_SIZES[ring],
        color: COLORS[(ring + i) % COLORS.length],
        pulseDelay: -Math.random() * 3,
        pulseDuration: 1.8 + Math.random() * 1.4,
      });
    }
  });
  return particles;
}

/**
 * A continuous glowing halo (not a one-shot burst), meant to sit behind a dialog's icon for as
 * long as it's open, signaling weight and grandeur without demanding attention the way a burst
 * does. Must be placed inside a `relative` wrapper sized to the thing it should halo (e.g. an icon
 * badge) — it anchors to that wrapper's center, not the viewport. Nothing here has pointer-events,
 * and nothing in its ancestor chain should clip overflow, so the rings visibly spill past the
 * badge, the card, and the modal sheet itself.
 */
export function VirtueAura() {
  const [particles] = useState(generateAura);

  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2">
      {/* Soft glow blooms behind everything. */}
      <div
        className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300/35 blur-2xl"
        style={{ animation: "pray-glow-breathe 3.4s ease-in-out infinite" }}
      />
      <div
        className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300/40 blur-xl"
        style={{ animation: "pray-glow-breathe 2.8s ease-in-out 0.4s infinite" }}
      />

      {/* Expanding ripple rings, staggered so one is always mid-radiate. */}
      {RIPPLE_DELAYS.map((delay) => (
        <div
          key={delay}
          className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-300/70"
          style={{ animation: `virtue-aura-ripple 3.3s ease-out ${delay}s infinite` }}
        />
      ))}

      {/* Two counter-rotating rings of sparkles orbiting well outside the badge. */}
      {RING_RADII.map((radius, ring) => (
        <div
          key={radius}
          className="absolute left-1/2 top-1/2 h-0 w-0"
          style={{
            animation: `virtue-aura-orbit ${RING_DURATIONS[ring]}s linear infinite${ring % 2 ? " reverse" : ""}`,
          }}
        >
          {particles
            .filter((p) => p.ring === ring)
            .map((p) => (
              // Position (static translate) lives on this wrapper; the pulse animation lives on
              // the icon inside it. A CSS animation replaces the whole `transform` property, so
              // putting both the static offset and the animated scale on the same element would
              // make the animation wipe out the position every frame, collapsing every particle
              // back to the center. Splitting them across parent/child keeps the two independent.
              <span
                key={p.key}
                className="absolute left-0 top-0 block"
                style={{ transform: `translate(${p.x - p.size / 2}px, ${p.y - p.size / 2}px)` }}
              >
                <Sparkle
                  className="fill-current drop-shadow-[0_0_4px_rgba(251,191,36,0.75)]"
                  style={
                    {
                      width: p.size,
                      height: p.size,
                      color: p.color,
                      animation: `virtue-aura-pulse ${p.pulseDuration}s ease-in-out ${p.pulseDelay}s infinite`,
                    } as React.CSSProperties
                  }
                />
              </span>
            ))}
        </div>
      ))}
    </div>
  );
}
