import { redirect } from "next/navigation";
import { loadFinanceContext } from "@/lib/finance-data";
import { BudgetSettingsForm } from "@/components/finance/budget-settings-form";
import { CategoryManager } from "@/components/finance/category-manager";
import { Card } from "@/components/finance/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/finance/ui/tabs";

export const metadata = { title: "Settings" };

export default async function FinanceSettingsPage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const { member } = await searchParams;
  const ctx = await loadFinanceContext(member);
  if (ctx.readOnly) redirect("/finance");

  return (
    <div className="flex flex-col gap-6 md:mx-auto md:max-w-2xl">
      <div>
        <h1 className="text-base font-medium">Finance settings</h1>
        <p className="text-sm text-muted-foreground">Currency is MYR (RM). Income and payday drive your daily budget and payday countdown.</p>
      </div>

      <Tabs defaultValue="income">
        <TabsList>
          <TabsTrigger value="income">Income & payday</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>
        <TabsContent value="income" className="pt-3">
          <BudgetSettingsForm settings={ctx.budget} />
        </TabsContent>
        <TabsContent value="categories" className="pt-3">
          <Card className="p-4">
            <CategoryManager categories={ctx.categories} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
