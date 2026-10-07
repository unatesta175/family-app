"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Coffee, Flag, Leaf, Trees, X } from "lucide-react";
import { cancelFocusAction, finishFocusAction } from "@/lib/focus-actions";
import { GRACE_SECONDS, SPECIES_LABEL, clock, formatFocus, stageName, timeline, type FocusMode, type FocusSpecies } from "@/lib/focus";
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

/**
 * The running session: a clock, the tree growing a little every second, and a way out. The time comes
 * from the session's start time, so a reload (or a phone that slept) lands on exactly the right moment.
 */
export function SessionRunner({ session, serverNow }: { session: RunningSession; serverNow: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // The server's clock and this device's can differ a little; the gap is measured once and kept.
  const [offset] = useState(() => serverNow - Date.now());
  const [now, setNow] = useState(serverNow);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [confirming, setConfirming] = useState(false);
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

  useEffect(() => {
    if (outcome) return;
    if (lastPhase.current && lastPhase.current !== tl.phase && tl.phase !== "done") {
      chime("phase");
      notify(tl.phase === "break" ? "Break time" : "Back to focus", tl.phase === "break" ? "Your tree is resting. Stretch for a few minutes." : "Your tree is growing again.");
    }
    lastPhase.current = tl.phase;
    if (tl.done && !finishing.current) {
      finishing.current = true;
      chime("done");
      notify("Your tree is fully grown", `${formatFocus(session.plannedSeconds)} of focus done. It has joined your grove.`);
      void finishFocusAction(session.id).then((res) => {
        if (!res.ok) setError(res.error);
        setOutcome({ kind: "done" });
        router.refresh();
      });
    }
  }, [tl.phase, tl.done, outcome, session.id, session.plannedSeconds, router]);

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
      <div className="flex flex-col items-center gap-5 pt-4 text-center md:mx-auto md:max-w-md">
        <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-b from-sky-200 via-sky-100 to-emerald-100 p-6 dark:from-[#12302b] dark:via-[#0f2723] dark:to-[#0d201c]">
          <FocusTree progress={grown ? 1 : Math.max(0.3, tl.progress)} species={session.species} withered={!grown} className="mx-auto h-56 w-56" />
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-emerald-300/50 to-transparent dark:from-emerald-900/50" />
        </div>
        <div>
          <p className="text-2xl font-extrabold tracking-tight">{grown ? "Tree planted" : "The tree withered"}</p>
          <p className="mt-1 text-sm text-h-muted">
            {grown
              ? `${formatFocus(session.plannedSeconds)} of focus${session.habitName ? ` on ${session.habitName}` : ""}. It is now part of your grove.`
              : "You gave up before the end. The stump stays in today's grove, and the time you did put in is kept."}
          </p>
          {grown && session.habitName && <p className="mt-1 text-xs font-semibold text-h-brand">The time was added to {session.habitName}.</p>}
          {error && <p className="mt-2 text-xs font-bold text-h-bad">{error}</p>}
        </div>
        <div className="grid w-full gap-2 sm:grid-cols-2">
          <Link href="/focus" className="rounded-2xl bg-h-brand py-3 text-sm font-extrabold text-h-brand-fg">
            {grown ? "Plant another" : "Try again"}
          </Link>
          <Link href="/focus/grove" className="flex items-center justify-center gap-1.5 rounded-2xl border border-h-border bg-h-surface py-3 text-sm font-bold">
            <Trees className="h-4 w-4" />
            See my grove
          </Link>
        </div>
      </div>
    );
  }

  // --- Running ---------------------------------------------------------------------------------
  const resting = tl.phase === "break";
  const grace = tl.wallElapsed < GRACE_SECONDS;
  const stage = stageName(tl.progress);

  return (
    <div className="flex flex-col items-center gap-5 pt-2 md:mx-auto md:max-w-md">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-h-muted">{session.habitName ?? "Focus session"}</p>
        <p className="mt-0.5 flex items-center justify-center gap-1.5 text-sm font-bold text-h-brand">
          {resting ? <Coffee className="h-4 w-4" /> : <Leaf className="h-4 w-4" />}
          {resting ? "Break: your tree is resting" : tl.blocks > 1 ? `Focus ${tl.block} of ${tl.blocks}` : "Focusing"}
        </p>
      </div>

      <div className={cn("relative w-full overflow-hidden rounded-3xl p-6 transition-colors duration-700", resting ? "bg-gradient-to-b from-amber-100 via-orange-50 to-emerald-100 dark:from-[#2e2410] dark:via-[#241d10] dark:to-[#0d201c]" : "bg-gradient-to-b from-sky-200 via-sky-100 to-emerald-100 dark:from-[#12302b] dark:via-[#0f2723] dark:to-[#0d201c]")}>
        <FocusTree progress={tl.progress} species={session.species} className="mx-auto h-60 w-60" />
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-emerald-300/50 to-transparent dark:from-emerald-900/50" />
        <span className="absolute left-3 top-3 rounded-full bg-black/10 px-2.5 py-1 text-[11px] font-bold backdrop-blur-sm dark:bg-white/10">
          {SPECIES_LABEL[session.species]} · {stage}
        </span>
      </div>

      <div className="text-center">
        <p className="text-7xl font-extrabold leading-none tabular-nums tracking-tight">{clock(tl.phaseRemaining)}</p>
        <p className="mt-2 text-xs font-semibold text-h-muted">
          {formatFocus(tl.focusElapsed)} of {formatFocus(session.plannedSeconds)} focused
          {tl.blocks > 1 && ` · ${clock(tl.wallTotal - tl.wallElapsed)} left in all`}
        </p>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-h-surface2">
        <div className="h-full rounded-full bg-h-brand transition-all duration-1000 ease-linear" style={{ width: `${Math.round(tl.progress * 1000) / 10}%` }} />
      </div>

      {error && <p className="text-xs font-bold text-h-bad">{error}</p>}

      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={pending}
        className="flex items-center gap-1.5 rounded-full border border-h-border bg-h-surface px-4 py-2 text-xs font-bold text-h-muted hover:text-h-bad disabled:opacity-60"
      >
        {grace ? <X className="h-3.5 w-3.5" /> : <Flag className="h-3.5 w-3.5" />}
        {grace ? "Cancel (no penalty yet)" : "Give up"}
      </button>

      {confirming && (
        <ConfirmDialog
          title={grace ? "Cancel this session?" : "Give up?"}
          message={grace ? "You only just started, so nothing is lost." : "Your tree will wither and stay as a stump in today's grove. The time you put in is kept."}
          confirmLabel={grace ? "Cancel session" : "Let it wither"}
          onClose={() => setConfirming(false)}
          onConfirm={giveUp}
        />
      )}
    </div>
  );
}
