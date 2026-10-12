import { Luggage } from "lucide-react";
import { loadFinanceContext } from "@/lib/finance-data";
import { getTripsByProfile, getTripSpend } from "@/lib/db/repo-finance";
import { TripFormButton } from "@/components/finance/trip-form";
import { TripRowItem } from "@/components/finance/trip-row";

export const metadata = { title: "Trips" };

export default async function TripsPage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const { member } = await searchParams;
  const ctx = await loadFinanceContext(member);
  const trips = (await getTripsByProfile(ctx.viewingId)).filter((t) => !t.archivedAt);
  const spendByTrip = await getTripSpend(trips.map((t) => t.id));

  return (
    <div className="flex flex-col gap-4 md:mx-auto md:max-w-2xl">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-h-muted">Planning</p>
          <h1 className="text-2xl font-extrabold tracking-tight">Trips</h1>
        </div>
        {!ctx.readOnly && <TripFormButton />}
      </div>

      {trips.length === 0 ? (
        <div className="h-card flex flex-col items-center gap-3 p-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-h-brand-soft text-h-brand">
            <Luggage className="h-7 w-7" />
          </span>
          <p className="text-base font-extrabold">No trips yet</p>
          <p className="mx-auto max-w-sm text-sm text-h-muted">Set a date range and a budget pool, then tag transactions to it while you travel.</p>
        </div>
      ) : (
        <div className="h-card p-2">
          <ul className="flex flex-col divide-y divide-h-border">
            {trips.map((t) => (
              <TripRowItem key={t.id} trip={t} spend={spendByTrip.get(t.id) ?? 0} readOnly={ctx.readOnly} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
