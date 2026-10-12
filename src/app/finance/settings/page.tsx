import { redirect } from "next/navigation";
import { loadFinanceContext } from "@/lib/finance-data";
import { BudgetSettingsForm } from "@/components/finance/budget-settings-form";
import { CategoryManager } from "@/components/finance/category-manager";
import { Card } from "@/components/finance/ui/card";
import { Separator } from "@/components/finance/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/finance/ui/tabs";

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

      <Separator className="bg-h-border" />

      <Tabs defaultValue="income">
        <TabsList className="bg-h-surface2">
          <TabsTrigger value="income">Income & payday</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>
        <TabsContent value="income" className="flex flex-col gap-2 pt-2">
          <BudgetSettingsForm settings={ctx.budget} />
        </TabsContent>
        <TabsContent value="categories" className="flex flex-col gap-2 pt-2">
          <Card className="h-card border-h-border bg-h-surface p-4 py-4 text-h-fg">
            <CategoryManager categories={ctx.categories} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
