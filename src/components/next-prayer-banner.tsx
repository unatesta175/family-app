"use client";

import { useEffect, useState } from "react";
import { PRAYER_META } from "@/lib/prayers";
import type { Prayer } from "@/lib/db/schema";

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Live-updating "next azan" banner; server passes the target time, client just counts down. */
export function NextPrayerBanner({ prayer, at, now }: { prayer: Prayer; at: string; now: string }) {
  const target = new Date(at).getTime();
  const [remaining, setRemaining] = useState(() => target - new Date(now).getTime());

  useEffect(() => {
    const id = setInterval(() => setRemaining(target - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  const meta = PRAYER_META[prayer];
  const Icon = meta.icon;
  const time = new Date(at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-neutral-900 px-4 py-3 text-white shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.bg}`}>
        <Icon className={`h-5 w-5 ${meta.fg}`} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-neutral-300">Next: {meta.label} at {time}</p>
        <p className="text-lg font-extrabold tabular-nums">{formatCountdown(remaining)}</p>
      </div>
    </div>
  );
}
