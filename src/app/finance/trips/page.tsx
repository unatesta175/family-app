import { Luggage } from "lucide-react";
import { loadFinanceContext } from "@/lib/finance-data";
import { getTripsByProfile, getTripSpend } from "@/lib/db/repo-finance";
import { TripFormButton } from "@/components/finance/trip-form";
import { TripRowItem } from "@/components/finance/trip-row";
import { Card } from "@/components/finance/ui/card";

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
          <h1 className="text-base font-medium">Trips</h1>
          <p className="text-sm text-muted-foreground">Planning</p>
        </div>
        {!ctx.readOnly && <TripFormButton />}
      </div>

      {trips.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent text-primary">
            <Luggage className="h-7 w-7" />
          </span>
          <p className="text-base font-extrabold">No trips yet</p>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">Set a date range and a budget pool, then tag transactions to it while you travel.</p>
        </Card>
      ) : (
        <Card className="p-2">
          <ul className="flex flex-col divide-y divide-border">
            {trips.map((t) => (
              <TripRowItem key={t.id} trip={t} spend={spendByTrip.get(t.id) ?? 0} readOnly={ctx.readOnly} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
