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
      <Card className="h-card items-center gap-3 border-h-border bg-h-surface p-8 py-8 text-center text-h-fg md:mx-auto md:max-w-2xl">
        <HandCoins className="h-8 w-8 text-h-muted" />
        <p className="text-sm font-semibold text-h-muted">Lending and borrowing is personal — it isn&apos;t shared with your partner.</p>
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
          <p className="text-xs font-bold uppercase tracking-wider text-h-muted">Net owed to you</p>
          <h1 className={`text-2xl font-extrabold tracking-tight ${net < 0 ? "text-h-bad" : "text-h-fg"}`}>
            RM {net.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h1>
        </div>
        <LendingFormButton />
      </div>
      <Card className="h-card border-h-border bg-h-surface p-2 py-2 text-h-fg">
        <LendingList entries={entries} />
      </Card>
    </div>
  );
}
