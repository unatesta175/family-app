"use client";

import { BookOpen, X } from "lucide-react";
import type { Prayer } from "@/lib/db/schema";
import { PRAYER_META } from "@/lib/prayers";
import { PRAYER_VIRTUES } from "@/lib/prayer-benefits";

export function PrayerVirtueDialog({
  prayer,
  onPrayNow,
  onClose,
}: {
  prayer: Prayer;
  onPrayNow: () => void;
  onClose: () => void;
}) {
  const meta = PRAYER_META[prayer];
  const virtue = PRAYER_VIRTUES[prayer];

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
            Virtue of {meta.label}
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

        <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl bg-emerald-50 p-5 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
            <BookOpen className="h-5 w-5 text-emerald-700" />
          </div>
          <p className="text-sm font-medium leading-relaxed text-emerald-950">{virtue.quote}</p>
          <p className="text-xs font-semibold text-emerald-700">{virtue.reference}</p>
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onPrayNow}
            className="rounded-full bg-emerald-700 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
          >
            Pray Now
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-neutral-100 py-3 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-200"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
