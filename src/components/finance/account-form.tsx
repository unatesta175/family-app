"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FinanceModal } from "@/components/finance/finance-modal";
import { ACCOUNT_TYPE_LABEL, CARD_THEME_GRADIENT, CARD_THEME_LABEL, FINANCE_ACCOUNT_ICONS } from "@/components/finance/finance-icons";
import { saveAccountAction, deleteAccountAction } from "@/lib/finance-actions";
import { FINANCE_ACCOUNT_TYPES, FINANCE_CARD_THEMES } from "@/lib/db/schema";
import type { AccountRow } from "@/lib/db/repo-finance";
import { cn } from "@/lib/utils";

export function AccountFormButton({ account }: { account?: AccountRow }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {account ? (
        <button type="button" onClick={() => setOpen(true)} className="text-xs font-bold text-h-brand">
          Edit
        </button>
      ) : (
        <Button type="button" size="sm" onClick={() => setOpen(true)} className="gap-1.5 bg-h-brand text-h-brand-fg hover:opacity-90">
          <Plus className="h-4 w-4" />
          Add account
        </Button>
      )}
      <AccountFormModal account={account} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function AccountFormModal({ account, open, onClose }: { account?: AccountRow; open: boolean; onClose: () => void }) {
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState(account?.type ?? "bank");
  const [icon, setIcon] = useState(account?.icon ?? "landmark");
  const [colorTheme, setColorTheme] = useState(account?.colorTheme ?? "midnight");
  const [balance, setBalance] = useState(String(account?.balance ?? 0));
  const [isShared, setIsShared] = useState(account?.isShared ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveAccountAction(account?.id ?? null, {
        name,
        type,
        icon,
        colorTheme,
        balance: Number(balance) || 0,
        isShared,
      });
      if (!res.ok) setError(res.error);
      else onClose();
    });
  }

  async function remove() {
    if (!account) return;
    if (!confirm(`Delete "${account.name}"? This removes its transaction history too.`)) return;
    startTransition(async () => {
      const res = await deleteAccountAction(account.id);
      if (!res.ok) setError(res.error);
      else onClose();
    });
  }

  return (
    <FinanceModal open={open} onClose={onClose} title={account ? "Edit account" : "New account"}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-h-muted">Name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Maybank Savings" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-h-muted">Starting / current balance (RM)</span>
          <Input type="number" inputMode="decimal" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} />
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-h-muted">Type</span>
          <div className="flex flex-wrap gap-1.5">
            {FINANCE_ACCOUNT_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
                  type === t ? "border-h-brand bg-h-brand-soft text-h-brand" : "border-h-border text-h-muted hover:text-h-fg"
                )}
              >
                {ACCOUNT_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-h-muted">Icon</span>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(FINANCE_ACCOUNT_ICONS).map(([key, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setIcon(key)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl border transition-colors",
                  icon === key ? "border-h-brand bg-h-brand-soft text-h-brand" : "border-h-border text-h-muted hover:text-h-fg"
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-h-muted">Card theme</span>
          <div className="flex flex-wrap gap-2">
            {FINANCE_CARD_THEMES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setColorTheme(t)}
                className={cn(
                  "flex h-9 w-16 items-center justify-center rounded-lg text-[10px] font-bold text-white shadow-sm ring-offset-2 transition-all",
                  colorTheme === t && "ring-2 ring-h-brand"
                )}
                style={{ background: CARD_THEME_GRADIENT[t] }}
                title={CARD_THEME_LABEL[t]}
              >
                {colorTheme === t ? "✓" : ""}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={isShared} onChange={(e) => setIsShared(e.target.checked)} className="h-4 w-4 accent-current" />
          Visible to my partner
        </label>

        {error && <p className="text-xs font-semibold text-h-bad">{error}</p>}

        <div className="flex items-center justify-between gap-2 pt-1">
          {account ? (
            <button type="button" onClick={remove} disabled={pending} className="text-xs font-bold text-h-bad">
              Delete
            </button>
          ) : (
            <span />
          )}
          <Button type="button" onClick={submit} disabled={pending || !name.trim()} className="bg-h-brand text-h-brand-fg hover:opacity-90">
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </FinanceModal>
  );
}
