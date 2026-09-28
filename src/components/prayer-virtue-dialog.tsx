"use client";

import { useState } from "react";
import { BookOpen, X } from "lucide-react";
import type { Prayer } from "@/lib/db/schema";
import { PRAYER_META } from "@/lib/prayers";
import { nextPrayerVirtue } from "@/lib/prayer-benefits";
import { VirtueAura } from "@/components/virtue-aura";

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
  // Picked once per dialog open (this component remounts each time it's shown), cycling through
  // that prayer's pool so the same quote doesn't repeat every time.
  const [virtue] = useState(() => nextPrayerVirtue(prayer));

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

          <div className="relative mt-4 flex flex-col items-center gap-3 rounded-2xl bg-emerald-50 p-5 pt-9 text-center">
            {/* This wrapper is exactly the badge's size, so the aura anchors precisely on it and
                spills outward from there — past the card, and past the sheet itself, since
                nothing in this ancestor chain clips overflow. */}
            <div className="relative flex h-14 w-14 items-center justify-center">
              <VirtueAura />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 ring-4 ring-white/70">
                <BookOpen className="h-6 w-6 text-emerald-700" />
              </div>
            </div>
            <p className="relative z-30 text-sm font-medium leading-relaxed text-emerald-950">{virtue.quote}</p>
            <p className="relative z-30 text-xs font-semibold text-emerald-700">{virtue.reference}</p>
          </div>

          <button
            type="button"
            onClick={onPrayNow}
            className="mt-5 rounded-full bg-emerald-700 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
          >
            Pray Now
          </button>
        </div>
      </div>
    </>
  );
}
