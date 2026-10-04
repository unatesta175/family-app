"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Blocks, Flame, Layers, Move3d, Pause, Play, RotateCcw } from "lucide-react";
import { SLOT_LABEL, buildTower, slotDateLabel, type TowerData } from "@/lib/habit-tower";
import { colorHex, formatNumber, tint } from "@/lib/habits";
import type { StatDay } from "@/lib/habit-insights";
import { useDarkMode } from "@/lib/use-dark-mode";
import { TowerCanvas } from "@/components/habit-tower/loader";
import { TowerFlat } from "@/components/habit-tower/tower-flat";
import type { HoverInfo } from "@/components/habit-tower/scene";
import { cn } from "@/lib/utils";

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** True once we know on the client whether 3D is available; assumes yes during server render. */
function useWebGL(): boolean {
  return useSyncExternalStore(
    () => () => {},
    hasWebGL,
    () => true
  );
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const q = window.matchMedia("(prefers-reduced-motion: reduce)");
      q.addEventListener("change", notify);
      return () => q.removeEventListener("change", notify);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}

const LEGEND = [
  { kind: "done", label: "Done", style: (hex: string) => ({ background: hex, boxShadow: `0 0 8px ${tint(hex, 0.7)}` }) },
  { kind: "partial", label: "Partly", style: (hex: string) => ({ background: tint(hex, 0.45) }) },
  { kind: "missed", label: "Missed", style: () => ({ background: "color-mix(in srgb, var(--h-bad) 20%, transparent)", border: "1px dashed var(--h-bad)" }) },
  { kind: "skipped", label: "Skipped", style: () => ({ background: "var(--h-surface-2)", border: "1px solid var(--h-border)" }) },
] as const;

