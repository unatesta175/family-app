"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/finance/ui/button";
import { Input } from "@/components/finance/ui/input";
import { Label } from "@/components/finance/ui/label";
import { Card } from "@/components/finance/ui/card";
import { saveBudgetSettingsAction } from "@/lib/finance-actions";
import type { BudgetSettingsRow } from "@/lib/db/repo-finance";

export function BudgetSettingsForm({ settings }: { settings: BudgetSettingsRow | null }) {
  const [monthlyIncome, setMonthlyIncome] = useState(String(settings?.monthlyIncome ?? ""));
  const [paydayDay, setPaydayDay] = useState(String(settings?.paydayDay ?? 25));
  const [override, setOverride] = useState(settings?.dailyBudgetOverride !== null && settings?.dailyBudgetOverride !== undefined ? String(settings.dailyBudgetOverride) : "");
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
      });
      if (!res.ok) setError(res.error);
      else setSaved(true);
    });
  }

  return (
    <Card className="h-card gap-3 border-h-border bg-h-surface p-4 py-4 text-h-fg">
      <div className="flex flex-col gap-1">
        <Label className="text-xs font-bold text-h-muted">Monthly income (RM)</Label>
        <Input type="number" inputMode="decimal" step="0.01" value={monthlyIncome} onChange={(e) => setMonthlyIncome(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs font-bold text-h-muted">Payday (day of month)</Label>
        <Input type="number" min={1} max={31} value={paydayDay} onChange={(e) => setPaydayDay(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs font-bold text-h-muted">Daily budget override (RM, optional)</Label>
        <Input type="number" inputMode="decimal" step="0.01" value={override} onChange={(e) => setOverride(e.target.value)} placeholder="Leave empty to use income ÷ days in month" />
      </div>
      {error && <p className="text-xs font-semibold text-h-bad">{error}</p>}
      {saved && !error && <p className="text-xs font-semibold text-h-good">Saved.</p>}
      <Button type="button" onClick={submit} disabled={pending} className="self-start bg-h-brand text-h-brand-fg hover:opacity-90">
        {pending ? "Saving…" : "Save"}
      </Button>
    </Card>
  );
}
