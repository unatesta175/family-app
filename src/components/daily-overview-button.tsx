"use client";

import { useState } from "react";
import { Sparkles, Clock, Check, X } from "lucide-react";
import { ActiveChallengeCard } from "@/components/active-challenge-card";
import type { ChallengeProgress } from "@/lib/challenge-progress";

export function DailyOverviewButton({
  pct,
  onTime,
  late,
  missed,
  quoteText,
  quoteRef,
  profileId,
  challenge,
}: {
  pct: number;
  onTime: number;
  late: number;
  missed: number;
  quoteText: string;
  quoteRef: string;
  profileId: number;
  challenge: { id: number; durationDays: number; progress: ChallengeProgress } | null;
}) {
  const [open, setOpen] = useState(false);
  const clamped = Math.min(100, Math.max(0, pct));
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;

  return (
    <>
      {/* Mirrors BottomNav's 5-column layout (w-full px-2, 5x flex-1) so this lands exactly above Settings. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 mx-auto flex w-full max-w-md items-center px-2">
        <span className="flex-1" />
        <span className="flex-1" />
        <span className="flex-1" />
        <span className="flex-1" />
        <span className="flex flex-1 justify-center">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Today's overview"
            className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-black/5"
          >
            <svg width="64" height="64" viewBox="0 0 64 64" className="absolute -rotate-90">
              <circle cx="32" cy="32" r={r} fill="none" stroke="#eef2ee" strokeWidth="6" />
              <circle
                cx="32"
                cy="32"
                r={r}
                fill="none"
                stroke="#0f7a4c"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={offset}
              />
            </svg>
            <span className="flex flex-col items-center leading-none">
              <span className="text-base font-extrabold text-emerald-800">{clamped}</span>
              <span className="text-[9px] font-semibold text-emerald-600">%</span>
            </span>
          </button>
        </span>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="scrollbar-hide flex max-h-[80vh] w-full max-w-md flex-col overflow-y-auto rounded-t-3xl bg-white px-5 pb-8 pt-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-neutral-200" />
            <p className="text-center text-[11px] font-bold uppercase tracking-widest text-neutral-400">
              Today&apos;s Overview
            </p>

            <div className="mt-4 rounded-3xl bg-emerald-800 p-5 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-200">Daily Completion</p>
                  <p className="mt-1 text-4xl font-extrabold">{clamped}%</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-white/10 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-lg font-extrabold">
                    <Clock className="h-3.5 w-3.5" />
                    {onTime}
                  </div>
                  <p className="mt-0.5 text-[10px] text-emerald-200">On Time</p>
                </div>
                <div className="rounded-2xl bg-white/10 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-lg font-extrabold">
                    <Check className="h-3.5 w-3.5" />
                    {late}
                  </div>
                  <p className="mt-0.5 text-[10px] text-emerald-200">Late</p>
                </div>
                <div className="rounded-2xl bg-white/10 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-lg font-extrabold">
                    <X className="h-3.5 w-3.5" />
                    {missed}
                  </div>
                  <p className="mt-0.5 text-[10px] text-emerald-200">Missed</p>
                </div>
              </div>
            </div>

            {challenge && (
              <div className="mt-5">
                <ActiveChallengeCard
                  profileId={profileId}
                  challengeId={challenge.id}
                  durationDays={challenge.durationDays}
                  progress={challenge.progress}
                />
              </div>
            )}

            <p className="mt-5 text-center text-[11px] font-bold uppercase tracking-widest text-neutral-400">
              Hadith
            </p>
            <div className="mt-2 rounded-2xl border border-neutral-100 bg-neutral-50/60 px-4 py-4 text-center">
              <p className="text-sm italic leading-snug text-neutral-700">&ldquo;{quoteText}&rdquo;</p>
              <p className="mt-1.5 text-[11px] font-medium text-neutral-400">{quoteRef}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
