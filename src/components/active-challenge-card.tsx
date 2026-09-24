"use client";

import { useRef, useState } from "react";
import { Sparkles, Check, X, AlertTriangle, Undo2, Hand, Clock } from "lucide-react";
import { resetChallengeAction } from "@/lib/actions";
import { cn } from "@/lib/utils";
import type { ChallengeProgress } from "@/lib/challenge-progress";

const HOLD_MS = 900;

export function ActiveChallengeCard({
  profileId,
  challengeId,
  durationDays,
  progress,
}: {
  profileId: number;
  challengeId: number;
  durationDays: number;
  progress: ChallengeProgress;
}) {
  const [confirming, setConfirming] = useState(false);
  const [holdPct, setHoldPct] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);

  function stopHold() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setHoldPct(0);
  }

  function startHold() {
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min(100, (elapsed / HOLD_MS) * 100);
      setHoldPct(pct);
      if (pct >= 100) {
        stopHold();
        resetChallengeAction({ profileId, challengeId });
      }
    }, 16);
  }

  return (
    <div>
      <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-widest text-neutral-400">
        Active Challenge
      </p>
      <div
        className={cn(
          "rounded-3xl border-2 p-4 transition-colors",
          confirming ? "border-rose-300 bg-rose-50/40" : "border-neutral-200 bg-white"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                confirming ? "bg-rose-100 text-rose-600" : "bg-emerald-50 text-emerald-700"
              )}
            >
              {confirming ? <AlertTriangle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-900">{durationDays}-Day Challenge</p>
              <p className={cn("text-xs", confirming ? "font-semibold text-rose-600" : "text-neutral-400")}>
                {confirming ? "Action cannot be undone" : "Keep the momentum going"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConfirming((c) => !c)}
            aria-label={confirming ? "Cancel" : "Cancel challenge"}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100"
          >
            {confirming ? <Undo2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </button>
        </div>

        <div className="mt-4 flex items-center">
          {progress.days.map((d, i) => (
            <div key={d.date} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                onClick={() => d.status === "failed" && setConfirming(true)}
                disabled={d.status !== "failed"}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors",
                  d.status === "success" && "border-emerald-600 bg-emerald-600 text-white",
                  d.status === "failed" && "border-rose-500 bg-rose-50 text-rose-600",
                  d.status === "pending" && "border-neutral-200 text-neutral-400"
                )}
              >
                {d.status === "success" && <Check className="h-3.5 w-3.5" />}
                {d.status === "failed" && <X className="h-3.5 w-3.5" />}
                {d.status === "pending" && d.day}
              </button>
              {i < progress.days.length - 1 && <div className="h-px flex-1 bg-neutral-200" />}
            </div>
          ))}
        </div>

        {confirming ? (
          <button
            type="button"
            onPointerDown={startHold}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            className="relative mt-4 flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-rose-50 py-3 text-sm font-bold text-rose-700"
          >
            <div
              className="absolute inset-y-0 left-0 bg-rose-200"
              style={{ width: `${holdPct}%` }}
            />
            <Hand className="relative z-10 h-4 w-4" />
            <span className="relative z-10">Hold to Reset Challenge</span>
          </button>
        ) : (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-full bg-neutral-50 py-3 text-xs font-semibold text-neutral-600">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <Check className="h-3.5 w-3.5" /> {progress.doneCount} Done
            </span>
            <span className="text-neutral-300">|</span>
            <span className="flex items-center gap-1.5 text-violet-600">
              <Clock className="h-3.5 w-3.5" /> {progress.leftCount} Left
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
