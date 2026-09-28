"use client";

import { Sparkles, X } from "lucide-react";
import type { PrayerBenefit } from "@/lib/prayer-benefits";

export function PrayerBenefitDialog({
  benefit,
  onClose,
}: {
  benefit: PrayerBenefit;
  onClose: () => void;
}) {
  return (
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

        <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl bg-amber-50 p-5 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
            <Sparkles className="h-5 w-5 text-amber-600" />
          </div>
          <p className="text-sm font-bold text-neutral-900">{benefit.title}</p>
          <p className="text-sm leading-relaxed text-neutral-600">{benefit.body}</p>
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
  );
}
