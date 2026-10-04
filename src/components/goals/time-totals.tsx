"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CalendarRange, Hourglass } from "lucide-react";
import { saveTimeSettingsAction } from "@/lib/time-actions";
import {
  CATEGORY_BY_KEY,
  TIME_CATEGORIES,
  formatHours,
  formatYears,
  totalsFromWeek,
  type TimeCategory,
  type WeekSummary,
} from "@/lib/time-planner";
import { Caption, NumberInput } from "@/components/habits/form-fields";
import { HabitIcon } from "@/components/habits/habit-icon";
import { inputClass } from "@/components/habits/form-bits";
import { cn } from "@/lib/utils";

type Row = { key: string; label: string; color: string; icon: string; perWeek: number; indent?: boolean };

/** Where your time goes, per day, week, month, year and lifetime, worked out from your seven days. */
export function TimeTotals({
  summary,
  lifespanYears,
  yearsLeft,
}: {
  summary: WeekSummary;
  lifespanYears: number;
  yearsLeft: number | null;
}) {
  const hasRemaining = yearsLeft !== null;
  const rows: Row[] = [];
  for (const c of TIME_CATEGORIES) {
    if (c.key === "free") continue; // folded into the free-time row below
    if (summary.week[c.key] > 0) rows.push({ key: c.key, label: c.label, color: c.color, icon: c.icon, perWeek: summary.week[c.key] });
  }
  // Free time = unplanned minutes + minutes you've given a free-time activity.
  rows.push({ key: "free", label: "Free time", color: CATEGORY_BY_KEY.free.color, icon: "gamepad-2", perWeek: summary.freeWeek });
  const activities = Object.entries(summary.freeActivitiesWeek).sort((a, b) => b[1] - a[1]);
  const unplanned = summary.week.unplanned;
  const sorted = rows.sort((a, b) => b.perWeek - a.perWeek);

  const headline = (key: TimeCategory | "free", verb: string) => {
    const perWeek = key === "free" ? summary.freeWeek : summary.week[key];
    if (perWeek <= 0) return null;
    const t = totalsFromWeek(perWeek, lifespanYears, yearsLeft);
    return (
      <li key={key} className="flex items-start gap-2.5 text-sm">
        <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{ background: CATEGORY_BY_KEY[key].color }} />
        <span className="leading-snug">
          You {verb} <strong>{formatHours(t.perWeek)}</strong> a week, <strong>{formatHours(t.perYear)}</strong> a year, and about{" "}
          <strong>{formatYears(t.lifetime / 60)}</strong> of your life.
        </span>
      </li>
    );
  };

  return (
    <section className="h-card flex flex-col gap-4 p-4" aria-label="Time totals">
      <header className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-h-brand-soft text-h-brand">
          <CalendarRange className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-extrabold tracking-tight">Where your time goes</h2>
      </header>

      {summary.daysPlanned < 7 && (
        <p className="flex items-start gap-2 rounded-xl bg-h-break-soft px-3 py-2 text-xs font-semibold leading-snug text-h-break">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {7 - summary.daysPlanned} day{7 - summary.daysPlanned === 1 ? "" : "s"} of the week {7 - summary.daysPlanned === 1 ? "has" : "have"} no routine yet and count as free time. Give every day a routine for accurate totals.
        </p>
      )}

      <ul className="flex flex-col gap-2 rounded-2xl bg-h-surface2 p-3">
        {headline("sleep", "sleep")}
        {headline("pray", "pray")}
        {headline("eat", "spend eating")}
        {headline("free", "have free")}
      </ul>

      <div className="-mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <thead>
            <tr className="text-[10px] font-extrabold uppercase tracking-wider text-h-muted">
              <th className="py-2 pr-2 text-left">Activity</th>
              <th className="px-2 py-2 text-right">Per day</th>
              <th className="px-2 py-2 text-right">Per week</th>
              <th className="px-2 py-2 text-right">Per month</th>
              <th className="px-2 py-2 text-right">Per year</th>
              <th className="py-2 pl-2 text-right">Lifetime</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <TotalsRow key={r.key} row={r} lifespanYears={lifespanYears} yearsLeft={yearsLeft} share={r.perWeek / (24 * 60 * 7)} />
            ))}
            {activities.length > 0 && (
              <>
                <tr>
                  <td colSpan={6} className="pb-1 pt-3 text-[10px] font-extrabold uppercase tracking-wider text-h-muted">
                    What you do with free time
                  </td>
                </tr>
                {activities.map(([name, perWeek]) => (
                  <TotalsRow
                    key={`a-${name}`}
                    row={{ key: `a-${name}`, label: name, color: CATEGORY_BY_KEY.free.color, icon: "gamepad-2", perWeek, indent: true }}
                    lifespanYears={lifespanYears}
                    yearsLeft={yearsLeft}
                    share={perWeek / (24 * 60 * 7)}
                  />
                ))}
                {unplanned > 0 && (
                  <TotalsRow
                    row={{ key: "unplanned", label: "Nothing planned", color: "var(--h-border)", icon: "layers", perWeek: unplanned, indent: true }}
                    lifespanYears={lifespanYears}
                    yearsLeft={yearsLeft}
                    share={unplanned / (24 * 60 * 7)}
                  />
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      <p className="flex items-start gap-2 text-[11px] leading-snug text-h-muted">
        <Hourglass className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Lifetime assumes you keep this routine up to age {lifespanYears}
        {hasRemaining ? ` (about ${Math.round(yearsLeft)} years from now, shown in brackets)` : ". Add your birth date below to also see what is left"}. Months are 30.4 days and years 365.25 days.
      </p>
    </section>
  );

  function TotalsRow({ row, lifespanYears: span, yearsLeft: left, share }: { row: Row; lifespanYears: number; yearsLeft: number | null; share: number }) {
    const t = totalsFromWeek(row.perWeek, span, left);
    return (
      <tr className="border-t border-h-border align-top">
        <td className={cn("py-2 pr-2", row.indent && "pl-4")}>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ background: `${row.color}26`, color: row.color }}>
              <HabitIcon name={row.icon} className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-bold leading-tight">{row.label}</p>
              <div className="mt-1 h-1 w-20 overflow-hidden rounded-full bg-h-surface2">
                <div className="h-full rounded-full" style={{ width: `${Math.max(2, share * 100)}%`, background: row.color }} />
              </div>
            </div>
          </div>
        </td>
        <td className="px-2 py-2 text-right tabular-nums">{formatHours(t.perDay)}</td>
        <td className="px-2 py-2 text-right font-bold tabular-nums">{formatHours(t.perWeek)}</td>
        <td className="px-2 py-2 text-right tabular-nums">{formatHours(t.perMonth)}</td>
        <td className="px-2 py-2 text-right tabular-nums">{formatHours(t.perYear)}</td>
        <td className="py-2 pl-2 text-right tabular-nums">
          <span className="font-bold">{formatHours(t.lifetime)}</span>
          <span className="block text-[10px] font-medium text-h-muted">{formatYears(t.lifetime / 60)}</span>
          {t.remaining !== null && <span className="block text-[10px] font-medium text-h-muted">({formatHours(t.remaining)} left)</span>}
        </td>
      </tr>
    );
  }
}

