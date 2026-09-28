"use client";

import { useState } from "react";
import { Sparkle, Star } from "lucide-react";

const SHAPES = [Sparkle, Star] as const;
const COLORS = ["#fbbf24", "#34d399", "#f59e0b", "#6ee7b7"];

type BurstParticle = {
  key: number;
  x: number;
  y: number;
  scale: number;
  spin: number;
  delay: number;
  duration: number;
  size: number;
  Shape: (typeof SHAPES)[number];
  color: string;
};

function generateBurst(count: number, minDistance: number, distanceRange: number, sizeBoost: number): BurstParticle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = minDistance + Math.random() * distanceRange;
    return {
      key: i,
      x: Math.cos(angle) * distance,
      // Bias upward so the burst reads as rising/celebratory rather than falling.
      y: Math.sin(angle) * distance - 60,
      scale: 0.5 + Math.random() * 0.9,
      spin: (Math.random() - 0.5) * 540,
      delay: Math.random() * 0.35,
      duration: 1.1 + Math.random() * 0.9,
      size: (10 + Math.random() * 14) * sizeBoost,
      Shape: SHAPES[i % SHAPES.length],
      color: COLORS[i % COLORS.length],
    };
  });
}

/** 0-100 prayer quality (see STATUS_QUALITY) mapped to a 0.24-1 intensity multiplier. */
function intensityFor(quality: number) {
  return Math.max(0.24, Math.min(1, quality / 100));
}

/**
 * A celebratory particle burst anchored to the center of the viewport (not clipped to the modal
 * sheet), so it visually spills out past the dialog's edges. Its scale reflects the prayer's
 * quality: On Time + Jamaah gets the fullest, most radiant burst (plus a second staggered wave),
 * while a lower-reward status like Qada gets a smaller, quieter one. Purely decorative:
 * pointer-events are disabled throughout so it never blocks the modal underneath.
 */
export function BenefitParticles({ quality }: { quality: number }) {
  const intensity = intensityFor(quality);
  const grand = quality >= 95;

  const count = Math.round(16 + intensity * 34);
  const minDistance = 60 + intensity * 70;
  const distanceRange = 120 + intensity * 220;
  const sizeBoost = 0.85 + intensity * 0.5;
  const glowSize = 140 + intensity * 170;
  const glowOpacity = 0.3 + intensity * 0.35;

  const [wave1] = useState(() => generateBurst(count, minDistance, distanceRange, sizeBoost));
  const [wave2] = useState(() =>
    grand ? generateBurst(Math.round(count * 0.6), minDistance * 1.3, distanceRange * 1.2, sizeBoost * 0.9) : []
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[55] overflow-hidden">
      <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2">
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300 blur-3xl"
          style={
            {
              width: glowSize,
              height: glowSize,
              opacity: glowOpacity,
              animation: "benefit-glow-bloom 1.4s ease-out forwards",
            } as React.CSSProperties
          }
        />
        {grand && (
          <div
            className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300/30 blur-3xl"
            style={{ animation: "pray-glow-breathe 2.6s ease-in-out 0.3s infinite" }}
          />
        )}

        {wave1.map((p) => (
          <p.Shape
            key={`w1-${p.key}`}
            className="absolute left-1/2 top-1/2"
            style={
              {
                width: p.size,
                height: p.size,
                color: p.color,
                fill: p.color,
                marginLeft: -p.size / 2,
                marginTop: -p.size / 2,
                "--burst-x": `${p.x}px`,
                "--burst-y": `${p.y}px`,
                "--burst-scale": p.scale,
                "--burst-spin": `${p.spin}deg`,
                animation: `benefit-particle-burst ${p.duration}s cubic-bezier(0.2, 0.7, 0.3, 1) ${p.delay}s forwards, benefit-sparkle-twinkle 0.6s ease-in-out ${p.delay}s infinite`,
              } as React.CSSProperties
            }
          />
        ))}

        {/* Second staggered wave, only for the top tier (On Time + Jamaah / Excused): a bigger,
            slightly delayed echo of the first burst, so the grandest reward visibly reads as more
            than just "more of the same" particles. */}
        {wave2.map((p) => (
          <p.Shape
            key={`w2-${p.key}`}
            className="absolute left-1/2 top-1/2"
            style={
              {
                width: p.size,
                height: p.size,
                color: p.color,
                fill: p.color,
                marginLeft: -p.size / 2,
                marginTop: -p.size / 2,
                "--burst-x": `${p.x}px`,
                "--burst-y": `${p.y}px`,
                "--burst-scale": p.scale,
                "--burst-spin": `${p.spin}deg`,
                animation: `benefit-particle-burst ${p.duration}s cubic-bezier(0.2, 0.7, 0.3, 1) ${p.delay + 0.3}s forwards, benefit-sparkle-twinkle 0.6s ease-in-out ${p.delay + 0.3}s infinite`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
