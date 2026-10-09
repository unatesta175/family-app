"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Clock, Coffee, Flame, Home, Loader2, Pause, Play, Plus, RotateCw, Sprout, Square, Trees, Volume2, VolumeX } from "lucide-react";
import { addFocusOvertimeAction, attachFocusHabitAction, cancelFocusAction, finishFocusAction, pauseFocusAction, resumeFocusAction, type FinishSummary } from "@/lib/focus-actions";
import { GRACE_SECONDS, clock, formatFocus, pausedMsAt, sessionTrees, stageName, tierInfo, timeline, treeTier, type FocusMode, type FocusSpecies, type PomodoroConfig, type Tree, type TreeTier } from "@/lib/focus";
import { FocusTree } from "@/components/focus/focus-tree";
import { ConfirmDialog } from "@/components/habits/confirm-dialog";
import { cn } from "@/lib/utils";

export type RunningSession = {
  id: number;
  startedAt: number;
  plannedSeconds: number;
  mode: FocusMode;
  cfg: PomodoroConfig;
  species: FocusSpecies;
  habitName: string | null;
  /** Seconds focused so far (known once a session has ended). */
  focusedSeconds?: number;
  /** Seconds already banked as paused time, and the moment (epoch ms) a pause began (null while running). */
  pausedSeconds: number;
  pausedAt: number | null;
  /** When the session ended on the server (epoch ms), if it has. */
  endedAt?: number;
};

/** A short, soft chime made in the browser (no sound files): a rising triad, or one low note for a break. */
function chime(kind: "done" | "phase") {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = kind === "done" ? [523.25, 659.25, 783.99, 1046.5] : [440];
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1);
    });
    window.setTimeout(() => void ctx.close(), 2500);
  } catch {
    /* sound is a bonus, never an error */
  }
}

function notify(title: string, body: string) {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification(title, { body });
  } catch {
    /* some browsers only allow notifications from a service worker */
  }
}

type Outcome = { kind: "done" } | { kind: "withered" } | null;

/**
 * A field of fine particles across the whole scene, in three depths: tiny far dust that barely moves,
 * pollen at mid distance, and a few big soft blurred ones close to the eye. They drift upward at
 * different speeds, plus a handful of sparks that twinkle in place. Slower and warmer during a break.
 */
