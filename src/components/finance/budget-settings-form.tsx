"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/finance/ui/button";
import { Input } from "@/components/finance/ui/input";
import { Switch } from "@/components/finance/ui/switch";
import { saveBudgetSettingsAction } from "@/lib/finance-actions";
import type { BudgetSettingsRow } from "@/lib/db/repo-finance";

export function BudgetSettingsForm({ settings }: { settings: BudgetSettingsRow | null }) {
  const [monthlyIncome, setMonthlyIncome] = useState(String(settings?.monthlyIncome ?? ""));
  const [paydayDay, setPaydayDay] = useState(String(settings?.paydayDay ?? 25));
  const [override, setOverride] = useState(settings?.dailyBudgetOverride !== null && settings?.dailyBudgetOverride !== undefined ? String(settings.dailyBudgetOverride) : "");
  const [adaptiveBudget, setAdaptiveBudget] = useState(settings?.adaptiveBudget ?? false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await saveBudgetSettingsAction({
        monthlyIncome: Number(monthlyIncome) || 0,
        paydayDay: Number(paydayDay) || 1,
        dailyBudgetOverride: override ? Number(override) : null,
        adaptiveBudget,
      });
      if (!res.ok) setError(res.error);
      else setSaved(true);
    });
  }

  return (
    <div className="h-card flex flex-col gap-3 p-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-bold text-h-muted">Monthly income (RM)</span>
        <Input type="number" inputMode="decimal" step="0.01" value={monthlyIncome} onChange={(e) => setMonthlyIncome(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-bold text-h-muted">Payday (day of month)</span>
        <Input type="number" min={1} max={31} value={paydayDay} onChange={(e) => setPaydayDay(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-bold text-h-muted">Daily budget override (RM, optional)</span>
        <Input type="number" inputMode="decimal" step="0.01" value={override} onChange={(e) => setOverride(e.target.value)} placeholder="Leave empty to use income ÷ days in month" />
      </label>
      <label className="flex items-center justify-between gap-3 rounded-md border border-h-border px-3 py-2.5">
        <span className="flex flex-col">
          <span className="text-xs font-bold">Adaptive daily budget</span>
          <span className="text-[11px] text-h-muted">Today&apos;s allowance = remaining budget ÷ days left to payday. Overspend one day, tomorrow shrinks; underspend, tomorrow grows.</span>
        </span>
        <Switch checked={adaptiveBudget} onCheckedChange={setAdaptiveBudget} />
      </label>
      {error && <p className="text-xs font-semibold text-h-bad">{error}</p>}
      {saved && !error && <p className="text-xs font-semibold text-h-good">Saved.</p>}
      <Button type="button" onClick={submit} disabled={pending} className="self-start bg-h-brand text-h-brand-fg hover:opacity-90">
        {pending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