/** The scene plus its chrome: stats, orbit controls, a month focus strip and a legend. */
function TowerStage({
  towers,
  focusMonth,
  onPickTower,
  hint,
}: {
  towers: { id: string; name: string; color: string; data: TowerData }[];
  focusMonth: string | null;
  onPickTower?: (id: string) => void;
  hint: string;
}) {
  const [dark] = useDarkMode();
  const reduced = usePrefersReducedMotion();
  const [spin, setSpin] = useState<boolean | null>(null); // null = follow the system preference
  const autoRotate = spin ?? !reduced;
  const [resetKey, setResetKey] = useState(0);
  const [intro, setIntro] = useState(true);
  const [hover, setHover] = useState<HoverInfo | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setIntro(false), 6000);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="relative h-[26rem] overflow-hidden rounded-3xl border border-h-border bg-gradient-to-b from-h-surface2 via-h-surface to-h-surface2 sm:h-[32rem]" style={{ touchAction: "none" }}>
      <TowerCanvas towers={towers} dark={dark} focusMonth={focusMonth} autoRotate={autoRotate} resetKey={resetKey} intro={intro && !reduced} onHover={setHover} onPickTower={onPickTower} />

      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        <div className="min-h-9 max-w-[70%] rounded-xl border border-h-border bg-h-surface/90 px-3 py-1.5 text-xs shadow-sm backdrop-blur">
          {hover ? (
            <>
              <p className="font-extrabold leading-tight">{hover.name}</p>
              <p className="font-medium text-h-muted">
                {slotDateLabel(hover.date)} · {SLOT_LABEL[hover.kind]}
                {hover.value > 0 && hover.kind !== "missed" ? ` · ${formatNumber(hover.value)}` : ""}
              </p>
            </>
          ) : (
            <p className="flex items-center gap-1.5 font-semibold text-h-muted">
              <Move3d className="h-3.5 w-3.5" />
              {hint}
            </p>
          )}
        </div>
        <div className="pointer-events-auto flex gap-1.5">
          <button type="button" aria-label={autoRotate ? "Stop rotating" : "Rotate automatically"} aria-pressed={autoRotate} onClick={() => setSpin(!autoRotate)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-h-border bg-h-surface/90 text-h-muted shadow-sm backdrop-blur hover:text-h-fg">
            {autoRotate ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button type="button" aria-label="Reset the view" onClick={() => setResetKey((k) => k + 1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-h-border bg-h-surface/90 text-h-muted shadow-sm backdrop-blur hover:text-h-fg">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** A single habit's tower, with the month focus strip and stats. */
export function HabitTowerPanel({
  name,
  color,
  days,
  startDate,
  today,
}: {
  name: string;
  color: string;
  days: StatDay[];
  startDate: string;
  today: string;
}) {
  const hex = colorHex(color);
  const data = useMemo(() => buildTower(days, startDate, today), [days, startDate, today]);
  const webgl = useWebGL();
  const [focus, setFocus] = useState<string | null>(null);
  const floorsNewestFirst = [...data.floors].reverse();
  const best = data.floors.reduce((a, f) => (f.done > a.done ? f : a), data.floors[0]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat icon={Blocks} value={String(data.totalDone)} label="Blocks built" hex={hex} />
        <Stat icon={Layers} value={String(data.floors.length)} label={data.floors.length === 1 ? "Floor" : "Floors"} hex={hex} />
        <Stat icon={Flame} value={String(data.streak)} label="Day streak" hex={hex} />
      </div>

      {webgl ? (
        <TowerStage towers={[{ id: "single", name, color: hex, data }]} focusMonth={focus} hint="Drag to orbit · scroll to zoom · tap a block" />
      ) : (
        <div className="h-card p-4">
          <TowerFlat data={data} color={color} />
        </div>
      )}

      {data.totalDone === 0 && <p className="rounded-xl bg-h-surface2 px-3 py-2 text-center text-xs font-semibold text-h-muted">Complete this habit and your first block lights up. Every completed day adds one block, and every month adds a floor.</p>}

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between px-1">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-h-muted">Floors</h3>
          {focus && (
            <button type="button" onClick={() => setFocus(null)} className="text-[11px] font-bold text-h-brand">
              Show all
            </button>
          )}
        </div>
        <div className="scrollbar-hide -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {floorsNewestFirst.map((f) => (
            <button
              key={f.month}
              type="button"
              aria-pressed={focus === f.month}
              onClick={() => setFocus(focus === f.month ? null : f.month)}
              style={focus === f.month ? { borderColor: hex, background: tint(hex, 0.14) } : undefined}
              className={cn("flex shrink-0 flex-col items-start rounded-xl border px-3 py-1.5 text-left transition-colors", focus === f.month ? "" : "border-h-border bg-h-surface hover:bg-h-surface2")}
            >
              <span className="text-xs font-extrabold">{f.label}</span>
              <span className="text-[11px] font-semibold tabular-nums text-h-muted">
                {f.done} of {f.due || f.daysInMonth} days
              </span>
            </button>
          ))}
        </div>
        {best && best.done > 0 && <p className="px-1 text-[11px] text-h-muted">Your tallest floor so far is {best.label} with {best.done} blocks.</p>}
        {data.hiddenMonths > 0 && <p className="px-1 text-[11px] text-h-muted">Showing the latest {data.floors.length} months. {data.hiddenMonths} older month{data.hiddenMonths === 1 ? "" : "s"} are kept in your statistics.</p>}
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 px-1 text-[11px] font-semibold text-h-muted">
        {LEGEND.map((l) => (
          <li key={l.kind} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-[3px]" style={l.style(hex)} />
            {l.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Several habits' towers side by side, a skyline you can orbit. Tap a tower to open its habit. */
export function TowerSkyline({
  habits,
  today,
}: {
  habits: { id: number; name: string; color: string; days: StatDay[]; startDate: string }[];
  today: string;
}) {
  const router = useRouter();
  const webgl = useWebGL();
  const towers = useMemo(() => habits.map((h) => ({ id: String(h.id), name: h.name, color: colorHex(h.color), data: buildTower(h.days, h.startDate, today) })), [habits, today]);

  if (!webgl) {
    return (
      <div className="flex flex-col gap-4">
        {habits.map((h, i) => (
          <div key={h.id} className="h-card flex flex-col gap-2 p-4">
            <button type="button" onClick={() => router.push(`/habits/${h.id}?tab=tower`)} className="text-left text-sm font-extrabold hover:text-h-brand">
              {h.name}
            </button>
            <TowerFlat data={towers[i].data} color={h.color} />
          </div>
        ))}
      </div>
    );
  }

  return <TowerStage towers={towers} focusMonth={null} onPickTower={(id) => router.push(`/habits/${id}?tab=tower`)} hint="Drag to orbit · tap a tower to open its habit" />;
}

function Stat({ icon: Icon, value, label, hex }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; value: string; label: string; hex: string }) {
  return (
    <div className="h-card flex items-center gap-3 p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: tint(hex, 0.16), color: hex }}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xl font-extrabold leading-none tabular-nums">{value}</p>
        <p className="mt-1 truncate text-[11px] font-semibold text-h-muted">{label}</p>
      </div>
    </div>
  );
}
