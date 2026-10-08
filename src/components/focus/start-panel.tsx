"use client";

import { useEffect, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Box, Check, Coffee, Layers, Minus, Pause, Play, Plus } from "lucide-react";
import { startFocusAction } from "@/lib/focus-actions";
import { FOCUS_SPECIES, MAX_MINUTES, MIN_MINUTES, POMODORO_PRESETS, SPECIES_LABEL, TREE_TIERS, formatFocus, segmentsFor, tierInfo, treeTier, type FocusMode, type FocusSpecies, type PomodoroConfig } from "@/lib/focus";
import { FocusTree } from "@/components/focus/focus-tree";
import { Switch } from "@/components/habits/ui/switch";
import { useGardenMode } from "@/components/focus/garden-view";

const Tree3DPreview = dynamic(() => import("@/components/focus/tree-3d-preview"), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white/70">Loading 3D…</div>,
});
import { colorHex, tint } from "@/lib/habits";
import { cn } from "@/lib/utils";

export type TimerHabit = { id: number; name: string; color: string };

const PRESETS = [15, 25, 45, 60, 90, 120];

/** A small −/+ control for a whole-number value (Pomodoro focus, break and cycle counts). */
function Stepper({
  label,
  value,
  unit,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-h-surface px-3 py-2">
      <span className="text-xs font-bold text-h-muted">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(clamp(value - step))}
          disabled={value <= min}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-h-surface2 text-h-fg disabled:opacity-40"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="min-w-14 text-center text-sm font-extrabold tabular-nums">
          {value} <span className="text-[11px] font-bold text-h-muted">{unit}</span>
        </span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(clamp(value + step))}
          disabled={value >= max}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-h-brand-soft text-h-brand disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

/**
 * Plant a tree: a forest hero with a tree growing on a patch of ground, and a frosted sheet below to
 * choose the length, the style of session, what it is for and which tree to plant.
 */
