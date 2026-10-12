"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveCategoryAction, deleteCategoryAction } from "@/lib/finance-actions";
import { FINANCE_CATEGORY_GROUPS } from "@/lib/db/schema";
import { FinanceCategoryIcon } from "@/components/finance/finance-icons";
import type { CategoryRow } from "@/lib/db/repo-finance";
import { colorHex } from "@/lib/habits";
import { cn } from "@/lib/utils";

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [group, setGroup] = useState<"need" | "want">("want");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add() {
    setError(null);
    startTransition(async () => {
      const res = await saveCategoryAction(null, { name, icon: "tag", color: "indigo", group });
      if (!res.ok) setError(res.error);
      else {
        setName("");
        setAdding(false);
      }
    });
  }

  function remove(id: number) {
    if (!confirm("Delete this category? Transactions keep their amount but lose the category tag.")) return;
    startTransition(async () => {
      await deleteCategoryAction(id);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col divide-y divide-h-border">
        {categories.map((c) => {
          return (
            <li key={c.id} className="flex items-center gap-3 py-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${colorHex(c.color)}22`, color: colorHex(c.color) }}>
                <FinanceCategoryIcon icon={c.icon} className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 text-sm font-bold">{c.name}</span>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold capitalize", c.group === "need" ? "bg-h-brand-soft text-h-brand" : "bg-h-surface2 text-h-muted")}>
                {c.group}
              </span>
              <button type="button" onClick={() => remove(c.id)} disabled={pending} className="text-h-muted hover:text-h-bad">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          );
        })}
      </ul>

      {adding ? (
        <div className="flex flex-col gap-2 pt-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" autoFocus />
          <div className="flex gap-1.5">
            {FINANCE_CATEGORY_GROUPS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroup(g)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-bold capitalize",
                  group === g ? "border-h-brand bg-h-brand-soft text-h-brand" : "border-h-border text-h-muted"
                )}
              >
                {g}
              </button>
            ))}
          </div>
          {error && <p className="text-xs font-semibold text-h-bad">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={add} disabled={pending || !name.trim()} className="bg-h-brand text-h-brand-fg hover:opacity-90">
              Add
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-1.5 self-start pt-2 text-xs font-bold text-h-brand">
          <Plus className="h-3.5 w-3.5" />
          Add category
        </button>
      )}
    </div>
  );
}
