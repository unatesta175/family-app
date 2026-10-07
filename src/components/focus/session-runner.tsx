"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Coffee, Square, Trees, Volume2, VolumeX } from "lucide-react";
import { cancelFocusAction, finishFocusAction } from "@/lib/focus-actions";
import { GRACE_SECONDS, clock, formatFocus, stageName, tierInfo, timeline, treeTier, type FocusMode, type FocusSpecies } from "@/lib/focus";
import { FocusTree } from "@/components/focus/focus-tree";
import { ConfirmDialog } from "@/components/habits/confirm-dialog";
import { cn } from "@/lib/utils";

export type RunningSession = {
  id: number;
  startedAt: number;
  plannedSeconds: number;
  mode: FocusMode;
  species: FocusSpecies;
  habitName: string | null;
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

/** The full-screen forest backdrop: layered greens, soft light from above, and a glowing patch of ground. */
function Scene({ resting, children }: { resting?: boolean; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-gradient-to-b from-[#38b583] via-[#1f9468] to-[#0b5a43] text-white">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-lime-200/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-1/3 h-80 w-80 rounded-full bg-emerald-100/20 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#06402f]/70 to-transparent" />
      {/* the island the tree stands on */}
      <div className={cn("pointer-events-none absolute left-1/2 top-[52%] h-44 w-[22rem] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-[50%] blur-xl transition-colors duration-1000", resting ? "bg-amber-200/70" : "bg-lime-200/75")} />
      <div className={cn("pointer-events-none absolute left-1/2 top-[52%] h-32 w-72 max-w-[80vw] -translate-x-1/2 -translate-y-1/2 rounded-[50%] transition-colors duration-1000", resting ? "bg-amber-200/55" : "bg-lime-300/60")} />
      <div className="relative flex h-full flex-col px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">{children}</div>
    </div>
  );
}

/**
 * The running session: a quiet full-screen forest, the tree growing a little every second, and a big
 * clock. The time comes from the session's start time, so a reload (or a phone that slept) lands on
 * exactly the right moment.
 */
export function SessionRunner({ session, serverNow }: { session: RunningSession; serverNow: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // The server's clock and this device's can differ a little; the gap is measured once and kept.
  const [offset] = useState(() => serverNow - Date.now());
  const [now, setNow] = useState(serverNow);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [confirming, setConfirming] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastPhase = useRef<string | null>(null);
  const finishing = useRef(false);

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

  const tl = timeline(session.startedAt, session.plannedSeconds, session.mode, now);
  const tier = treeTier(session.plannedSeconds);

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
      notify("Your tree is fully grown", `${formatFocus(session.plannedSeconds)} of focus done. It has joined your grove.`);
      void finishFocusAction(session.id).then((res) => {
        if (!res.ok) setError(res.error);
        setOutcome({ kind: "done" });
        router.refresh();
      });
    }
  }, [tl.phase, tl.done, outcome, muted, session.id, session.plannedSeconds, router]);

  useEffect(() => {
    document.title = outcome ? "Focus" : `${clock(tl.phaseRemaining)} · ${tl.phase === "break" ? "Break" : "Focus"}`;
  }, [tl.phaseRemaining, tl.phase, outcome]);

  function giveUp() {
    setConfirming(false);
    startTransition(async () => {
      const res = await cancelFocusAction(session.id);
      if (!res.ok) return setError(res.error);
      if (res.data.withered) setOutcome({ kind: "withered" });
      else router.push("/focus");
      router.refresh();
    });
  }

  // --- Finished or given up ------------------------------------------------------------------
  if (outcome) {
    const grown = outcome.kind === "done";
    return (
      <Scene>
        <div className="flex flex-1 flex-col items-center justify-between pt-10 text-center">
          <div>
            <p className="text-sm font-semibold text-white/80">{grown ? "Well done" : "Not this time"}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{grown ? `Your ${tierInfo(tier).name.toLowerCase()} is fully grown` : "Your tree withered"}</h1>
            <p className="mx-auto mt-2 max-w-xs text-sm text-white/80">
              {grown
                ? `${formatFocus(session.plannedSeconds)} of focus${session.habitName ? ` on ${session.habitName}` : ""} are now part of your grove.`
                : "You gave up before the end. The stump stays in today's grove, and the time you did put in is kept."}
            </p>
            {grown && session.habitName && <p className="mt-1 text-xs font-semibold text-lime-200">The time was added to {session.habitName}.</p>}
            {error && <p className="mt-2 text-xs font-bold text-red-200">{error}</p>}
          </div>
          <FocusTree progress={grown ? 1 : Math.max(0.3, tl.progress)} species={session.species} tier={tier} withered={!grown} className="relative z-10 h-72 w-60" />
          <div className="grid w-full max-w-sm gap-2">
            <Link href="/focus" className="rounded-full bg-white py-3.5 text-center text-sm font-extrabold text-[#0b5a43] shadow-lg">
              {grown ? "Plant another tree" : "Try again"}
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

      <div className="flex flex-1 items-center justify-center">
        <FocusTree progress={tl.progress} species={session.species} tier={tier} className="relative z-10 h-80 w-64" />
      </div>

      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-[5.5rem] font-extralight leading-none tabular-nums tracking-wider">{clock(tl.phaseRemaining)}</p>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-white/80">
          {resting && <Coffee className="h-3.5 w-3.5" />}
          {tierInfo(tier).name} · {stageName(tl.progress)} · {formatFocus(tl.focusElapsed)} of {formatFocus(session.plannedSeconds)}
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
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={pending}
          aria-label={grace ? "Cancel session" : "Give up"}
          className="mt-1 flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-white shadow-lg ring-1 ring-white/30 backdrop-blur-md transition-transform active:scale-90 disabled:opacity-60"
        >
          <Square className="h-5 w-5" fill="currentColor" />
        </button>
        <p className="text-[11px] font-medium text-white/65">{grace ? "Cancel in the first 30 seconds costs nothing" : "Stopping now withers your tree"}</p>
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
