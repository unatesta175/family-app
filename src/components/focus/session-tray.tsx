"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Leaf, Loader2, Pause } from "lucide-react";
import { resumeFocusAction } from "@/lib/focus-actions";
import { clock, pausedMsAt, timeline, type FocusMode, type FocusSpecies, type PomodoroConfig } from "@/lib/focus";
import { cn } from "@/lib/utils";

export type TraySession = {
  id: number;
  habitName: string | null;
  species: FocusSpecies;
  mode: FocusMode;
  cfg: PomodoroConfig;
  startedAt: number;
  plannedSeconds: number;
  pausedSeconds: number;
  pausedAt: number | null;
  openEnded: boolean;
};

/**
 * Every focus session going at once, each a card you tap to switch into. Switching pauses whichever
 * other one was running and picks this one back up, so only ever one clock really runs — pause "Study",
 * jump to "Work", come back to "Study" later and it carries on right where it left off.
 */
export function SessionTray({ sessions, serverNow }: { sessions: TraySession[]; serverNow: number }) {
  const [offset] = useState(() => serverNow - Date.now());
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now() + offset), 1000);
    return () => window.clearInterval(t);
  }, [offset]);

  if (sessions.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="px-1 text-xs font-extrabold uppercase tracking-wider text-h-muted">
        {sessions.length > 1 ? `${sessions.length} sessions going` : "A tree is growing"}
      </h2>
      <div className="-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sessions.map((s) => (
          <SessionCard key={s.id} session={s} now={now} />
        ))}
      </div>
    </div>
  );
}

function SessionCard({ session, now }: { session: TraySession; now: number }) {
  const router = useRouter();
  const [switching, startSwitch] = useTransition();
  const running = session.pausedAt === null;
  const effectiveNow = now - pausedMsAt(session.pausedSeconds, session.pausedAt, now);
  const tl = timeline(session.startedAt, session.plannedSeconds, session.mode, effectiveNow, session.cfg);
  const readout = session.openEnded ? tl.focusElapsed : tl.phaseRemaining;

  function go() {
    startSwitch(async () => {
      await resumeFocusAction(session.id);
      router.push(`/focus/session/${session.id}`);
    });
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={switching}
      className={cn(
        "flex w-[205px] shrink-0 snap-start flex-col gap-2.5 rounded-2xl border p-3.5 text-left shadow-sm transition-colors disabled:opacity-70",
        running ? "border-h-brand/40 bg-gradient-to-br from-h-brand-soft to-h-surface" : "border-h-border bg-h-surface hover:border-h-muted/40"
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", running ? "bg-h-brand text-h-brand-fg" : "bg-h-surface2 text-h-muted")}>
          <Leaf className="h-4 w-4" />
        </span>
        <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold", running ? "bg-h-brand/15 text-h-brand" : "bg-h-surface2 text-h-muted")}>
          {switching ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : running ? <span className="nrg-dot h-1.5 w-1.5 rounded-full bg-h-brand" /> : <Pause className="h-2.5 w-2.5" fill="currentColor" />}
          {switching ? "Switching" : running ? "Live" : "Paused"}
        </span>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-extrabold text-h-fg">{session.habitName ?? "Focus session"}</p>
        <p className="truncate text-[11px] font-semibold text-h-muted">
          {session.mode === "pomodoro" && tl.blocks > 1 ? `Block ${tl.block} of ${tl.blocks} · ` : ""}
          {tl.phase === "break" ? "On a break" : session.openEnded ? "focused so far" : "left"}
        </p>
      </div>
      <p className="text-xl font-extrabold tabular-nums text-h-fg">{clock(readout)}</p>
    </button>
  );
}