function Particles({ resting }: { resting?: boolean }) {
  const tone = resting ? ["#fde68a", "#fbbf24"] : ["#ffffff", "#d9f99d"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 34 }, (_, i) => {
        const depth = i % 3; // 0 far, 1 mid, 2 near
        const size = [2, 3.5, 7][depth] + (i % 2);
        return (
          <span
            key={i}
            className="nrg-mote"
            style={
              {
                left: `${(i * 29) % 100}%`,
                top: `${52 + ((i * 17) % 56)}%`,
                width: size,
                height: size,
                background: tone[i % 2],
                opacity: [0.5, 0.65, 0.4][depth],
                filter: depth === 2 ? "blur(2px)" : undefined,
                boxShadow: depth === 0 ? undefined : `0 0 ${size * 2}px ${tone[i % 2]}`,
                "--dx": `${((i % 7) - 3) * (depth + 1) * 7}px`,
                "--rise": `${[70, 95, 120][depth]}svh`,
                "--dur": `${([34, 24, 15][depth] + (i % 5) * 2.2) * (resting ? 1.6 : 1)}s`,
                "--delay": `-${(i * 1.7) % 30}s`,
              } as React.CSSProperties
            }
          />
        );
      })}
      {/* sparks that twinkle where they are */}
      {Array.from({ length: 14 }, (_, i) => (
        <span
          key={`s${i}`}
          className="nrg-twinkle"
          style={
            {
              left: `${6 + ((i * 53) % 88)}%`,
              top: `${8 + ((i * 31) % 62)}%`,
              width: 2 + (i % 3),
              height: 2 + (i % 3),
              background: "#ffffff",
              boxShadow: "0 0 8px rgba(255,255,255,0.9)",
              "--dur": `${2.4 + (i % 5) * 0.7}s`,
              "--delay": `-${(i * 0.9) % 5}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** The full-screen forest backdrop: layered greens and soft light from above. The content scrolls if a screen is short. */
function Scene({ children, resting }: { children: React.ReactNode; resting?: boolean }) {
  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-gradient-to-b from-[#38b583] via-[#1f9468] to-[#0b5a43] text-white">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-lime-200/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-1/3 h-80 w-80 rounded-full bg-emerald-100/20 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#06402f]/70 to-transparent" />
      {/* soft light from above, and two slow banks of mist drifting across */}
      <div className="pointer-events-none absolute left-1/2 top-[-12%] h-[60%] w-[120%] -translate-x-1/2 rounded-full bg-white/15 blur-3xl" />
      <div className="nrg-mist pointer-events-none absolute left-[-10%] top-[38%] h-24 w-[70%] rounded-full bg-white/10 blur-2xl" />
      <div className="nrg-mist pointer-events-none absolute right-[-12%] top-[58%] h-28 w-[75%] rounded-full bg-emerald-100/10 blur-2xl" style={{ animationDelay: "-14s" }} />
      <Particles resting={resting} />
      <div className="relative flex h-full flex-col overflow-y-auto px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">{children}</div>
    </div>
  );
}

/**
 * A tree standing on its own glowing patch of ground. The ground belongs to the tree (it moves with it),
 * so the tree is always on the green base, wherever the rest of the screen puts it.
 */
function TreeOnIsland({ children, resting, className, aura }: { children: React.ReactNode; resting?: boolean; className?: string; aura?: React.ReactNode }) {
  return (
    <div className={cn("relative flex shrink-0 items-end justify-center", className)}>
      {aura}
      <div className={cn("pointer-events-none absolute left-1/2 top-[88%] h-[44%] w-[165%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] blur-xl transition-colors duration-1000", resting ? "bg-amber-200/70" : "bg-lime-200/75")} />
      <div className={cn("pointer-events-none absolute left-1/2 top-[88%] h-[30%] w-[135%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] transition-colors duration-1000", resting ? "bg-amber-200/55" : "bg-lime-300/60")} />
      {children}
    </div>
  );
}

/** What the session reads out as it goes: a focus or discipline word, changing every few seconds. */
const FOCUS_VERBS = ["Focusing", "Concentrating", "Staying present", "Building discipline", "Holding steady", "Going deep", "Persisting", "Locked in", "Committing", "Showing up"];
const REST_VERBS = ["Resting", "Recovering", "Breathing", "Recharging"];

/**
 * The glow and life around the tree, all tied to the green ground it stands on: a soft breathing glow,
 * ripples spreading across the ground, a fine ring on the island's edge that fills with the session's
 * progress, and a few motes of light rising from the grass. It grows stronger as the tree grows, takes
 * a golden tone from the Ancient tree up, and turns amber and slow during a break.
 */
function FocusAura({ progress, tier, resting }: { progress: number; tier: TreeTier; resting: boolean }) {
  const gold = tier >= 5;
  const tint = resting ? "#fbbf24" : gold ? "#fde047" : "#bef264";
  const tint2 = resting ? "#fcd34d" : gold ? "#fff3a3" : "#86efac";
  const motes = resting ? 7 : 10 + tier * 2;
  const slow = resting ? 1.6 : 1;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
      {/* a soft glow behind the crown that breathes, a little stronger as the tree grows */}
      <div className="nrg-breathe h-[120%] w-[150%] blur-2xl" style={{ background: `radial-gradient(circle, ${tint}77 0%, ${tint}22 45%, transparent 72%)`, ["--nrg-o" as string]: 0.25 + progress * 0.4 }} />

      {/* everything below is placed on the island itself, so it can never drift off the green base */}
      <div className="absolute left-1/2 top-[88%] h-[30%] w-[135%] -translate-x-1/2 -translate-y-1/2">
        {/* ripples across the ground */}
        {[0, 1.8, 3.6].map((d) => (
          <span key={d} className="nrg-ripple border" style={{ borderColor: `${tint}aa`, animationDelay: `${d * slow}s`, animationDuration: `${5.5 * slow}s` }} />
        ))}
        {/* the progress ring, on the island's edge */}
        <svg viewBox="0 0 150 40" className="absolute -inset-[3%] h-[106%] w-[106%] overflow-visible" style={{ filter: `drop-shadow(0 0 4px ${tint})` }}>
          <ellipse cx="75" cy="20" rx="73" ry="18" fill="none" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="0.7" />
          <ellipse cx="75" cy="20" rx="73" ry="18" fill="none" stroke={tint} strokeWidth="1.3" strokeLinecap="round" pathLength={100} strokeDasharray="100" strokeDashoffset={100 - progress * 100} style={{ transition: "stroke-dashoffset 1s linear" }} />
        </svg>
        {/* motes of light lifting off the grass */}
        {Array.from({ length: motes }, (_, i) => {
          const size = 2.5 + (i % 3);
          return (
            <span
              key={i}
              className="nrg-mote"
              style={
                {
                  left: `${8 + ((i * 37) % 84)}%`,
                  top: `${30 + ((i * 23) % 40)}%`,
                  width: size,
                  height: size,
                  background: i % 3 === 0 ? tint2 : tint,
                  boxShadow: `0 0 ${5 + size * 2}px ${i % 3 === 0 ? tint2 : tint}`,
                  "--dx": `${((i % 5) - 2) * 8}px`,
                  "--rise": `min(${20 + (i % 4) * 4}svh, ${190 + (i % 4) * 30}px)`,
                  "--dur": `${(5 + (i % 6) * 0.7) * slow}s`,
                  "--delay": `-${(i * 0.71) % 7}s`,
                } as React.CSSProperties
              }
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * The running session: a quiet full-screen forest, the tree growing a little every second, and a big
 * clock. The time comes from the session's start time, so a reload (or a phone that slept) lands on
 * exactly the right moment.
 */
export function SessionRunner({ session, serverNow, initialOutcome, timerHabits = [] }: { session: RunningSession; serverNow: number; initialOutcome?: "done" | "withered"; timerHabits?: { id: number; name: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // The server's clock and this device's can differ a little; the gap is measured once and kept.
  const [offset] = useState(() => serverNow - Date.now());
  const [now, setNow] = useState(serverNow);
  const [outcome, setOutcome] = useState<Outcome>(initialOutcome ? { kind: initialOutcome } : null);
  const [confirming, setConfirming] = useState(false);
  const [muted, setMuted] = useState(false);
  // Pausing stops the clock: the banked paused seconds and (while paused) the moment it started.
  const [pausedSeconds, setPausedSeconds] = useState(session.pausedSeconds);
  const [pausedAt, setPausedAt] = useState<number | null>(session.pausedAt);
  const [, startPause] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<"saving" | "saved" | "error">("saving");
  const [summary, setSummary] = useState<FinishSummary | null>(null);
  const lastPhase = useRef<string | null>(null);
  // A session that has already ended (shown again after a reload) must not be finished a second time.
  const finishing = useRef(initialOutcome !== undefined);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now() + offset), 250);
    return () => window.clearInterval(t);
  }, [offset]);

  // Keep the screen awake while the session runs, where the browser allows it.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => undefined);
    return () => void lock?.release().catch(() => undefined);
  }, []);

  const paused = pausedAt !== null;
  // Paused time is subtracted from the wall clock, so the timer holds still while paused and resumes
  // exactly where it left off. The same maths runs on the server, so a reload lands on the right moment.
  const effectiveNow = now - pausedMsAt(pausedSeconds, pausedAt, now);
  const tl = timeline(session.startedAt, session.plannedSeconds, session.mode, effectiveNow, session.cfg);
  // Each focus block grows its own tree, so the live tree takes the current block's tier and growth.
  const tier = treeTier(tl.blockSeconds);
  // The trees a finished session leaves (one per focus block), for the celebration and notification.
  const grownTrees = sessionTrees({ mode: session.mode, plannedSeconds: session.plannedSeconds, cfg: session.cfg, status: "completed", focusedSeconds: session.plannedSeconds });

  useEffect(() => {
    if (outcome) return;
    if (lastPhase.current && lastPhase.current !== tl.phase && tl.phase !== "done") {
      if (!muted) chime("phase");
      notify(tl.phase === "break" ? "Break time" : "Back to focus", tl.phase === "break" ? "Your tree is resting. Stretch for a few minutes." : "Your tree is growing again.");
    }
    lastPhase.current = tl.phase;
    if (tl.done && !finishing.current) {
      finishing.current = true;
      if (!muted) chime("done");
      notify(grownTrees.length > 1 ? `Your ${grownTrees.length} trees are grown` : "Your tree is fully grown", `${formatFocus(session.plannedSeconds)} of focus done. ${grownTrees.length > 1 ? "They have" : "It has"} joined your grove.`);
      // Celebrate right away; saving to the grove happens in the background, and can be retried.
      setOutcome({ kind: "done" });
      void save();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tl.phase, tl.done, outcome, muted, session.id, session.plannedSeconds, router]);

  /** Tells the server the tree is grown. If the connection fails the celebration stays and can retry. */
  async function save() {
    setSaved("saving");
    setError(null);
    try {
      const res = await finishFocusAction(session.id);
      if (res.ok) {
        setSummary(res.data);
        setSaved("saved");
      } else {
        setSaved("error");
        setError(res.error);
      }
    } catch {
      setSaved("error");
      setError("Couldn't reach the server. Your tree is safe and will be saved when you are back online.");
    }
  }

  // Shown again after a reload: fetch today's totals for the celebration.
  useEffect(() => {
    if (initialOutcome === "done") void save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.title = outcome ? "Focus" : `${clock(tl.phaseRemaining)} · ${tl.phase === "break" ? "Break" : "Focus"}`;
  }, [tl.phaseRemaining, tl.phase, outcome]);

  /** Pause or resume. The clock updates at once (optimistic); the server banks the real paused time. */
  function togglePause() {
    if (outcome) return;
    if (paused) {
      // Resume: bank the time spent paused, clear the pause, then confirm with the server.
      const banked = pausedSeconds + Math.max(0, Math.round((now - (pausedAt ?? now)) / 1000));
      setPausedSeconds(banked);
      setPausedAt(null);
      startPause(async () => {
        const res = await resumeFocusAction(session.id);
        if (res.ok) setPausedSeconds(res.data.pausedSeconds);
        else setError(res.error);
      });
    } else {
      const at = now;
      setPausedAt(at);
      startPause(async () => {
        const res = await pauseFocusAction(session.id);
        if (res.ok) setPausedAt(res.data.pausedAt);
        else {
          setPausedAt(null);
          setError(res.error);
        }
      });
    }
  }

  function giveUp() {
    setConfirming(false);
    startTransition(async () => {
      const res = await cancelFocusAction(session.id);
      if (!res.ok) return setError(res.error);
      if (res.data.withered) setOutcome({ kind: "withered" });
      else router.push("/focus");
    });
  }

  // --- Finished or given up ------------------------------------------------------------------
  if (outcome) {
    if (outcome.kind === "done") {
      return (
        <Celebration
          session={session}
          trees={grownTrees}
          saved={saved}
          summary={summary}
          error={error}
          onRetry={() => void save()}
          timerHabits={timerHabits}
          canOvertime={session.mode === "single"}
          endedAtMs={session.endedAt ?? session.startedAt + tl.wallTotal * 1000}
          onSummary={setSummary}
        />
      );
    }
    const endTrees = sessionTrees({ mode: session.mode, plannedSeconds: session.plannedSeconds, cfg: session.cfg, status: "withered", focusedSeconds: session.focusedSeconds ?? Math.round(tl.focusElapsed) });
    const kept = endTrees.filter((t) => t.grown);
    const stump = endTrees.find((t) => !t.grown) ?? { tier, seconds: session.focusedSeconds ?? 0 };
    return (
      <Scene>
        <div className="flex min-h-full flex-1 flex-col items-center justify-between gap-3 pt-6 text-center">
          <div className="fx-rise">
            <p className="text-sm font-semibold text-white/80">Not this time</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{kept.length > 0 ? "You stopped early" : "Your tree withered"}</h1>
            <p className="mx-auto mt-2 max-w-xs text-sm text-white/80">
              {kept.length > 0
                ? `You gave up part way, so this block's tree withered. The ${kept.length} ${kept.length === 1 ? "tree" : "trees"} from the blocks you finished stay in your grove, and the time you put in is kept.`
                : "You gave up before the end. The stump stays in today's grove, and the time you did put in is kept."}
            </p>
            {error && <p className="mt-2 text-xs font-bold text-red-200">{error}</p>}
          </div>
          <TreeOnIsland className="my-4">
            <FocusTree progress={Math.max(0.3, stump.seconds && stump.seconds > 0 ? Math.min(1, stump.seconds / tl.blockSeconds) : 0.3)} species={session.species} tier={stump.tier} withered className="relative z-10 h-[30svh] max-h-72 min-h-40 w-auto" />
          </TreeOnIsland>
          <div className="fx-rise grid w-full max-w-sm gap-2">
            <Link href="/focus" className="flex items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-extrabold text-[#0b5a43] shadow-lg">
              <Home className="h-4 w-4" />
              Back to home
            </Link>
            <Link href="/focus/grove" className="flex items-center justify-center gap-1.5 rounded-full bg-white/15 py-3.5 text-sm font-bold backdrop-blur-sm">
              <Trees className="h-4 w-4" />
              See my grove
            </Link>
          </div>
        </div>
      </Scene>
    );
  }

  // --- Running ---------------------------------------------------------------------------------
  const resting = tl.phase === "break";
  const grace = tl.wallElapsed < GRACE_SECONDS;
  const verbs = resting ? REST_VERBS : FOCUS_VERBS;
  const verb = verbs[Math.floor(tl.wallElapsed / 3.4) % verbs.length];

  return (
    <Scene resting={resting}>
      <div className="flex items-start justify-between">
        <div>
          <p className="flex items-center gap-2 text-lg font-bold leading-tight">
            <span className={cn("h-2 w-2 rounded-full", resting ? "bg-amber-300" : "bg-lime-300")} />
            {session.habitName ?? "Focus session"}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-white/75">
            {resting ? "Break: your tree is resting" : tl.blocks > 1 ? `Focus ${tl.block} of ${tl.blocks}` : "I'm focusing on…"}
          </p>
        </div>
        <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Sound on" : "Mute"} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center py-3">
        <TreeOnIsland resting={resting} aura={<FocusAura progress={tl.blockProgress} tier={tier} resting={resting} />}>
          <div className="nrg-sway relative z-10">
            <FocusTree progress={tl.blockProgress} species={session.species} tier={tier} className="h-[34svh] max-h-80 min-h-44 w-auto" />
          </div>
        </TreeOnIsland>
      </div>

      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-[5.5rem] font-extralight leading-none tabular-nums tracking-wider">{clock(tl.phaseRemaining)}</p>
        <p className="flex items-center gap-2 rounded-full bg-white/12 px-3.5 py-1.5 text-xs font-bold backdrop-blur-md" aria-live="off">
          {paused ? (
            <span className="flex items-center gap-1.5">
              <Pause className="h-3.5 w-3.5" fill="currentColor" />
              Paused
            </span>
          ) : (
            <>
              <span className="nrg-dot h-2 w-2 rounded-full" style={{ background: resting ? "#fbbf24" : "#bef264", boxShadow: `0 0 10px ${resting ? "#fbbf24" : "#bef264"}` }} />
              <span key={verb} className="nrg-verb">
                {verb}
              </span>
              {!resting && <span className="tabular-nums text-lime-200">{Math.round(tl.blockProgress * 100)}%</span>}
            </>
          )}
        </p>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-white/80">
          {resting && <Coffee className="h-3.5 w-3.5" />}
          {tierInfo(tier).name} · {stageName(tl.blockProgress)} · {formatFocus(tl.focusElapsed)} of {formatFocus(session.plannedSeconds)}
          {tl.blocks > 1 && ` · ${clock(tl.wallTotal - tl.wallElapsed)} left in all`}
        </p>
        {tl.blocks > 1 && (
          <div className="flex gap-1.5" aria-hidden>
            {Array.from({ length: tl.blocks }, (_, i) => (
              <span key={i} className={cn("h-1.5 w-7 rounded-full", i + 1 < tl.block || tl.done ? "bg-white" : i + 1 === tl.block ? "bg-white/70" : "bg-white/25")} />
            ))}
          </div>
        )}
        {error && <p className="text-xs font-bold text-red-200">{error}</p>}
        <div className="mt-1 flex items-center gap-4">
          <button
            type="button"
            onClick={togglePause}
            aria-label={paused ? "Resume session" : "Pause session"}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#0b5a43] shadow-lg ring-1 ring-white/40 transition-transform active:scale-90"
          >
            {paused ? <Play className="h-5 w-5" fill="currentColor" /> : <Pause className="h-5 w-5" fill="currentColor" />}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={pending}
            aria-label={grace ? "Cancel session" : "Give up"}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-white shadow-lg ring-1 ring-white/30 backdrop-blur-md transition-transform active:scale-90 disabled:opacity-60"
          >
            <Square className="h-5 w-5" fill="currentColor" />
          </button>
        </div>
        <p className="text-[11px] font-medium text-white/65">{paused ? "Paused — tap play to carry on" : grace ? "Cancel in the first 30 seconds costs nothing" : "Stopping now withers your tree"}</p>
      </div>

      {confirming && (
        <ConfirmDialog
          title={grace ? "Cancel this session?" : "Give up?"}
          message={grace ? "You only just started, so nothing is lost." : "Your tree will wither and stay as a stump in today's grove. The time you put in is kept."}
          confirmLabel={grace ? "Cancel session" : "Let it wither"}
          onClose={() => setConfirming(false)}
          onConfirm={giveUp}
        />
      )}
    </Scene>
  );
}

const CONFETTI = ["#fde047", "#86efac", "#a7f3d0", "#ffffff", "#fbbf24", "#f9a8d4", "#93c5fd", "#fca5a5"];

/** Falling confetti: deterministic pieces, so the screen is the same on every render. */
function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 44 }, (_, i) => {
        const left = (i * 37) % 100;
        const size = 6 + ((i * 7) % 6);
        return (
          <span
            key={i}
            className="fx-confetti"
            style={
              {
                left: `${left}%`,
                width: size,
                height: i % 3 === 0 ? size : size * 1.6,
                borderRadius: i % 3 === 0 ? 9999 : 2,
                background: CONFETTI[i % CONFETTI.length],
                animationDelay: `${(i % 11) * 0.28}s`,
                animationDuration: `${3.4 + (i % 6) * 0.45}s`,
                "--fx-drift": `${((i % 7) - 3) * 22}px`,
                "--fx-spin": `${360 + (i % 5) * 120}deg`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

/** What to say, by how big a tree the session grew. */
const CHEERS: Record<TreeTier, { title: string; line: string }> = {
  1: { title: "Nicely done!", line: "Every focused minute counts. A small tree today, a forest in time." },
  2: { title: "Great focus!", line: "You stayed with it and your tree grew full and leafy." },
  3: { title: "Beautifully done!", line: "Steady, deep focus, and it is in bloom." },
  4: { title: "Outstanding focus!", line: "A long stretch of real work. Your grand tree stands tall." },
  5: { title: "Remarkable discipline!", line: "This is what deep focus looks like. Your ancient tree is glowing." },
  6: { title: "Legendary focus!", line: "Hours of undivided attention. Very few people ever do this." },
};

/** The finish: confetti, the tree growing into place, a cheer that fits the session, and today's totals. */
function Celebration({
  session,
  trees,
  saved,
  summary,
  error,
  onRetry,
  timerHabits,
  canOvertime,
  endedAtMs,
  onSummary,
}: {
  session: RunningSession;
  trees: Tree[];
  saved: "saving" | "saved" | "error";
  summary: FinishSummary | null;
  error: string | null;
  onRetry: () => void;
  timerHabits: { id: number; name: string }[];
  /** A single session can take time you kept working after it ended. */
  canOvertime: boolean;
  /** When the session ended (epoch ms), the overtime counter runs from here. */
  endedAtMs: number;
  onSummary: (s: FinishSummary) => void;
}) {
  const count = trees.length;
  const multiBlock = count > 1;
  // Overtime folds extra minutes into a single session, so its length (and tree tier) can grow.
  const [planned, setPlanned] = useState(session.plannedSeconds);
  // The moment overtime is measured from; it moves forward each time some is added.
  const [since, setSince] = useState(endedAtMs);
  const [dismissed, setDismissed] = useState(false);
  const [adding, startAdd] = useTransition();
  const [overtimeError, setOvertimeError] = useState<string | null>(null);
  // Tick once a second so the "since it ended" readout keeps counting up.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!canOvertime || dismissed) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [canOvertime, dismissed]);
  const overtimeSec = canOvertime ? Math.max(0, Math.floor((now - since) / 1000)) : 0;
  const addedSec = planned - session.plannedSeconds;
  // A single session has one tree, whose tier follows its (possibly extended) length.
  const tier = multiBlock ? trees[0].tier : treeTier(planned);
  const cheer = CHEERS[tier];
  function addOvertime() {
    setOvertimeError(null);
    const seconds = overtimeSec;
    startAdd(async () => {
      const res = await addFocusOvertimeAction({ sessionId: session.id, seconds });
      if (res.ok) {
        setPlanned(res.data.plannedSeconds);
        setSince(Date.now());
        onSummary(res.data.summary);
      } else setOvertimeError(res.error);
    });
  }
  // A session started with no habit can be counted towards one after the fact.
  const [linked, setLinked] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linking, startLink] = useTransition();
  const habitName = session.habitName ?? linked;
  function attach(habitId: number) {
    setLinkError(null);
    startLink(async () => {
      const res = await attachFocusHabitAction({ sessionId: session.id, habitId });
      if (res.ok) setLinked(res.data.habitName);
      else setLinkError(res.error);
    });
  }
  return (
    <Scene>
      <Confetti />
      <div className="relative flex min-h-full flex-1 flex-col items-center justify-between gap-3 pt-4 text-center">
        <div className="fx-rise">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur-sm">
            <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
            Session complete
          </span>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight">{cheer.title}</h1>
          <p className="mx-auto mt-2 max-w-xs text-base font-semibold text-white">
            You focused for <span className="rounded-md bg-white/20 px-1.5 py-0.5 font-extrabold tabular-nums">{formatFocus(planned)}</span>
            {habitName ? <> on {habitName}</> : null}.
          </p>
          <p className="mx-auto mt-1.5 max-w-xs text-sm text-white/80">
            {cheer.line}{" "}
            {count > 1
              ? `${count} ${tierInfo(tier).name.toLowerCase()}s are fully grown and now part of your grove.`
              : `Your ${tierInfo(tier).name.toLowerCase()} is fully grown and now part of your grove.`}
          </p>
        </div>

        {count > 1 ? (
          <div className="my-3 flex flex-col items-center gap-2">
            <TreeOnIsland>
              <span className="fx-ring h-52 w-52 border-2 border-white/60" />
              <span className="fx-ring h-52 w-52 border-2 border-white/40" style={{ animationDelay: "1.3s" }} />
              <FocusTree progress={1} species={session.species} tier={tier} className="fx-pop relative z-10 h-[24svh] max-h-56 min-h-32 w-auto" />
            </TreeOnIsland>
            <div className="flex items-end justify-center gap-1">
              {trees.map((t, i) => (
                <FocusTree key={i} progress={1} species={session.species} tier={t.tier} animate={false} className="h-9 w-9" />
              ))}
            </div>
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-extrabold backdrop-blur-sm">{count} trees grown</span>
          </div>
        ) : (
          <TreeOnIsland className="my-3">
            <span className="fx-ring h-52 w-52 border-2 border-white/60" />
            <span className="fx-ring h-52 w-52 border-2 border-white/40" style={{ animationDelay: "1.3s" }} />
            <FocusTree progress={1} species={session.species} tier={tier} className="fx-pop relative z-10 h-[28svh] max-h-64 min-h-36 w-auto" />
          </TreeOnIsland>
        )}

        <div className="flex w-full max-w-sm flex-col gap-3">
          <div className="fx-rise grid grid-cols-3 gap-2" style={{ animationDelay: "0.35s" }}>
            <Stat icon={Sprout} value={summary ? String(summary.treesToday) : "–"} label="Trees today" />
            <Stat icon={Clock} value={summary ? formatFocus(summary.secondsToday) : "–"} label="Focused today" />
            <Stat icon={Flame} value={summary ? `${summary.streak}d` : "–"} label="Focus streak" />
          </div>

          <p className="fx-rise flex items-center justify-center gap-1.5 text-xs font-semibold text-white/80" style={{ animationDelay: "0.5s" }} aria-live="polite">
            {saved === "saving" && (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Adding it to your grove…
              </>
            )}
            {saved === "saved" && (
              <>
                <Check className="h-3.5 w-3.5 text-lime-200" strokeWidth={3} /> Saved to your grove{habitName ? `, and added to ${habitName}` : ""}
              </>
            )}
            {saved === "error" && (
              <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 font-bold">
                <RotateCw className="h-3.5 w-3.5" /> {error ?? "Couldn't save yet."} Try again
              </button>
            )}
          </p>

          {canOvertime && saved === "saved" && !dismissed && (overtimeSec >= 30 || addedSec > 0) && (
            <div className="fx-rise rounded-2xl bg-white/15 p-3 text-left backdrop-blur-md" style={{ animationDelay: "0.5s" }}>
              <p className="text-xs font-bold">Kept studying after it ended?</p>
              <p className="mt-0.5 text-[11px] text-white/80">
                It&apos;s been <span className="font-extrabold tabular-nums">{clock(overtimeSec)}</span> since this session finished. Add that time so it counts.
                {addedSec > 0 && <> You&apos;ve added {formatFocus(addedSec)} so far.</>}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={addOvertime}
                  disabled={adding || overtimeSec < 1}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-[#0b5a43] disabled:opacity-60"
                >
                  {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" strokeWidth={3} />}
                  Add {formatFocus(overtimeSec)}
                </button>
                <button type="button" onClick={() => setDismissed(true)} className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold hover:bg-white/25">
                  No, I stopped
                </button>
              </div>
              {overtimeError && <p className="mt-1.5 text-[11px] font-bold text-red-200">{overtimeError}</p>}
            </div>
          )}

          {!habitName && timerHabits.length > 0 && saved === "saved" && (
            <div className="fx-rise rounded-2xl bg-white/15 p-3 text-left backdrop-blur-md" style={{ animationDelay: "0.55s" }}>
              <p className="text-xs font-bold">Count these {formatFocus(planned)} towards a habit?</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {timerHabits.map((h) => (
                  <button key={h.id} type="button" disabled={linking} onClick={() => attach(h.id)} className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold hover:bg-white/30 disabled:opacity-60">
                    {h.name}
                  </button>
                ))}
              </div>
              {linkError && <p className="mt-1.5 text-[11px] font-bold text-red-200">{linkError}</p>}
            </div>
          )}

          <div className="fx-rise grid gap-2" style={{ animationDelay: "0.6s" }}>
            <Link href="/focus" className="flex items-center justify-center gap-2 rounded-full bg-white py-3.5 text-base font-extrabold text-[#0b5a43] shadow-lg transition-transform active:scale-[0.98]">
              <Home className="h-5 w-5" />
              Back to home
            </Link>
            <Link href="/focus/grove" className="flex items-center justify-center gap-1.5 rounded-full bg-white/15 py-3 text-sm font-bold backdrop-blur-sm">
              <Trees className="h-4 w-4" />
              See my grove
            </Link>
          </div>
        </div>
      </div>
    </Scene>
  );
}

function Stat({ icon: Icon, value, label }: { icon: React.ComponentType<{ className?: string }>; value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/15 px-2 py-3 backdrop-blur-md">
      <Icon className="mx-auto h-4 w-4 text-lime-200" />
      <p className="mt-1 text-xl font-extrabold leading-none tabular-nums">{value}</p>
      <p className="mt-1 text-[10px] font-semibold text-white/75">{label}</p>
    </div>
  );
}
