import Link from "next/link";
import { ArrowLeft, Sparkles, CalendarDays, Flame, Cake } from "lucide-react";
import { getActiveProfileId } from "@/lib/session";
import { getAllLogsByDate, getProfile } from "@/lib/db/repo";
import { todayIso } from "@/lib/date";
import { PRAYER_ORDER, PRAYER_META } from "@/lib/prayers";
import { bestStreak } from "@/lib/streaks";
import {
  computeLifetimeStats,
  computePrayerBreakdown,
  computeYearlyBreakdown,
  daysLoggedCount,
  firstLogDateOf,
} from "@/lib/stats";
import { computeMilestones } from "@/lib/milestones";
import { MilestonesSection } from "@/components/milestones-section";

const PRAYER_TILE_STYLE: Record<string, { card: string; icon: string; track: string; bar: string }> = {
  fajr: {
    card: "border-rose-200 bg-rose-50",
    icon: "bg-rose-100 text-rose-600",
    track: "bg-rose-100",
    bar: "bg-orange-400",
  },
  dhuhr: {
    card: "border-amber-200 bg-amber-50",
    icon: "bg-amber-100 text-amber-600",
    track: "bg-amber-100",
    bar: "bg-yellow-500",
  },
  asr: {
    card: "border-amber-300 bg-amber-100/70",
    icon: "bg-amber-200 text-amber-800",
    track: "bg-amber-200/70",
    bar: "bg-amber-800",
  },
  maghrib: {
    card: "border-indigo-200 bg-indigo-50",
    icon: "bg-indigo-100 text-indigo-600",
    track: "bg-indigo-100",
    bar: "bg-indigo-600",
  },
  isha: {
    card: "border-neutral-300 bg-neutral-100",
    icon: "bg-neutral-200 text-neutral-700",
    track: "bg-neutral-200",
    bar: "bg-neutral-800",
  },
};

