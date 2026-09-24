"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Timer, Minus, Plus, Rocket } from "lucide-react";
import { startChallengeAction } from "@/lib/actions";
import { cn } from "@/lib/utils";
import type { ChallengeType } from "@/lib/db/schema";

const CHALLENGES: {
  type: ChallengeType;
  icon: typeof ShieldCheck;
  title: string;
  description: string;
  badge: string;
}[] = [
  {
    type: "no_missed",
    icon: ShieldCheck,
    title: "No Missed Prayers",
    description: "Ensure all 5 prayers are offered daily.",
    badge: "Standard",
  },
  {
    type: "all_on_time",
    icon: Timer,
    title: "All On Time",
    description: 'All 5 prayers must be strictly "On Time".',
    badge: "Expert",
  },
];

export function NewChallengeForm({ profileId }: { profileId: number }) {
  const [type, setType] = useState<ChallengeType>("no_missed");
  const [days, setDays] = useState(3);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleStart() {
    startTransition(async () => {
      await startChallengeAction({ profileId, type, durationDays: days });
      router.push("/");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-widest text-neutral-400">
          Choose Your Challenge
        </p>
        <div className="flex flex-col gap-3">
          {CHALLENGES.map((c) => {
            const Icon = c.icon;
            const active = type === c.type;
            return (
              <button
                key={c.type}
                type="button"
                onClick={() => setType(c.type)}
                className={cn(
                  "relative overflow-hidden rounded-2xl border-2 p-4 text-left transition-colors",
                  active ? "border-emerald-600 bg-emerald-50" : "border-neutral-200 bg-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      active ? "bg-emerald-600 text-white" : "bg-neutral-100 text-neutral-500"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="flex-1 text-base font-bold text-neutral-900">{c.title}</p>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                      active ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"
                    )}
                  >
                    {c.badge}
                  </span>
                </div>
                <p className="mt-2 text-xs text-neutral-500">{c.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-widest text-neutral-400">
          Select Duration
        </p>
        <div className="flex items-center justify-center gap-6 rounded-2xl bg-neutral-50 py-4">
          <button
            type="button"
            onClick={() => setDays((d) => Math.max(1, d - 1))}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
            aria-label="Decrease days"
          >
            <Minus className="h-4 w-4" />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-extrabold text-neutral-900">{days}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Days</span>
          </div>
          <button
            type="button"
            onClick={() => setDays((d) => Math.min(90, d + 1))}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
            aria-label="Increase days"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleStart}
        disabled={isPending}
        className="flex items-center justify-center gap-2 rounded-full bg-emerald-800 py-4 text-sm font-bold text-white transition-colors hover:bg-emerald-900 disabled:opacity-60"
      >
        <Rocket className="h-4 w-4" />
        {isPending ? "Starting..." : "Start Challenge"}
      </button>
    </div>
  );
}
