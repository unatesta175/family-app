"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Blocks, CheckCircle2, ChevronLeft, ChevronRight, Flame, Move3d, PartyPopper, Pause, Play, RotateCcw, Sprout, Trophy } from "lucide-react";
import { SLOT_LABEL, buildTower, motivationFor, nextStreakStep, slotDateLabel, towerLevel, type Motivation, type SlotKind, type TowerData, type TowerLevel } from "@/lib/habit-tower";
import { colorHex, formatDuration, formatNumber, tint } from "@/lib/habits";
import type { HabitEvalType } from "@/lib/db/schema";
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

const GOLD = "#ffb020";

/** What each kind of block means, drawn the way it looks in the tower. */
const LEGEND = [
  { kind: "done", label: "Done", hint: "A solid block with a gem on top", style: (hex: string) => ({ background: hex, boxShadow: `0 0 8px ${tint(hex, 0.7)}` }), mark: "◆" },
  { kind: "streak", label: "In your streak", hint: "Taller, gold and glowing", style: () => ({ background: GOLD, boxShadow: `0 0 10px ${GOLD}` }), mark: "◆" },
  { kind: "partial", label: "Partly done", hint: "A half-height block", style: (hex: string) => ({ background: tint(hex, 0.5) }), mark: "" },
  { kind: "skipped", label: "Rest day", hint: "A pale ice-blue block", style: () => ({ background: "#7dd3fc99", border: "1px solid #7dd3fc" }), mark: "" },
  { kind: "missed", label: "Missed", hint: "A red pit with a cross", style: () => ({ background: "#ef4444", color: "#fff" }), mark: "✕" },
  { kind: "today", label: "Waiting", hint: "A pulsing outline: today, not done yet", style: (hex: string) => ({ border: `2px dashed ${hex}`, background: tint(hex, 0.1) }), mark: "" },
] as const;

