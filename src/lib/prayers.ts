import { Sunrise, Sun, CloudSun, Sunset, MoonStar, Clock, Check, CheckCheck, Users, RotateCcw, X, Heart } from "lucide-react";
import type { Prayer, Status } from "@/lib/db/schema";

export const PRAYER_META: Record<
  Prayer,
  { label: string; icon: typeof Sunrise; bg: string; fg: string }
> = {
  fajr: { label: "Fajr", icon: Sunrise, bg: "bg-sky-100", fg: "text-sky-700" },
  dhuhr: { label: "Dhuhr", icon: Sun, bg: "bg-amber-100", fg: "text-amber-700" },
  asr: { label: "Asr", icon: CloudSun, bg: "bg-orange-100", fg: "text-orange-700" },
  maghrib: { label: "Maghrib", icon: Sunset, bg: "bg-rose-100", fg: "text-rose-700" },
  isha: { label: "Isha", icon: MoonStar, bg: "bg-indigo-100", fg: "text-indigo-700" },
};

export const STATUS_META: Record<
  Status,
  { label: string; short: string; goodFor: boolean }
> = {
  on_time_jamaah: { label: "On Time + Jamaah", short: "On Time+J", goodFor: true },
  on_time: { label: "On Time", short: "On Time", goodFor: true },
  jamaah: { label: "Jamaah", short: "Jamaah", goodFor: true },
  late: { label: "Late", short: "Late", goodFor: true },
  qada: { label: "Qada", short: "Qada", goodFor: false },
  missed: { label: "Missed", short: "Missed", goodFor: false },
  not_yet: { label: "Not yet", short: "—", goodFor: false },
  excused: { label: "Excused (Hayd)", short: "Excused", goodFor: true },
};

/**
 * How much each status counts toward a prayer's "quality" (0-100), used by the
 * garden to size/color/droop the tree by more than just a raw done/not-done
 * count. On_time_jamaah is the ceiling; missed and not_yet are the floor.
 * `excused` (Hayd) is full credit — a valid Islamic exemption should never
 * read as a lapse in the streak or garden.
 */
export const STATUS_QUALITY: Record<Status, number> = {
  on_time_jamaah: 100,
  on_time: 90,
  jamaah: 70,
  late: 65,
  qada: 22,
  missed: 0,
  not_yet: 0,
  excused: 100,
};

/** Order prayers appear through the day. */
export const PRAYER_ORDER: Prayer[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

/** All 6 loggable statuses, in the order status toggles/pills should display them. */
export const STATUS_ORDER: Exclude<Status, "not_yet">[] = [
  "on_time_jamaah",
  "on_time",
  "jamaah",
  "late",
  "qada",
  "missed",
];

export const STATUS_ICON: Record<Status, typeof Clock> = {
  on_time_jamaah: CheckCheck,
  on_time: Check,
  jamaah: Users,
  late: Clock,
  qada: RotateCcw,
  missed: X,
  not_yet: Clock,
  excused: Heart,
};

/**
 * A day "counts" toward completion if the prayer was actually performed (any
 * timing), or if it was `excused` (Hayd) — an excusal is a valid reason not
 * to pray, not a lapse, so it must count the same as performed everywhere
 * this is checked (streaks, garden growth, completion %).
 */
export function isPerformed(status: Status): boolean {
  return (
    status === "on_time_jamaah" ||
    status === "on_time" ||
    status === "jamaah" ||
    status === "late" ||
    status === "qada" ||
    status === "excused"
  );
}

/** Whether a status was prayed in congregation (jamaah), on time or otherwise. */
export function isJamaah(status: Status): boolean {
  return status === "on_time_jamaah" || status === "jamaah";
}

/** Whether a status counts as "on time" for on-time-focused challenges/stats. */
export function isOnTime(status: Status): boolean {
  return status === "on_time_jamaah" || status === "on_time";
}

/** Short, human status label used in read-only detail views (day sheet, history). */
export function detailStatusLabel(status: Status): string {
  switch (status) {
    case "on_time_jamaah":
      return "Ontime + Jamaah";
    case "on_time":
      return "Ontime";
    case "jamaah":
      return "Prayed";
    case "late":
      return "Late";
    case "qada":
      return "Qada";
    case "missed":
      return "Missed";
    case "excused":
      return "Excused (Hayd)";
    default:
      return "Pending";
  }
}