export function StartPanel({ habits, defaultHabitId }: { habits: TimerHabit[]; defaultHabitId: number | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [minutes, setMinutes] = useState(30);
  const [pomodoro, setPomodoro] = useState(false);
  // The chosen rhythm: a preset key, or "custom" with its own focus/break lengths. `cycles` is how
  // many focus blocks to run, so a Pomodoro session grows that many trees.
  const [presetKey, setPresetKey] = useState("classic");
  const [cycles, setCycles] = useState(4);
  const [focusMin, setFocusMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [species, setSpecies] = useState<FocusSpecies>("oak");
  const [habitId, setHabitId] = useState<number | null>(defaultHabitId && habits.some((h) => h.id === defaultHabitId) ? defaultHabitId : null);
  const [error, setError] = useState<string | null>(null);
  // The hero tree grows and starts over, so the screen shows what a session does. Drag the slider to
  // scrub through the growth, or tap play to let it run.
  const [demo, setDemo] = useState(0.45);
  const [playing, setPlaying] = useState(true);
  const { mode: view, setMode: setView, webgl } = useGardenMode();

  useEffect(() => {
    if (!playing || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setDemo((d) => (d >= 1 ? 0.05 : Math.min(1, d + 0.04))), 700);
    return () => window.clearInterval(t);
  }, [playing]);

  const mode: FocusMode = pomodoro ? "pomodoro" : "single";
  const isCustom = presetKey === "custom";
  // The rhythm the session will run at. A preset fixes the lengths; Custom uses the steppers (no
  // distinct long break).
  const cfg: PomodoroConfig = (() => {
    if (isCustom) return { focus: focusMin * 60, short: breakMin * 60, long: breakMin * 60, every: 99 };
    const p = POMODORO_PRESETS.find((x) => x.key === presetKey) ?? POMODORO_PRESETS[0];
    return { focus: p.focus, short: p.short, long: p.long, every: p.every };
  })();
  // In Pomodoro mode the session is `cycles` focus blocks; single mode uses the slider's minutes.
  const pomoFocusSeconds = cfg.focus * cycles;
  const planned = pomodoro ? pomoFocusSeconds : minutes * 60;
  const tooLong = pomodoro && pomoFocusSeconds > 12 * 60 * 60;
  // The tree preview takes the block's tier in Pomodoro mode (each block is its own tree).
  const tier = treeTier(pomodoro ? cfg.focus : minutes * 60);
  const set = (n: number) => setMinutes(Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, Math.round(n / 5) * 5)));
  const segs = segmentsFor(planned, mode, cfg);
  const blocks = segs.filter((s) => s.kind === "focus").length;
  const breaks = segs.length - blocks;
  const wall = segs.reduce((n, s) => n + s.seconds, 0);
  const pct = ((minutes - MIN_MINUTES) / (MAX_MINUTES - MIN_MINUTES)) * 100;

  function choosePreset(key: string) {
    setPresetKey(key);
    const p = POMODORO_PRESETS.find((x) => x.key === key);
    if (p) {
      setCycles(p.cycles);
      setFocusMin(Math.round(p.focus / 60));
      setBreakMin(Math.round(p.short / 60));
    }
  }

  function start() {
    setError(null);
    // Ask for notification permission on this tap, so the end of the session can ping you.
    if (typeof Notification !== "undefined" && Notification.permission === "default") void Notification.requestPermission();
    startTransition(async () => {
      const res = await startFocusAction({
        habitId,
        minutes: pomodoro ? Math.round(cfg.focus / 60) : minutes,
        mode,
        species,
        pomodoro: pomodoro
          ? { focusMin: Math.round(cfg.focus / 60), breakMin: Math.round(cfg.short / 60), longBreakMin: Math.round(cfg.long / 60), every: cfg.every, cycles }
          : undefined,
      });
      if (!res.ok) return setError(res.error);
      router.push("/focus/session");
    });
  }

  return (
    <div className="overflow-hidden rounded-[2rem] bg-gradient-to-b from-[#38b583] via-[#1f9468] to-[#0d6a4e] shadow-lg">
      {/* hero */}
      <div className="relative flex h-60 items-end justify-center overflow-hidden">
        <div className="pointer-events-none absolute -left-10 top-4 h-40 w-40 rounded-full bg-lime-200/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-8 top-10 h-44 w-44 rounded-full bg-emerald-100/20 blur-3xl" />
        {/* the flat island belongs to the 2.5D view; the 3D scene brings its own ground */}
        {view === "3d" ? (
          <div className="pointer-events-none absolute bottom-10 h-28 w-60 rounded-[50%] bg-lime-200/25 blur-2xl" />
        ) : (
          <>
            <div className="pointer-events-none absolute bottom-6 h-24 w-64 rounded-[50%] bg-lime-200/70 blur-xl" />
            <div className="pointer-events-none absolute bottom-7 h-16 w-52 rounded-[50%] bg-lime-300/60" />
          </>
        )}
        {view === "3d" ? (
          <div className="absolute inset-x-0 bottom-9 top-14 z-10">
            <Tree3DPreview progress={demo} species={species} tier={tier} />
          </div>
        ) : (
          <FocusTree progress={demo} species={species} tier={tier} className="relative z-10 mb-3 h-52 w-44" />
        )}
        <p className="absolute left-5 top-5 text-sm font-bold text-white/90">Plant a tree</p>
        <p className="absolute right-5 top-5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">{SPECIES_LABEL[species]} · {tierInfo(tier).name}</p>
        <div className="absolute left-5 top-12 z-20 flex rounded-full bg-black/25 p-0.5 text-[11px] font-bold text-white backdrop-blur-sm" role="tablist" aria-label="Tree view">
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
              aria-selected={view === o.key}
              disabled={o.key === "3d" && !webgl}
              onClick={() => setView(o.key)}
              className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors disabled:opacity-40", view === o.key ? "bg-white text-[#14503b] shadow" : "text-white/85 hover:bg-white/10")}
            >
              <o.icon className="h-3 w-3" />
              {o.label}
            </button>
          ))}
        </div>
        <div className="absolute bottom-3 left-5 flex gap-1" aria-hidden>
          {TREE_TIERS.map((t) => (
            <span key={t.tier} className={cn("h-1.5 w-5 rounded-full", t.tier <= tier ? "bg-white" : "bg-white/30")} />
          ))}
        </div>
      </div>

      {/* the sheet */}
      <div className="-mt-2 rounded-t-[2rem] bg-white/90 p-5 text-[#0d1f16] backdrop-blur-xl [.dark_&]:bg-[#0e1c14]/92 [.dark_&]:text-[#e6f4ea]">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-h-muted">{pomodoro ? "Each focus block" : "Timer"}</p>
          <p className="mt-1 text-5xl font-extrabold leading-none tabular-nums tracking-tight">
            {pomodoro ? Math.round(cfg.focus / 60) : minutes}
            <span className="ml-1.5 text-xl font-bold text-h-muted">min</span>
          </p>
          {pomodoro && (
            <p className="mt-1 text-xs font-semibold text-h-muted">
              {cycles} block{cycles === 1 ? "" : "s"} → <span className="font-extrabold text-h-brand">{cycles} tree{cycles === 1 ? "" : "s"}</span> · {formatFocus(wall)} on the clock
            </p>
          )}
        </div>

        {/* a ruler to slide along (single sessions choose a total length here) */}
        {!pomodoro && (
        <>
        <div className="relative mt-5 h-10">
          <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between px-1" aria-hidden>
            {Array.from({ length: 36 }, (_, i) => (
              <span key={i} className={cn("w-px rounded-full bg-h-fg/25", i % 6 === 0 ? "h-5" : "h-3")} />
            ))}
          </div>
          <div className="pointer-events-none absolute top-1/2 h-9 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-h-brand shadow" style={{ left: `calc(${pct}% * 0.96 + 2%)` }} />
          <input
            type="range"
            min={MIN_MINUTES}
            max={MAX_MINUTES}
            step={5}
            value={minutes}
            onChange={(e) => set(Number(e.target.value))}
            aria-label="Session length in minutes"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
        <div className="mt-1 flex justify-between px-1 text-[10px] font-bold text-h-muted">
          <span>{MIN_MINUTES} min</span>
          <span>{MAX_MINUTES / 60} h</span>
        </div>
        <p className="mt-2 text-center text-xs font-semibold text-h-brand">{tierInfo(tier).name}: {tierInfo(tier).blurb}</p>
        </>
        )}

        {/* watch it grow */}
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-h-surface2/80 px-3 py-2.5">
          <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause the preview" : "Play the preview"} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-h-brand text-h-brand-fg">
            {playing ? <Pause className="h-3.5 w-3.5" fill="currentColor" /> : <Play className="h-3.5 w-3.5" fill="currentColor" />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(demo * 100)}
            onChange={(e) => {
              setPlaying(false);
              setDemo(Number(e.target.value) / 100);
            }}
            aria-label="How far the tree has grown"
            className="min-w-0 flex-1 accent-[var(--h-brand)]"
          />
          <span className="w-9 shrink-0 text-right text-xs font-extrabold tabular-nums text-h-muted">{Math.round(demo * 100)}%</span>
        </div>
        {!pomodoro && (
          <>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              {TREE_TIERS.map((t) => (
                <button
                  key={t.tier}
                  type="button"
                  onClick={() => set(t.minMinutes)}
                  className={cn("rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors", tier === t.tier ? "border-h-brand bg-h-brand-soft text-h-brand" : "border-h-border text-h-muted hover:text-h-fg")}
                >
                  {t.minMinutes}m · {t.name.replace(" tree", "")}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => set(m)}
                  className={cn("rounded-full px-3 py-1 text-xs font-bold transition-colors", minutes === m ? "bg-h-brand text-h-brand-fg" : "bg-h-surface2 text-h-muted hover:text-h-fg")}
                >
                  {formatFocus(m * 60)}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Pomodoro */}
        <div className="mt-4 rounded-2xl bg-h-surface2/80 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-h-brand-soft text-h-brand">
              <Coffee className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold leading-tight">Pomodoro breaks</p>
              <p className="mt-0.5 text-xs leading-snug text-h-muted">
                {!pomodoro
                  ? "One unbroken stretch. Turn on to work in blocks with rest breaks — each block grows its own tree."
                  : `${blocks} block${blocks === 1 ? "" : "s"} and ${breaks} break${breaks === 1 ? "" : "s"}. You'll grow ${blocks} tree${blocks === 1 ? "" : "s"}, resting during the breaks.`}
              </p>
            </div>
            <Switch checked={pomodoro} onCheckedChange={setPomodoro} aria-label="Pomodoro breaks" />
          </div>

          {pomodoro && (
            <div className="mt-4 flex flex-col gap-3">
              {/* Research-backed rhythms, plus a custom one */}
              <div className="grid grid-cols-1 gap-1.5">
                {POMODORO_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => choosePreset(p.key)}
                    aria-pressed={presetKey === p.key}
                    className={cn(
                      "flex items-start gap-2 rounded-xl border px-3 py-2 text-left transition-colors",
                      presetKey === p.key ? "border-h-brand bg-h-brand-soft" : "border-h-border hover:border-h-brand/50"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold leading-tight">{p.name}</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-h-muted">{p.blurb}</p>
                    </div>
                    {presetKey === p.key && <Check className="mt-0.5 h-4 w-4 shrink-0 text-h-brand" strokeWidth={3} />}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPresetKey("custom")}
                  aria-pressed={isCustom}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left text-xs font-extrabold transition-colors",
                    isCustom ? "border-h-brand bg-h-brand-soft" : "border-h-border hover:border-h-brand/50"
                  )}
                >
                  Custom
                </button>
              </div>

              {isCustom && (
                <div className="grid grid-cols-2 gap-2">
                  <Stepper label="Focus" value={focusMin} unit="min" min={MIN_MINUTES} max={120} step={5} onChange={setFocusMin} />
                  <Stepper label="Break" value={breakMin} unit="min" min={1} max={60} step={1} onChange={setBreakMin} />
                </div>
              )}

              <Stepper label="Cycles" value={cycles} unit={cycles === 1 ? "block" : "blocks"} min={1} max={10} step={1} onChange={setCycles} />

              {tooLong && <p className="text-[11px] font-bold text-amber-600 [.dark_&]:text-amber-300">That&apos;s a very long day of focus — try fewer cycles or shorter blocks.</p>}
            </div>
          )}
        </div>

        {/* Tag */}
        {habits.length > 0 && (
          <div className="mt-4">
            <p className="mb-1.5 text-xs font-extrabold uppercase tracking-wider text-h-muted">Focusing on</p>
            <div className="scrollbar-hide -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              <button
                type="button"
                onClick={() => setHabitId(null)}
                className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold", habitId === null ? "border-h-brand bg-h-brand-soft text-h-brand" : "border-h-border text-h-muted hover:text-h-fg")}
              >
                Anything
              </button>
              {habits.map((h) => {
                const hex = colorHex(h.color);
                const on = habitId === h.id;
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setHabitId(h.id)}
                    style={on ? { background: tint(hex, 0.16), borderColor: hex, color: hex } : undefined}
                    className={cn("flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold", !on && "border-h-border text-h-muted hover:text-h-fg")}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: hex }} />
                    {h.name}
                  </button>
                );
              })}
            </div>
            {habitId !== null ? (
              <p className="mt-1 text-[11px] text-h-muted">When the tree is grown, these minutes are added to the habit&apos;s day.</p>
            ) : (
              <p className="mt-1 text-[11px] font-semibold text-amber-600 [.dark_&]:text-amber-300">Not linked to a habit, so the time won&apos;t be added to one. Pick a habit above to count it.</p>
            )}
          </div>
        )}

        {/* Tree */}
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-extrabold uppercase tracking-wider text-h-muted">Tree</p>
          <div className="grid grid-cols-4 gap-2">
            {FOCUS_SPECIES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpecies(s)}
                aria-pressed={species === s}
                className={cn("relative flex flex-col items-center rounded-2xl border-2 bg-gradient-to-b from-lime-100/70 to-emerald-100/70 px-1 pb-1.5 pt-2 transition-colors [.dark_&]:from-[#17301f] [.dark_&]:to-[#10261a]", species === s ? "border-h-brand" : "border-transparent hover:border-h-border")}
              >
                <FocusTree progress={1} species={s} tier={tier} animate={false} className="h-14 w-full" />
                <span className="text-[11px] font-bold">{SPECIES_LABEL[s]}</span>
                {species === s && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-h-brand text-h-brand-fg">
                    <Check className="h-3 w-3" strokeWidth={3.5} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="mt-4 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-bold text-red-600">{error}</p>}

        <button
          type="button"
          onClick={start}
          disabled={pending || tooLong}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-h-brand py-4 text-base font-extrabold text-h-brand-fg shadow-md transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          <Play className="h-5 w-5" fill="currentColor" />
          Start focus
        </button>
        <p className="mt-2 text-center text-[11px] text-h-muted">Give up after the first 30 seconds and the tree withers. Finish and it joins your grove.</p>
      </div>
    </div>
  );
}
