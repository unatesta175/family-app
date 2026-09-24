"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Flame, Trophy, TreePine, Sparkles } from "lucide-react";
import { Garden3D } from "@/components/garden-3d/loader";
import { PRAYER_ORDER, PRAYER_META } from "@/lib/prayers";
import { formatHijri } from "@/lib/hijri";
import { parseIso } from "@/lib/date";
import {
  GARDEN_STAGE_META,
  GARDEN_TIER_META,
  GARDEN_CONDITION_META,
  type GardenStage,
  type GardenTier,
  type GardenCondition,
  type PlotState,
} from "@/lib/garden";
import { cn } from "@/lib/utils";
import type { Status } from "@/lib/db/schema";

type Cell = {
  date: string | null;
  stage: GardenStage;
  pct: number;
  quality: number;
  condition: GardenCondition;
  plotState: PlotState;
  bonus: boolean;
  tier: GardenTier;
};
type DayDetail = {
  pct: number;
  quality: number;
  condition: GardenCondition;
  plotState: PlotState;
  prayers: Partial<Record<(typeof PRAYER_ORDER)[number], Status>>;
};

const CONDITION_BADGE: Record<GardenCondition, string> = {
  golden: "bg-[#eab308]/15 text-[#a16207]",
  thriving: "bg-[#15803d]/10 text-[#15803d]",
  healthy: "bg-emerald-50 text-emerald-700",
  stressed: "bg-[#c2a83f]/15 text-[#8a7420]",
  wilting: "bg-[#b3752c]/15 text-[#8a5a20]",
};

const PLOT_STATE_META: Record<Exclude<PlotState, "growing">, { label: string; hint: string; swatch: string }> = {
  empty: { label: "No prayers yet", hint: "Nothing logged for this day", swatch: "bg-neutral-200" },
  tombstoned: { label: "Prayer missed", hint: "1+ prayer actively marked missed", swatch: "bg-neutral-500" },
  burning: { label: "All prayers missed", hint: "All 5 prayers marked missed", swatch: "bg-[#ff5a1f]" },
};
const PLOT_STATE_BADGE: Record<Exclude<PlotState, "growing">, string> = {
  empty: "bg-neutral-100 text-neutral-500",
  tombstoned: "bg-neutral-200 text-neutral-700",
  burning: "bg-[#ff5a1f]/15 text-[#c2410c]",
};

const STATUS_DOT: Record<Status, string> = {
  on_time_jamaah: "bg-emerald-700",
  on_time: "bg-emerald-500",
  jamaah: "bg-emerald-600",
  late: "bg-amber-500",
  qada: "bg-sky-500",
  missed: "bg-rose-500",
  not_yet: "bg-neutral-200",
  excused: "bg-pink-400",
};

