import { HandCoins } from "lucide-react";
import { loadFinanceContext } from "@/lib/finance-data";
import { getLendingByProfile } from "@/lib/db/repo-finance";
import { LendingFormButton } from "@/components/finance/lending-form";
import { LendingList } from "@/components/finance/lending-list";
import { Card } from "@/components/finance/ui/card";

export const metadata = { title: "Lending" };

export default async function LendingPage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const { member } = await searchParams;
  const ctx = await loadFinanceContext(member);

  if (ctx.readOnly) {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center md:mx-auto md:max-w-2xl">
        <HandCoins className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-semibold text-muted-foreground">Lending and borrowing is personal — it isn&apos;t shared with your partner.</p>
      </Card>
    );
  }

  const entries = await getLendingByProfile(ctx.viewingId);
  const net = entries
    .filter((e) => e.status !== "settled")
    .reduce((s, e) => s + (e.direction === "lent" ? e.amount : -e.amount), 0);

  return (
    <div className="flex flex-col gap-4 md:mx-auto md:max-w-2xl">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-base font-medium">Lending</h1>
          <p className={`text-sm text-muted-foreground ${net < 0 ? "text-destructive" : ""}`}>
            Net owed to you · RM {net.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <LendingFormButton />
      </div>
      <Card className="p-2">
        <LendingList entries={entries} />
      </Card>
    </div>
  );
}
