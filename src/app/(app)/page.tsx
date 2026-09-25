import { getActiveProfileId } from "@/lib/session";
import { getOwnProfileId } from "@/lib/auth";
import {
  getProfile,
  getDayLog,
  getAllLogsByDate,
  getQadaOwedCount,
  getTags,
  getLogTagsMap,
  getActiveChallenge,
} from "@/lib/db/repo";
import { todayIso, addDays } from "@/lib/date";
import { formatHijri } from "@/lib/hijri";
import { PRAYER_ORDER } from "@/lib/prayers";
import { currentStreak, dayCompletionPct } from "@/lib/streaks";
import { evaluateChallenge } from "@/lib/challenge-progress";
import { computePrayerTimes, nextPrayer } from "@/lib/prayer-times";
import Link from "next/link";
import { PrayerCard } from "@/components/prayer-card";
import { NextPrayerBanner } from "@/components/next-prayer-banner";
import { ProgressRing } from "@/components/progress-ring";
import { DailyOverviewButton } from "@/components/daily-overview-button";
import { QuoteCard } from "@/components/quote-card";
import { LiveClock } from "@/components/live-clock";
import { QUOTES } from "@/lib/quotes";
import { Flame, Trophy } from "lucide-react";
import type { Status } from "@/lib/db/schema";

const ON_TIME_STATUSES: Status[] = ["on_time_jamaah", "on_time", "jamaah"];
const LATE_STATUSES: Status[] = ["late", "qada"];

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 20) return "Good evening";
  return "Good night";
}

export default async function HomePage() {
  const profileId = await getActiveProfileId();
  const ownProfileId = await getOwnProfileId();
  const readOnly = ownProfileId !== null && profileId !== ownProfileId;
  const profile = await getProfile(profileId);
  const haydEnabled = profile?.gender === "female" && !!profile.haydMode;
  const date = todayIso();
  const now = new Date();

  const [dayLog, allLogs, qadaOwed, allTags, logTagsMap, activeChallenge] = await Promise.all([
    getDayLog(profileId, date),
    getAllLogsByDate(profileId),
    getQadaOwedCount(profileId),
    getTags(profileId),
    getLogTagsMap(profileId),
    getActiveChallenge(profileId),
  ]);

  const challengeEndsOn = activeChallenge
    ? addDays(activeChallenge.startDate, activeChallenge.durationDays - 1)
    : null;
  const challengeDaysLeft = challengeEndsOn
    ? Math.max(0, Math.round((new Date(challengeEndsOn).getTime() - new Date(date).getTime()) / 86_400_000) + 1)
    : 0;
  const challengeLabel =
    activeChallenge?.type === "all_on_time" ? "All On Time" : "No Missed Prayers";
  const challengeProgress = activeChallenge ? evaluateChallenge(activeChallenge, allLogs, date) : null;

  const streak = currentStreak(allLogs, date);
  const pct = dayCompletionPct(dayLog);
  const quoteIndex = now.getDate() % QUOTES.length;
  const quote = QUOTES[quoteIndex];

  const statuses = Object.values(dayLog);
  const onTimeCount = statuses.filter((s) => ON_TIME_STATUSES.includes(s)).length;
  const lateCount = statuses.filter((s) => LATE_STATUSES.includes(s)).length;
  const missedCount = statuses.filter((s) => s === "missed").length;

  const locationPrefs = {
    latitude: profile?.latitude ?? null,
    longitude: profile?.longitude ?? null,
    calcMethod: profile?.calcMethod ?? null,
    madhab: profile?.madhab ?? "shafi",
  } as const;
  const todayTimes = computePrayerTimes(locationPrefs, now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowTimes = todayTimes ? computePrayerTimes(locationPrefs, tomorrow) : null;
  const upcoming = todayTimes && tomorrowTimes ? nextPrayer(locationPrefs, now, todayTimes, tomorrowTimes) : null;
  const timeFmt = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            {greeting(now.getHours())}
          </p>
          <h1 className="text-2xl font-extrabold text-neutral-900">{profile?.name ?? "You"}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-neutral-600 shadow-sm">
              {now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </span>
            <LiveClock
              initial={now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
            />
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              {formatHijri(now)}
            </span>
          </div>
        </div>
        {!readOnly && (
          <Link
            href="/challenges/new"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm hover:bg-neutral-50"
            aria-label="Start a new challenge"
          >
            <Trophy className="h-5 w-5" />
          </Link>
        )}
      </div>

      {upcoming ? (
        <NextPrayerBanner prayer={upcoming.prayer} at={upcoming.at.toISOString()} now={now.toISOString()} />
      ) : (
        <Link
          href="/settings"
          className="flex items-center justify-between rounded-2xl bg-white px-3.5 py-2.5 text-xs font-medium text-neutral-500 shadow-sm hover:bg-neutral-50"
        >
          Set your location to see accurate azan times
          <span className="font-semibold text-emerald-700">Set up &rarr;</span>
        </Link>
      )}

      <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <ProgressRing pct={pct} />
        <div className="flex-1">
          <p className="text-sm font-semibold text-neutral-900">Today&apos;s prayers</p>
          <p className="text-xs text-neutral-400">{pct}% completed so far</p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1.5">
          <Flame className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-bold text-orange-600">{streak}</span>
        </div>
      </div>

      {qadaOwed > 0 && (
        <div className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-800">
          You have <span className="font-bold">{qadaOwed}</span> qada prayer{qadaOwed === 1 ? "" : "s"} owed. Catch up by marking a prayer as Qada.
        </div>
      )}

      {activeChallenge && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-3.5 py-2.5">
          <Trophy className="h-4 w-4 shrink-0 text-emerald-600" />
          <p className="flex-1 text-xs font-medium text-emerald-800">
            <span className="font-bold">{challengeLabel}</span> challenge active &mdash; {challengeDaysLeft} day
            {challengeDaysLeft === 1 ? "" : "s"} left
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {PRAYER_ORDER.map((prayer) => (
          <PrayerCard
            key={prayer}
            profileId={profileId}
            date={date}
            prayer={prayer}
            status={dayLog[prayer] ?? "not_yet"}
            tags={logTagsMap[`${date}_${prayer}`] ?? []}
            allTags={allTags}
            readOnly={readOnly}
            haydEnabled={haydEnabled}
            time={todayTimes ? timeFmt(todayTimes[prayer]) : undefined}
            isNext={upcoming?.prayer === prayer}
          />
        ))}
      </div>

      <QuoteCard quotes={QUOTES} initialIndex={quoteIndex} />

      <DailyOverviewButton
        pct={pct}
        onTime={onTimeCount}
        late={lateCount}
        missed={missedCount}
        quoteText={quote.text}
        quoteRef={quote.ref}
        profileId={profileId}
        challenge={
          activeChallenge && challengeProgress
            ? { id: activeChallenge.id, durationDays: activeChallenge.durationDays, progress: challengeProgress }
            : null
        }
      />
    </div>
  );
}
