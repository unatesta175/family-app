"use client";

import { Sparkles, X } from "lucide-react";
import type { PrayerBenefit } from "@/lib/prayer-benefits";
import { BenefitParticles } from "@/components/benefit-particles";
import { STATUS_QUALITY } from "@/lib/prayers";
import type { Status } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export function PrayerBenefitDialog({
  benefit,
  status,
  onClose,
}: {
  benefit: PrayerBenefit;
  status: Status;
  onClose: () => void;
}) {
  const quality = STATUS_QUALITY[status];
  const grand = quality >= 95;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
        <div
          className="flex w-full max-w-md flex-col rounded-t-3xl bg-white px-5 pb-8 pt-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-neutral-200" />
          <div className="mb-1 flex items-center justify-between">
            <span className="w-8" />
            <p className="text-center text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Benefit received
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-8 rounded-full p-1 text-neutral-400 hover:bg-neutral-100"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="relative mt-4 flex flex-col items-center gap-3 overflow-hidden rounded-2xl bg-amber-50 p-5 text-center">
            <div
              className={cn(
                "pointer-events-none absolute left-1/2 top-8 -translate-x-1/2 rounded-full bg-amber-300/60 blur-2xl",
                grand ? "h-40 w-40" : "h-28 w-28"
              )}
              style={{ animation: "benefit-glow-bloom 1.4s ease-out forwards" }}
            />
            <div
              className={cn(
                "relative flex items-center justify-center rounded-full bg-amber-100",
                grand ? "h-12 w-12 ring-4 ring-amber-200/60" : "h-10 w-10"
              )}
            >
              <Sparkles className={cn("text-amber-600", grand ? "h-6 w-6" : "h-5 w-5")} />
            </div>
            <p className="relative text-sm font-bold text-neutral-900">{benefit.title}</p>
            <p className="relative text-sm leading-relaxed text-neutral-600">{benefit.body}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-5 rounded-full bg-emerald-700 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
          >
            Alhamdulillah
          </button>
        </div>
      </div>

      {/* Rendered above the sheet (higher z-index), so the burst visibly spills past its edges. */}
      <BenefitParticles quality={quality} />
    </>
  );
}