/** Birth date and the age to plan up to, which turn yearly totals into lifetime totals. */
export function TimeSettings({ birthDate, lifespanYears }: { birthDate: string | null; lifespanYears: number }) {
  const [birth, setBirth] = useState(birthDate ?? "");
  const [span, setSpan] = useState<number | null>(lifespanYears);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await saveTimeSettingsAction({ birthDate: birth || null, lifespanYears: span ?? 80 });
      if (!res.ok) return setError(res.error);
      setSaved(true);
    });
  }

  return (
    <section className="h-card flex flex-col gap-3 p-4" aria-label="Lifetime settings">
      <div>
        <h2 className="text-sm font-extrabold tracking-tight">Lifetime settings</h2>
        <p className="text-xs text-h-muted">Used to turn your daily routine into lifetime totals and to show how much of it is still ahead of you.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1.5">
          <Caption>Birth date (optional)</Caption>
          <input type="date" value={birth} max={new Date().toISOString().slice(0, 10)} onChange={(e) => { setBirth(e.target.value); setSaved(false); }} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <Caption>Plan up to age</Caption>
          <NumberInput integer min={10} max={120} value={span} onChange={(n) => { setSpan(n); setSaved(false); }} aria-label="Lifespan in years" />
        </label>
      </div>
      {error && <p className="text-xs font-semibold text-h-bad">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={pending} className="rounded-xl bg-h-brand px-4 py-2 text-sm font-bold text-h-brand-fg disabled:opacity-60">
          {pending ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-xs font-bold text-h-good">Saved</span>}
      </div>
    </section>
  );
}