/** The scene plus its chrome: stats, orbit controls, a month focus strip and a legend. */
function TowerStage({
  towers,
  focusMonth,
  onPickTower,
  hint,
  selected,
  onSelect,
  formatValue,
}: {
  towers: { id: string; name: string; color: string; data: TowerData }[];
  focusMonth: string | null;
  onPickTower?: (id: string) => void;
  hint: string;
  selected: HoverInfo | null;
  onSelect: (info: HoverInfo | null) => void;
  formatValue: (value: number) => string;
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
      <TowerCanvas towers={towers} dark={dark} focusMonth={focusMonth} autoRotate={autoRotate} resetKey={resetKey} intro={intro && !reduced} onHover={setHover} onPickTower={onPickTower} selected={selected ? { towerId: selected.towerId, date: selected.date } : null} onSelect={onSelect} />

      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        <div className="min-h-9 max-w-[70%] rounded-xl border border-h-border bg-h-surface/90 px-3 py-1.5 text-xs shadow-sm backdrop-blur">
          {(selected ?? hover) ? (
            <>
              <p className="font-extrabold leading-tight">{(selected ?? hover)!.name}</p>
              <p className="font-medium text-h-muted">
                {slotDateLabel((selected ?? hover)!.date)} · {SLOT_LABEL[(selected ?? hover)!.kind]}
                {(selected ?? hover)!.kind !== "missed" && formatValue((selected ?? hover)!.value) ? ` · ${formatValue((selected ?? hover)!.value)}` : ""}
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
  evalType = "yes_no",
  unit = null,
}: {
  name: string;
  color: string;
  days: StatDay[];
  startDate: string;
  today: string;
  evalType?: HabitEvalType;
  unit?: string | null;
}) {
  const hex = colorHex(color);
  const data = useMemo(() => buildTower(days, startDate, today), [days, startDate, today]);
  const level = towerLevel(data.totalDone);
  const motivation = motivationFor(data, today);
  // Amounts only mean something for numeric and timer habits; a plain tick would just say "1".
  const formatValue = (v: number) => (v <= 0 ? "" : evalType === "timer" ? formatDuration(v) : evalType === "numeric" ? `${formatNumber(v)}${unit ? ` ${unit}` : ""}` : "");
  const webgl = useWebGL();
  const [focus, setFocus] = useState<string | null>(null);
  const [selected, setSelected] = useState<HoverInfo | null>(null);
  // Every date that has something to show, in order: the stepper walks through these.
  const steps = useMemo(
    () => data.floors.flatMap((f) => f.slots.filter((s) => s.kind === "done" || s.kind === "partial" || s.kind === "missed" || s.kind === "skipped" || s.kind === "pending").map((slot) => ({ slot, floor: f }))),
    [data]
  );
  const stepIndex = selected ? steps.findIndex((s) => s.slot.date === selected.date) : -1;
  const select = (i: number) => {
    const s = steps[Math.max(0, Math.min(steps.length - 1, i))];
    if (s) setSelected({ towerId: "single", name, date: s.slot.date, kind: s.slot.kind, value: s.slot.value, floorLabel: s.floor.label });
  };
  const floorsNewestFirst = [...data.floors].reverse();
  const best = data.floors.reduce((a, f) => (f.done > a.done ? f : a), data.floors[0]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat icon={Blocks} value={String(data.totalDone)} label="Blocks built" hex={hex} />
        <Stat icon={Trophy} value={`Lv ${level.level}`} label={level.name} hex={hex} />
        <Stat icon={Flame} value={String(data.streak)} label="Day streak" hex={GOLD} />
      </div>

      <MotivationCard motivation={motivation} hex={hex} />

      {webgl ? (
        <TowerStage towers={[{ id: "single", name, color: hex, data }]} focusMonth={focus} hint="Drag to orbit · pinch to zoom · tap a block" selected={selected} onSelect={setSelected} formatValue={formatValue} />
      ) : (
        <div className="h-card p-4">
          <TowerFlat data={data} color={color} />
        </div>
      )}

      {webgl && (
        <SlotDetails
          hex={hex}
          selected={selected}
          formatValue={formatValue}
          current={stepIndex >= 0 ? steps[stepIndex] : null}
          canPrev={steps.length > 0 && stepIndex !== 0}
          canNext={steps.length > 0 && stepIndex < steps.length - 1}
          onPrev={() => select(stepIndex < 0 ? steps.length - 1 : stepIndex - 1)}
          onNext={() => select(stepIndex < 0 ? steps.length - 1 : stepIndex + 1)}
          onLatest={() => select(steps.length - 1)}
        />
      )}

      <LevelProgress level={level} total={data.totalDone} streak={data.streak} hex={hex} />

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
          <li key={l.kind} className="flex items-center gap-1.5" title={l.hint}>
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-[3px] text-[8px] font-extrabold leading-none" style={l.style(hex)}>
              {l.mark}
            </span>
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
  const [selected, setSelected] = useState<HoverInfo | null>(null);
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

  return <TowerStage towers={towers} focusMonth={null} onPickTower={(id) => router.push(`/habits/${id}?tab=tower`)} hint="Drag to orbit · tap a tower to open its habit" selected={selected} onSelect={setSelected} formatValue={() => ""} />;
}

const TONE_STYLE: Record<Motivation["tone"], { icon: React.ComponentType<{ className?: string }>; accent: string }> = {
  start: { icon: Sprout, accent: "var(--h-brand)" },
  keep: { icon: Flame, accent: GOLD },
  recover: { icon: Sprout, accent: "var(--h-brand)" },
  done: { icon: CheckCircle2, accent: "var(--h-good)" },
  celebrate: { icon: PartyPopper, accent: GOLD },
  rest: { icon: Blocks, accent: "var(--h-muted)" },
};

/** The line that matters most: what today means for your tower, with a button to go and do it. */
function MotivationCard({ motivation, hex }: { motivation: Motivation; hex: string }) {
  const t = TONE_STYLE[motivation.tone];
  const Icon = t.icon;
  return (
    <div className="h-card relative flex items-center gap-3 overflow-hidden p-4" style={{ background: `linear-gradient(120deg, color-mix(in srgb, ${t.accent} 14%, var(--h-surface)), var(--h-surface))` }}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white" style={{ background: t.accent }}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold leading-tight">{motivation.headline}</p>
        <p className="mt-0.5 text-xs leading-snug text-h-muted">{motivation.body}</p>
      </div>
      {motivation.cta && (
        <Link href="/habits" className="flex shrink-0 items-center gap-1 rounded-xl px-3 py-2 text-xs font-extrabold text-white shadow-sm" style={{ background: hex }}>
          Do it
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

/** Level progress and the next streak goal: the next small thing to reach. */
function LevelProgress({ level, total, streak, hex }: { level: TowerLevel; total: number; streak: number; hex: string }) {
  const step = nextStreakStep(streak);
  return (
    <div className="h-card flex flex-col gap-3 p-4">
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-extrabold">
            Level {level.level} · {level.name}
          </p>
          <p className="text-[11px] font-bold tabular-nums text-h-muted">{total} blocks</p>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-h-surface2">
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(3, level.progress * 100)}%`, background: hex }} />
        </div>
        <p className="mt-1 text-[11px] font-medium text-h-muted">
          {level.next ? `${level.toNext} more block${level.toNext === 1 ? "" : "s"} to reach Level ${level.next.level} · ${level.next.name}. Each level adds a ring to your beacon.` : "Top level reached. Your tower is a legend."}
        </p>
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-extrabold">
            <Flame className="h-4 w-4" style={{ color: GOLD }} />
            Streak
          </p>
          <p className="text-[11px] font-bold tabular-nums text-h-muted">{streak} day{streak === 1 ? "" : "s"}</p>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-h-surface2">
          <div className="h-full rounded-full transition-all" style={{ width: `${step ? Math.max(streak > 0 ? 4 : 0, (streak / step) * 100) : 100}%`, background: GOLD }} />
        </div>
        <p className="mt-1 text-[11px] font-medium text-h-muted">
          {step ? `${step - streak} more day${step - streak === 1 ? "" : "s"} to a ${step}-day streak. Streak days turn gold and send a beam of light up from your tower.` : "Legendary streak. Keep the light on."}
        </p>
      </div>
    </div>
  );
}

const KIND_TONE: Record<SlotKind, { dot: string; text: string }> = {
  done: { dot: "var(--h-good)", text: "text-h-good" },
  partial: { dot: "var(--h-brand)", text: "text-h-brand" },
  missed: { dot: "var(--h-bad)", text: "text-h-bad" },
  skipped: { dot: "#38bdf8", text: "text-sky-500" },
  pending: { dot: "var(--h-brand)", text: "text-h-brand" },
  future: { dot: "var(--h-border)", text: "text-h-muted" },
  off: { dot: "var(--h-border)", text: "text-h-muted" },
};

/** What you picked: the date, its status, and previous / next buttons to walk through the days. */
function SlotDetails({
  hex,
  selected,
  formatValue,
  current,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onLatest,
}: {
  hex: string;
  selected: HoverInfo | null;
  formatValue: (value: number) => string;
  current: { slot: { date: string; kind: SlotKind; value: number; streak: boolean }; floor: { label: string; done: number; due: number; daysInMonth: number } } | null;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onLatest: () => void;
}) {
  const btn = "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-h-border bg-h-surface text-h-fg transition-colors hover:bg-h-surface2 disabled:opacity-40";
  if (!selected || !current) {
    return (
      <div className="h-card flex items-center justify-between gap-3 p-3">
        <p className="text-xs font-medium text-h-muted">Tap a block in the tower to see that day, or step through your days.</p>
        <button type="button" onClick={onLatest} className="shrink-0 rounded-xl px-3 py-2 text-xs font-bold text-white" style={{ background: hex }}>
          Latest day
        </button>
      </div>
    );
  }
  const { slot, floor } = current;
  const tone = KIND_TONE[slot.kind];
  const pct = floor.due > 0 ? (floor.done / floor.due) * 100 : 0;
  return (
    <div className="h-card flex items-stretch gap-3 p-3" aria-live="polite">
      <button type="button" aria-label="Previous day" onClick={onPrev} disabled={!canPrev} className={btn}>
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold leading-tight">{slotDateLabel(slot.date)}</p>
        <p className={cn("mt-0.5 flex items-center gap-1.5 text-xs font-bold", tone.text)}>
          <span className="h-2 w-2 rounded-full" style={{ background: tone.dot }} />
          {SLOT_LABEL[slot.kind]}
          {slot.kind !== "missed" && formatValue(slot.value) && <span className="font-medium text-h-muted">· {formatValue(slot.value)}</span>}
          {slot.streak && <span className="font-semibold text-h-break">· in your streak</span>}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-h-surface2">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: hex }} />
          </div>
          <span className="text-[10px] font-bold tabular-nums text-h-muted">
            {floor.label}: {floor.done}/{floor.due || floor.daysInMonth}
          </span>
        </div>
      </div>
      <button type="button" aria-label="Next day" onClick={onNext} disabled={!canNext} className={btn}>
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
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
