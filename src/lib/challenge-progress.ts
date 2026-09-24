import { PRAYER_ORDER } from "@/lib/prayers";
import { addDays } from "@/lib/date";
import type { DayLogMap } from "@/lib/streaks";
import type { ChallengeType } from "@/lib/db/schema";

export type ChallengeDayStatus = "success" | "failed" | "pending";
export type ChallengeDay = { day: number; date: string; status: ChallengeDayStatus };

export type ChallengeProgress = {
  days: ChallengeDay[];
  doneCount: number;
  failedCount: number;
  leftCount: number;
};

function dayMeetsRule(dayLog: DayLogMap, type: ChallengeType): "success" | "failed" | "pending" {
  let hasViolation = false;
  let hasIncomplete = false;

  for (const prayer of PRAYER_ORDER) {
    const status = dayLog[prayer] ?? "not_yet";
    if (status === "not_yet") {
      hasIncomplete = true;
      continue;
    }
    // Excused (Hayd) is a valid exemption, not a lapse — skip it entirely so it
    // never fails a challenge, even "all on time".
    if (status === "excused") continue;
    if (status === "missed") {
      hasViolation = true;
    } else if (type === "all_on_time" && status !== "on_time" && status !== "on_time_jamaah") {
      hasViolation = true;
    }
  }

  if (hasViolation) return "failed";
  if (hasIncomplete) return "pending";
  return "success";
}

export function evaluateChallenge(
  challenge: { type: ChallengeType; durationDays: number; startDate: string },
  logsByDate: Record<string, DayLogMap>,
  today: string
): ChallengeProgress {
  const days: ChallengeDay[] = [];

  for (let i = 0; i < challenge.durationDays; i++) {
    const date = addDays(challenge.startDate, i);
    const day = i + 1;
    if (date > today) {
      days.push({ day, date, status: "pending" });
      continue;
    }
    const dayLog = logsByDate[date] ?? {};
    days.push({ day, date, status: dayMeetsRule(dayLog, challenge.type) });
  }

  const doneCount = days.filter((d) => d.status === "success").length;
  const failedCount = days.filter((d) => d.status === "failed").length;
  const leftCount = challenge.durationDays - doneCount - failedCount;

  return { days, doneCount, failedCount, leftCount };
}
