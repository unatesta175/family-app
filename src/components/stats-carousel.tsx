"use client";

import { CheckCircle2, XCircle, Flame } from "lucide-react";
import { Carousel } from "@/components/carousel";

export function StatsCarousel({
  periodLabel,
  successRatePct,
  done,
  missed,
  currentStreak,
  commitmentDone,
  commitmentTotal,
  commitmentPct,
}: {
  periodLabel: string;
  successRatePct: number;
  done: number;
  missed: number;
  currentStreak: number;
  commitmentDone: number;
  commitmentTotal: number;
  commitmentPct: number;
}) {
  const cards = [
    <SummaryCard key="summary" periodLabel={periodLabel} pct={successRatePct} done={done} missed={missed} />,
    <StreakCard key="streak" days={currentStreak} />,
    <CommitmentCard
      key="commitment"
      periodLabel={periodLabel}
      done={commitmentDone}
      total={commitmentTotal}
      pct={commitmentPct}
    />,
  ];

  return <Carousel items={cards} />;
}

function SummaryCard({
  periodLabel,
  pct,
  done,
  missed,
}: {
  periodLabel: string;
  pct: number;
  done: number;
  missed: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-5 text-white shadow-lg shadow-indigo-900/10">
      <p className="text-sm font-medium text-indigo-200">This {periodLabel} Summary</p>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-4xl font-extrabold tracking-tight">{pct}%</p>
          <span className="mt-1 inline-block rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-100">
            Success Rate
          </span>
        </div>
        <div className="flex flex-col items-end gap-1.5 text-xs font-medium">
          <span className="flex items-center gap-1.5 text-indigo-100">
            <CheckCircle2 className="h-3.5 w-3.5" /> {done} Done
          </span>
          <span className="flex items-center gap-1.5 text-indigo-200">
            <XCircle className="h-3.5 w-3.5" /> {missed} Missed
          </span>
        </div>
      </div>
    </div>
  );
}

function StreakCard({ days }: { days: number }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 p-5 text-white shadow-lg shadow-orange-900/10">
      <Flame className="absolute -bottom-4 -right-4 h-28 w-28 text-white/10" strokeWidth={1.5} />
      <p className="text-sm font-medium text-orange-100">Current Streak</p>
      <p className="mt-3 text-4xl font-extrabold tracking-tight">
        {days} <span className="text-lg font-semibold text-orange-100">DAYS</span>
      </p>
      <span className="mt-2 inline-block rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-orange-100">
        Current Streak
      </span>
    </div>
  );
}

function CommitmentCard({
  periodLabel,
  done,
  total,
  pct,
}: {
  periodLabel: string;
  done: number;
  total: number;
  pct: number;
}) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 p-5 text-white shadow-lg shadow-emerald-900/10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-200">This {periodLabel} Commitment</p>
          <p className="mt-3 text-4xl font-extrabold tracking-tight">
            {done} <span className="text-lg font-semibold text-emerald-200">/ {total}</span>
          </p>
          <span className="mt-2 inline-block rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-100">
            Prayers Offered
          </span>
        </div>
        <div className="relative h-[68px] w-[68px] shrink-0">
          <svg width="68" height="68" viewBox="0 0 68 68" className="-rotate-90">
            <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
            <circle
              cx="34"
              cy="34"
              r={r}
              fill="none"
              stroke="white"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{pct}%</span>
        </div>
      </div>
    </div>
  );
}