export function GardenClient({
  cells,
  todayDate,
  dayDetails,
  monthLabel,
  prevParam,
  nextParam,
  canGoNext,
  grown,
  currentStreak,
  bestStreak,
}: {
  cells: Cell[];
  todayDate: string;
  dayDetails: Record<string, DayDetail>;
  monthLabel: string;
  prevParam: string;
  nextParam: string;
  canGoNext: boolean;
  grown: number;
  currentStreak: number;
  bestStreak: number;
}) {
  const [selected, setSelected] = useState<string | null>(
    dayDetails[todayDate] ? todayDate : null
  );

  const isNewRecord = currentStreak > 0 && currentStreak === bestStreak;
  const selectedDetail = selected ? dayDetails[selected] : null;

  const selectedDateLabel = useMemo(() => {
    if (!selected) return null;
    return parseIso(selected).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }, [selected]);

  const selectedHijri = useMemo(() => {
    if (!selected) return null;
    return formatHijri(parseIso(selected));
  }, [selected]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold text-neutral-900">Garden</h1>
        <p className="text-xs text-neutral-400">Every consistent day grows something new</p>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="flex flex-col items-center gap-1 rounded-2xl bg-white p-3 shadow-sm">
          <Flame className="h-4 w-4 text-orange-500" />
          <p className="text-lg font-extrabold leading-none text-neutral-900">{currentStreak}</p>
          <p className="text-center text-[10px] leading-tight text-neutral-400">Current streak</p>
        </div>
        <div className="relative flex flex-col items-center gap-1 rounded-2xl bg-white p-3 shadow-sm">
          {isNewRecord && (
            <span className="absolute -top-1.5 right-1.5 flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-bold text-amber-700">
              <Sparkles className="h-2.5 w-2.5" /> best
            </span>
          )}
          <Trophy className="h-4 w-4 text-amber-500" />
          <p className="text-lg font-extrabold leading-none text-neutral-900">{bestStreak}</p>
          <p className="text-center text-[10px] leading-tight text-neutral-400">Best streak</p>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-2xl bg-white p-3 shadow-sm">
          <TreePine className="h-4 w-4 text-emerald-600" />
          <p className="text-lg font-extrabold leading-none text-neutral-900">{grown}</p>
          <p className="text-center text-[10px] leading-tight text-neutral-400">Grown this month</p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-white p-2 shadow-sm">
        <Link
          href={`/garden?month=${prevParam}`}
          className="rounded-full p-2 text-neutral-500 transition-colors hover:bg-neutral-100"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <p className="text-sm font-semibold text-neutral-900">{monthLabel}</p>
        {canGoNext ? (
          <Link
            href={`/garden?month=${nextParam}`}
            className="rounded-full p-2 text-neutral-500 transition-colors hover:bg-neutral-100"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className="rounded-full p-2 text-neutral-200">
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
        <Garden3D
          cells={cells}
          cols={7}
          todayDate={todayDate}
          selectedDate={selected}
          onSelect={setSelected}
        />
        <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-2.5">
          <div className="flex items-center gap-3 text-[10px] text-neutral-400">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full border-2 border-emerald-600" /> Today
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full border-2 border-amber-500" /> Selected
            </span>
          </div>
          <p className="text-[10px] text-neutral-400">Drag to rotate &middot; tap a plot</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        {selected && selectedDetail ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-neutral-900">{selectedDateLabel}</p>
                <p className="text-[11px] text-emerald-700">{selectedHijri}</p>
                <span
                  className={cn(
                    "mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    selectedDetail.plotState === "growing"
                      ? CONDITION_BADGE[selectedDetail.condition]
                      : PLOT_STATE_BADGE[selectedDetail.plotState]
                  )}
                >
                  {selectedDetail.plotState === "growing"
                    ? GARDEN_CONDITION_META[selectedDetail.condition].label
                    : PLOT_STATE_META[selectedDetail.plotState].label}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <p className="text-lg font-extrabold text-neutral-900">{selectedDetail.pct}%</p>
                <p className="text-[10px] text-neutral-400">completed</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-1.5">
              {PRAYER_ORDER.map((prayer) => {
                const status = selectedDetail.prayers[prayer] ?? "not_yet";
                const meta = PRAYER_META[prayer];
                const Icon = meta.icon;
                return (
                  <div key={prayer} className="flex flex-1 flex-col items-center gap-1">
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", meta.bg)}>
                      <Icon className={cn("h-4 w-4", meta.fg)} />
                    </div>
                    <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[status])} />
                    <span className="text-[9px] text-neutral-400">{meta.label.slice(0, 3)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="py-2 text-center text-xs text-neutral-400">
            Tap a plot in the garden above to see that day&apos;s details.
          </p>
        )}
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-semibold text-neutral-900">How growth works</p>
        <div className="flex flex-col gap-2">
          {(Object.keys(GARDEN_STAGE_META) as GardenStage[]).map((stage) => {
            const meta = GARDEN_STAGE_META[stage];
            return (
              <div key={stage} className="flex items-center gap-2.5">
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", meta.swatch)} />
                <span className="text-[11px] font-medium text-neutral-600">{meta.label}</span>
                <span className="ml-auto text-[10px] text-neutral-400">{meta.range}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold text-neutral-900">Tree condition</p>
        <p className="mb-3 text-[10px] text-neutral-400">
          Once a day has no missed prayers, size shows how many were done and condition shows how
          well &mdash; on time and in jamaah grows the healthiest tree, late/qada trees look duller.
        </p>
        <div className="flex flex-col gap-2">
          {(["golden", "thriving", "healthy", "stressed", "wilting"] as GardenCondition[]).map((condition) => {
            const meta = GARDEN_CONDITION_META[condition];
            return (
              <div key={condition} className="flex items-center gap-2.5">
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", meta.swatch)} />
                <span className="text-[11px] font-medium text-neutral-600">{meta.label}</span>
                <span className="ml-auto text-[10px] text-neutral-400">{meta.hint}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold text-neutral-900">Missed prayers</p>
        <p className="mb-3 text-[10px] text-neutral-400">
          A missed prayer overrides the tree entirely &mdash; it isn&apos;t just a duller version of
          growth.
        </p>
        <div className="flex flex-col gap-2">
          {(["tombstoned", "burning"] as Exclude<PlotState, "growing" | "empty">[]).map((state) => {
            const meta = PLOT_STATE_META[state];
            return (
              <div key={state} className="flex items-center gap-2.5">
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", meta.swatch)} />
                <span className="text-[11px] font-medium text-neutral-600">{meta.label}</span>
                <span className="ml-auto text-[10px] text-neutral-400">{meta.hint}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-semibold text-neutral-900">Streaks make it bigger</p>
        <div className="flex flex-col gap-2">
          {(["bronze", "silver", "gold"] as GardenTier[]).map((tier) => {
            const meta = GARDEN_TIER_META[tier];
            const dot =
              tier === "bronze" ? "bg-[#cd7f32]" : tier === "silver" ? "bg-[#c0c0c0]" : "bg-[#ffd23f]";
            return (
              <div key={tier} className="flex items-center gap-2.5">
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dot)} />
                <span className="text-[11px] font-medium text-neutral-600">{meta.label}</span>
                <span className="ml-auto text-[10px] text-neutral-400">{meta.hint}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