export default async function LifetimeJourneyPage() {
  const profileId = await getActiveProfileId();
  const [logsByDate, profile] = await Promise.all([getAllLogsByDate(profileId), getProfile(profileId)]);

  const today = todayIso();
  const firstLogDate = firstLogDateOf(logsByDate);
  const lifetime = computeLifetimeStats(logsByDate, today, firstLogDate, profile?.age);
  const best = bestStreak(logsByDate);
  const daysLogged = daysLoggedCount(logsByDate);
  const prayerBreakdown = computePrayerBreakdown(logsByDate);
  const yearly = computeYearlyBreakdown(logsByDate, today);
  const milestones = computeMilestones({
    totalPrayed: lifetime.totalPrayed,
    bestStreak: best,
    daysLogged,
    prayerBreakdown,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/stats"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 shadow-sm transition-colors hover:border-emerald-200 hover:text-emerald-700"
          aria-label="Back to Stats"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-base font-bold text-neutral-900">Lifetime Journey</h1>
          <p className="text-xs text-neutral-400">Your prayer record over a lifetime</p>
        </div>
      </div>

      <div className="rounded-3xl bg-white py-2">
        <BigRing
          pct={lifetime.pctPrecise}
          totalPrayed={lifetime.totalPrayed}
          totalPossible={lifetime.totalPossible}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatTile icon={Sparkles} tone="emerald" value={lifetime.totalPrayed} label="Total Prayers" />
        <StatTile icon={CalendarDays} tone="amber" value={daysLogged} label="Days Logged" />
        <StatTile icon={Flame} tone="violet" value={best} label="Best Streak" suffix=" days" />
        <StatTile icon={Cake} tone="rose" value={profile?.age ?? "—"} label="Age" suffix=" years" />
      </div>

      <section>
        <SectionHeading>Prayer Breakdown</SectionHeading>
        <div className="grid grid-cols-2 gap-3">
          {PRAYER_ORDER.map((prayer) => {
            const meta = PRAYER_META[prayer];
            const Icon = meta.icon;
            const stat = prayerBreakdown[prayer];
            const style = PRAYER_TILE_STYLE[prayer];
            return (
              <div key={prayer} className={`rounded-2xl border p-4 ${style.card}`}>
                <div className="flex items-center gap-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full ${style.icon}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-sm font-bold text-neutral-900">{meta.label}</p>
                </div>
                <div className={`mt-3 h-1.5 w-full rounded-full ${style.track}`}>
                  <div
                    className={`h-1.5 rounded-full ${style.bar}`}
                    style={{ width: `${Math.max(stat.pct, stat.performed > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-neutral-700">{stat.performed}</span>
                    {stat.missed > 0 && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-200 text-[10px] font-bold text-rose-700">
                        {stat.missed}
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-neutral-700">{stat.pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <SectionHeading>Year by Year</SectionHeading>
        <div className="flex flex-col gap-2">
          {yearly.map((y) => (
            <div
              key={y.year}
              className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                {y.year}
              </span>
              <div className="flex-1">
                <div className="h-1.5 w-full rounded-full bg-emerald-100/80">
                  <div
                    className="h-1.5 rounded-full bg-emerald-600"
                    style={{ width: `${Math.max(y.pct, y.performed > 0 ? 2 : 0)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-neutral-400">
                  {y.performed} of {y.total.toLocaleString()} prayers
                </p>
              </div>
              <span className="shrink-0 text-sm font-bold text-emerald-700">{y.pct}%</span>
            </div>
          ))}
        </div>
      </section>

      <MilestonesSection milestones={milestones} />
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400">{children}</p>
  );
}

const TILE_TONE: Record<string, { card: string; icon: string; label: string }> = {
  emerald: { card: "border-emerald-200 bg-emerald-50", icon: "bg-emerald-100 text-emerald-700", label: "text-emerald-700/70" },
  amber: { card: "border-amber-200 bg-amber-50", icon: "bg-amber-100 text-amber-700", label: "text-amber-700/70" },
  violet: { card: "border-violet-200 bg-violet-50", icon: "bg-violet-100 text-violet-700", label: "text-violet-700/70" },
  rose: { card: "border-rose-200 bg-rose-50", icon: "bg-rose-100 text-rose-700", label: "text-rose-700/70" },
};

function StatTile({
  icon: Icon,
  tone,
  value,
  label,
  suffix = "",
}: {
  icon: typeof Sparkles;
  tone: "emerald" | "amber" | "violet" | "rose";
  value: number | string;
  label: string;
  suffix?: string;
}) {
  const style = TILE_TONE[tone];
  return (
    <div className={`rounded-2xl border p-4 ${style.card}`}>
      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${style.icon}`}>
        <Icon className="h-4 w-4" strokeWidth={2.25} />
      </div>
      <p className="mt-2 text-xl font-extrabold leading-none text-neutral-900">
        {value}
        {typeof value === "number" && suffix && <span className="text-sm font-bold opacity-60">{suffix}</span>}
      </p>
      <p className={`mt-0.5 text-xs ${style.label}`}>{label}</p>
    </div>
  );
}

function BigRing({
  pct,
  totalPrayed,
  totalPossible,
}: {
  pct: number;
  totalPrayed: number;
  totalPossible: number;
}) {
  const clamped = Math.min(100, pct);
  const r = 84;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  const angle = (clamped / 100) * 360 - 90;
  const dotX = 100 + r * Math.cos((angle * Math.PI) / 180);
  const dotY = 100 + r * Math.sin((angle * Math.PI) / 180);

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-48 w-48">
        <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
          <circle cx="100" cy="100" r={r} fill="none" stroke="#f1f4f2" strokeWidth="10" />
          <circle
            cx="100"
            cy="100"
            r={r}
            fill="none"
            stroke="#0f7a4c"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <span
          className="absolute h-3.5 w-3.5 rounded-full bg-emerald-700 ring-4 ring-white"
          style={{
            left: `${(dotX / 200) * 100}%`,
            top: `${(dotY / 200) * 100}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-4xl font-extrabold tracking-tight text-neutral-900">{pct.toFixed(1)}%</p>
          <span className="mt-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {totalPrayed} / {totalPossible.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
