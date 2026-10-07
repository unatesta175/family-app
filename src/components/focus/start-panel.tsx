"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Coffee, Minus, Play, Plus, Timer } from "lucide-react";
import { startFocusAction } from "@/lib/focus-actions";
import { FOCUS_SPECIES, MAX_MINUTES, MIN_MINUTES, SPECIES_LABEL, formatFocus, segmentsFor, type FocusMode, type FocusSpecies } from "@/lib/focus";
import { FocusTree } from "@/components/focus/focus-tree";
import { colorHex, tint } from "@/lib/habits";
import { cn } from "@/lib/utils";

export type TimerHabit = { id: number; name: string; color: string };

const PRESETS = [15, 25, 45, 60, 90, 120];

/** Pick what you are focusing on, for how long, and which tree to plant. */
export function StartPanel({ habits, defaultHabitId }: { habits: TimerHabit[]; defaultHabitId: number | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [minutes, setMinutes] = useState(25);
  const [mode, setMode] = useState<FocusMode>("single");
  const [species, setSpecies] = useState<FocusSpecies>("oak");
  const [habitId, setHabitId] = useState<number | null>(defaultHabitId && habits.some((h) => h.id === defaultHabitId) ? defaultHabitId : null);
  const [error, setError] = useState<string | null>(null);

  const set = (n: number) => setMinutes(Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, Math.round(n))));
  const segs = segmentsFor(minutes * 60, mode);
  const blocks = segs.filter((s) => s.kind === "focus").length;
  const breaks = segs.length - blocks;
  const wall = segs.reduce((n, s) => n + s.seconds, 0);

  function start() {
    setError(null);
    // Ask for notification permission on this tap, so the end of the session can ping you.
    if (typeof Notification !== "undefined" && Notification.permission === "default") void Notification.requestPermission();
    startTransition(async () => {
      const res = await startFocusAction({ habitId, minutes, mode, species });
      if (!res.ok) return setError(res.error);
      router.push("/focus/session");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Length */}
      <section className="h-card flex flex-col items-center gap-4 p-5">
        <div className="flex items-center gap-4">
          <button type="button" aria-label="Shorter" onClick={() => set(minutes - 5)} className="flex h-11 w-11 items-center justify-center rounded-full bg-h-surface2 text-h-fg hover:bg-h-brand-soft">
            <Minus className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-6xl font-extrabold leading-none tabular-nums tracking-tight">{minutes}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-h-muted">minutes</p>
          </div>
          <button type="button" aria-label="Longer" onClick={() => set(minutes + 5)} className="flex h-11 w-11 items-center justify-center rounded-full bg-h-brand-soft text-h-brand hover:opacity-80">
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <input
          type="range"
          min={MIN_MINUTES}
          max={MAX_MINUTES}
          step={5}
          value={minutes}
          onChange={(e) => set(Number(e.target.value))}
          aria-label="Session length in minutes"
          className="w-full accent-[var(--h-brand)]"
        />
        <div className="flex w-full justify-between text-[10px] font-bold text-h-muted">
          <span>{MIN_MINUTES} min</span>
          <span>{MAX_MINUTES / 60} h</span>
        </div>
        <div className="flex flex-wrap justify-center gap-1.5">
          {PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => set(m)}
              className={cn("rounded-full border px-3 py-1 text-xs font-bold transition-colors", minutes === m ? "border-h-brand bg-h-brand text-h-brand-fg" : "border-h-border bg-h-surface text-h-muted hover:text-h-fg")}
            >
              {formatFocus(m * 60)}
            </button>
          ))}
        </div>
      </section>

      {/* Mode */}
      <section className="h-card flex flex-col gap-3 p-4">
        <div role="tablist" aria-label="Session type" className="grid grid-cols-2 gap-1 rounded-xl bg-h-surface2 p-1">
          {(
            [
              { key: "single", label: "One stretch", icon: Timer },
              { key: "pomodoro", label: "Pomodoro", icon: Coffee },
            ] as const
          ).map((o) => (
            <button
              key={o.key}
              type="button"
              role="tab"
              aria-selected={mode === o.key}
              onClick={() => setMode(o.key)}
              className={cn("flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all", mode === o.key ? "bg-h-surface text-h-fg shadow-sm" : "text-h-muted hover:text-h-fg")}
            >
              <o.icon className="h-3.5 w-3.5" />
              {o.label}
            </button>
          ))}
        </div>
        <p className="text-xs leading-snug text-h-muted">
          {mode === "single"
            ? "One unbroken block of focus. The tree grows the whole way."
            : blocks === 1
              ? "Under about 30 minutes it is a single focus block: Pomodoro adds breaks to longer sessions."
              : `${blocks} focus blocks of about 25 minutes with ${breaks} break${breaks === 1 ? "" : "s"} between them (a long one after every fourth). The tree rests during breaks and grows only while you focus. ${formatFocus(wall)} on the clock.`}
        </p>
      </section>

      {/* What for */}
      {habits.length > 0 && (
        <section className="h-card flex flex-col gap-2 p-4">
          <p className="text-xs font-extrabold uppercase tracking-wider text-h-muted">Focusing on</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setHabitId(null)}
              className={cn("rounded-full border px-3 py-1.5 text-xs font-bold", habitId === null ? "border-h-brand bg-h-brand-soft text-h-brand" : "border-h-border bg-h-surface text-h-muted hover:text-h-fg")}
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
                  className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold", !on && "border-h-border bg-h-surface text-h-muted hover:text-h-fg")}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: hex }} />
                  {h.name}
                </button>
              );
            })}
          </div>
          {habitId !== null && <p className="text-[11px] text-h-muted">When the tree is grown, these minutes are added to the habit&apos;s day.</p>}
        </section>
      )}

      {/* Tree */}
      <section className="h-card flex flex-col gap-2 p-4">
        <p className="text-xs font-extrabold uppercase tracking-wider text-h-muted">Your tree</p>
        <div className="grid grid-cols-4 gap-2">
          {FOCUS_SPECIES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpecies(s)}
              aria-pressed={species === s}
              className={cn("relative flex flex-col items-center rounded-2xl border-2 bg-gradient-to-b from-h-surface to-h-surface2 px-1 pb-1.5 pt-2 transition-colors", species === s ? "border-h-brand" : "border-transparent hover:border-h-border")}
            >
              <FocusTree progress={1} species={s} animate={false} className="h-16 w-full" />
              <span className="text-[11px] font-bold">{SPECIES_LABEL[s]}</span>
              {species === s && (
                <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-h-brand text-h-brand-fg">
                  <Check className="h-3 w-3" strokeWidth={3.5} />
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {error && <p className="rounded-xl bg-h-bad/10 px-3 py-2 text-xs font-bold text-h-bad">{error}</p>}

      <button
        type="button"
        onClick={start}
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-2xl bg-h-brand py-4 text-base font-extrabold text-h-brand-fg shadow-sm transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        <Play className="h-5 w-5" fill="currentColor" />
        Plant and start
      </button>
      <p className="text-center text-[11px] text-h-muted">Give up after the first 30 seconds and the tree withers. Finish and it joins your grove.</p>
    </div>
  );
}
