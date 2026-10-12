import { redirect } from "next/navigation";
import { loadFinanceContext } from "@/lib/finance-data";
import { BudgetSettingsForm } from "@/components/finance/budget-settings-form";
import { CategoryManager } from "@/components/finance/category-manager";

export const metadata = { title: "Settings" };

export default async function FinanceSettingsPage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const { member } = await searchParams;
  const ctx = await loadFinanceContext(member);
  if (ctx.readOnly) redirect("/finance");

  return (
    <div className="flex flex-col gap-6 md:mx-auto md:max-w-2xl">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-h-muted">Settings</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Finance settings</h1>
        <p className="mt-1 text-sm text-h-muted">Currency is MYR (RM). Income and payday drive your daily budget and payday countdown.</p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-xs font-extrabold uppercase tracking-wider text-h-muted">Income & payday</h2>
        <BudgetSettingsForm settings={ctx.budget} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-xs font-extrabold uppercase tracking-wider text-h-muted">Categories</h2>
        <div className="h-card p-4">
          <CategoryManager categories={ctx.categories} />
        </div>
      </section>
    </div>
  );
}
