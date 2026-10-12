import { Bell } from "lucide-react";
import { loadFinanceContext } from "@/lib/finance-data";
import { getRemindersByProfile } from "@/lib/db/repo-finance";
import { ReminderFormButton } from "@/components/finance/reminder-form";
import { ReminderRowItem } from "@/components/finance/reminder-row";
import { Card } from "@/components/finance/ui/card";

export const metadata = { title: "Reminders" };

export default async function RemindersPage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const { member } = await searchParams;
  const ctx = await loadFinanceContext(member);
  const reminders = await getRemindersByProfile(ctx.viewingId);

  return (
    <div className="flex flex-col gap-4 md:mx-auto md:max-w-2xl">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Planning</p>
          <h1 className="text-2xl font-extrabold tracking-tight">Reminders</h1>
        </div>
        {!ctx.readOnly && <ReminderFormButton />}
      </div>

      {reminders.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent text-primary">
            <Bell className="h-7 w-7" />
          </span>
          <p className="text-base font-extrabold">No reminders yet</p>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">Anything money-related that isn&apos;t a recurring bill — renewals, one-off dues, follow-ups.</p>
        </Card>
      ) : (
        <Card className="p-2">
          <ul className="flex flex-col divide-y divide-border">
            {reminders.map((r) => (
              <ReminderRowItem key={r.id} reminder={r} today={ctx.today} readOnly={ctx.readOnly} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
