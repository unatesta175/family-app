import { BookmarkPlus } from "lucide-react";
import { loadFinanceContext } from "@/lib/finance-data";
import { getTemplatesByProfile } from "@/lib/db/repo-finance";
import { TemplateFormButton } from "@/components/finance/template-form";
import { TemplateRowItem } from "@/components/finance/template-row";

export const metadata = { title: "Templates" };

export default async function TemplatesPage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const { member } = await searchParams;
  const ctx = await loadFinanceContext(member);
  const templates = await getTemplatesByProfile(ctx.viewingId);

  return (
    <div className="flex flex-col gap-4 md:mx-auto md:max-w-2xl">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-h-muted">Quick re-entry</p>
          <h1 className="text-2xl font-extrabold tracking-tight">Templates</h1>
        </div>
        {!ctx.readOnly && <TemplateFormButton accounts={ctx.accounts} categories={ctx.categories} />}
      </div>

      {templates.length === 0 ? (
        <div className="h-card flex flex-col items-center gap-3 p-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-h-brand-soft text-h-brand">
            <BookmarkPlus className="h-7 w-7" />
          </span>
          <p className="text-base font-extrabold">No templates yet</p>
          <p className="mx-auto max-w-sm text-sm text-h-muted">Save a transaction shape — account, category, amount — for one-tap re-entry next time.</p>
        </div>
      ) : (
        <div className="h-card p-2">
          <ul className="flex flex-col divide-y divide-h-border">
            {templates.map((t) => (
              <TemplateRowItem key={t.id} template={t} accounts={ctx.accounts} categories={ctx.categories} readOnly={ctx.readOnly} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
