"use client";

import { useEffect, useState } from "react";
import { Sparkle, Sparkles } from "lucide-react";
import { PRAY_NOW_MESSAGES } from "@/lib/prayer-benefits";

const MESSAGE_INTERVAL_MS = 4600;
const MOTE_COUNT = 16;
const SPARK_COUNT = 22;

const SPARK_COLORS = ["#fef3c7", "#d1fae5", "#fde68a", "#a7f3d0"];

/** Soft, blurred bokeh-style motes: background ambience, like dust drifting in a beam of light. */
function generateMotes() {
  return Array.from({ length: MOTE_COUNT }, (_, i) => {
    const duration = 10 + Math.random() * 7;
    return {
      key: i,
      left: Math.random() * 100,
      // Negative delay starts the animation already mid-cycle, so on open the motes are scattered
      // at random heights/opacities instead of every particle launching together from the bottom.
      delay: -Math.random() * duration,
      duration,
      scale: 0.6 + Math.random() * 1,
      drift: (Math.random() - 0.5) * 90,
      size: 14 + Math.random() * 30,
      opacity: 0.15 + Math.random() * 0.25,
    };
  });
}

/** Small, sharply-defined sparkle icons: the foreground detail layer, catching light as they rise. */
function generateSparks() {
  return Array.from({ length: SPARK_COUNT }, (_, i) => {
    const duration = 8 + Math.random() * 5;
    return {
      key: i,
      left: Math.random() * 100,
      delay: -Math.random() * duration,
      duration,
      scale: 0.45 + Math.random() * 0.75,
      drift: (Math.random() - 0.5) * 140,
      size: 7 + Math.random() * 11,
      opacity: 0.55 + Math.random() * 0.4,
      color: SPARK_COLORS[i % SPARK_COLORS.length],
      twinkleDuration: 1.8 + Math.random() * 1.6,
    };
  });
}

function useLazy<T>(factory: () => T): T {
  const [value] = useState(factory);
  return value;
}

export function PrayNowOverlay({ onDone }: { onDone: () => void }) {
  const motes = useLazy(generateMotes);
  const sparks = useLazy(generateSparks);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setMessageIndex((i) => (i + 1) % PRAY_NOW_MESSAGES.length);
    }, MESSAGE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-emerald-950 via-emerald-900 to-neutral-950">
      {/* Slow-turning soft light rays behind everything, like dawn light through a window. */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[140vmax] w-[140vmax] -translate-x-1/2 -translate-y-1/2 opacity-[0.07]"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, #fef3c7 8deg, transparent 22deg, transparent 160deg, #a7f3d0 172deg, transparent 190deg, transparent 360deg)",
          animation: "pray-rays-turn 70s linear infinite",
        }}
      />

      {/* Background layer: soft blurred motes drifting upward, low detail, pure ambience. */}
      <div className="pointer-events-none absolute inset-0">
        {motes.map((m) => (
          <span
            key={m.key}
            className="absolute bottom-0 rounded-full bg-emerald-100 blur-md"
            style={
              {
                left: `${m.left}%`,
                width: `${m.size}px`,
                height: `${m.size}px`,
                animation: `pray-mote-drift ${m.duration}s ease-in-out ${m.delay}s infinite`,
                "--particle-scale": m.scale,
                "--particle-drift": `${m.drift}px`,
                "--mote-opacity": m.opacity,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Foreground layer: sharply-defined sparkle particles, the detail layer riding above the motes. */}
      <div className="pointer-events-none absolute inset-0">
        {sparks.map((s) => (
          <Sparkle
            key={s.key}
            className="absolute bottom-0 fill-current"
            style={
              {
                left: `${s.left}%`,
                width: `${s.size}px`,
                height: `${s.size}px`,
                color: s.color,
                opacity: s.opacity,
                animation: `pray-spark-rise ${s.duration}s ease-out ${s.delay}s infinite, pray-spark-twinkle ${s.twinkleDuration}s ease-in-out ${s.delay}s infinite`,
                "--particle-scale": s.scale,
                "--particle-drift": `${s.drift}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="relative flex flex-col items-center gap-8 px-8 text-center">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div
            className="absolute inset-0 rounded-full bg-emerald-300/40 blur-xl"
            style={{ animation: "pray-glow-breathe 4.6s ease-in-out infinite" }}
          />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
            <Sparkles className="h-7 w-7 text-emerald-200" />
          </div>
        </div>

        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-300/70">
          You are now in prayer
        </p>

        <div className="relative flex min-h-[6.5rem] w-full max-w-xs items-center justify-center">
          <div
            className="absolute inset-0 rounded-full bg-emerald-400/10 blur-2xl"
            style={{ animation: "pray-glow-breathe 4.6s ease-in-out infinite" }}
          />
          <p
            key={messageIndex}
            className="relative text-2xl font-medium leading-snug text-white/95"
            style={{
              animation: `pray-message-fade ${MESSAGE_INTERVAL_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
              fontFamily: "var(--font-sans)",
            }}
          >
            {PRAY_NOW_MESSAGES[messageIndex]}
          </p>
        </div>
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
