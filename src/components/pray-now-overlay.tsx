"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { PRAY_NOW_MESSAGES } from "@/lib/prayer-benefits";

const MESSAGE_INTERVAL_MS = 3200;
const PARTICLE_COUNT = 26;

function generateParticles() {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 4 + Math.random() * 3.5,
    scale: 0.5 + Math.random() * 1.1,
    drift: (Math.random() - 0.5) * 120,
    size: 4 + Math.random() * 8,
    key: i,
  }));
}

/** Per-mount particle layout, generated once via lazy state init (not during render). */
function useParticles() {
  const [particles] = useState(generateParticles);
  return particles;
}

export function PrayNowOverlay({ onDone }: { onDone: () => void }) {
  const particles = useParticles();
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setMessageIndex((i) => (i + 1) % PRAY_NOW_MESSAGES.length);
    }, MESSAGE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-emerald-950 via-emerald-900 to-neutral-950">
      <div className="pointer-events-none absolute inset-0">
        {particles.map((p) => (
          <span
            key={p.key}
            className="absolute bottom-0 rounded-full bg-emerald-300/70 shadow-[0_0_10px_2px_rgba(110,231,183,0.6)]"
            style={
              {
                left: `${p.left}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                animation: `pray-particle-rise ${p.duration}s ease-in ${p.delay}s infinite`,
                "--particle-scale": p.scale,
                "--particle-drift": `${p.drift}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="relative flex flex-col items-center gap-6 px-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
          <Sparkles className="h-7 w-7 text-emerald-200" />
        </div>

        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
          You are now in prayer
        </p>

        <p
          key={messageIndex}
          className="max-w-xs text-xl font-semibold leading-snug text-white"
          style={{ animation: `pray-message-fade ${MESSAGE_INTERVAL_MS}ms ease-in-out` }}
        >
          {PRAY_NOW_MESSAGES[messageIndex]}
        </p>
      </div>

      <button
        type="button"
        onClick={onDone}
        className="absolute bottom-10 rounded-full bg-white px-8 py-3 text-sm font-bold text-emerald-900 shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        Done
      </button>
    </div>
  );
}
