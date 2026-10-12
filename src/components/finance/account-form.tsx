"use client";

import { useState, useTransition } from "react";
import { Eye, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FinanceModal } from "@/components/finance/finance-modal";
import {
  ACCOUNT_TYPE_LABEL,
  AccountIcon,
  CARD_THEME_FG,
  CARD_THEME_GRADIENT,
  CARD_THEME_IS_LIGHT,
  CARD_THEME_LABEL,
  FINANCE_ACCOUNT_ICONS,
} from "@/components/finance/finance-icons";
import { saveAccountAction, deleteAccountAction } from "@/lib/finance-actions";
import { FINANCE_ACCOUNT_TYPES, FINANCE_CARD_THEMES } from "@/lib/db/schema";
import type { AccountRow } from "@/lib/db/repo-finance";
import { cn } from "@/lib/utils";

const APP_NAME = "Istiqamahly";

const money = (n: number) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

  const gradient = CARD_THEME_GRADIENT[colorTheme];
  const fg = CARD_THEME_FG[colorTheme];
  const isLight = CARD_THEME_IS_LIGHT[colorTheme];
  const chipBg = isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.15)";
  const balanceNum = Number(balance) || 0;

  return (
    <FinanceModal open={open} onClose={onClose} title={account ? "Edit Account" : "New Account"} className="md:max-w-md">
      <div className="flex flex-col gap-5">
        {/* Live hero preview */}
        <div
          className="flex aspect-[1.75/1] w-full flex-col justify-between rounded-2xl p-4 shadow-lg"
          style={{ background: gradient, color: fg }}
        >
          <div className="flex items-start justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: chipBg }}>
              <AccountIcon icon={icon} className="h-5 w-5" />
            </span>
            <span className="text-xs font-extrabold uppercase tracking-widest" style={{ opacity: 0.55 }}>
              {APP_NAME}
            </span>
          </div>

          <div>
            <p className="truncate text-sm font-bold">{name.trim() || "e.g. Maybank, TnG eWallet"}</p>
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ opacity: 0.65 }}>
              {ACCOUNT_TYPE_LABEL[type]}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ opacity: 0.55 }}>
                Balance
              </p>
              <Eye className="h-3 w-3" style={{ opacity: 0.55 }} />
            </div>
            <p className="text-2xl font-extrabold tabular-nums tracking-tight">{money(balanceNum)}</p>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ opacity: 0.5 }}>
                Income
              </p>
              <p className="text-sm font-extrabold tabular-nums">{money(0)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ opacity: 0.5 }}>
                Spending
              </p>
              <p className="text-sm font-extrabold tabular-nums">{money(0)}</p>
            </div>
          </div>
        </div>

        {/* Card design */}
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-h-muted">Card Design</span>
            <span className="text-xs font-extrabold">{CARD_THEME_LABEL[colorTheme]}</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {FINANCE_CARD_THEMES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setColorTheme(t)}
                className="flex flex-shrink-0 flex-col items-center gap-1"
              >
                <span
                  className={cn(
                    "relative flex h-9 w-16 flex-shrink-0 items-end overflow-hidden rounded-lg shadow-sm ring-offset-2 transition-all",
                    colorTheme === t && "ring-2 ring-h-brand"
                  )}
                  style={{ background: CARD_THEME_GRADIENT[t] }}
                >
                  <span className="h-1 w-full" style={{ background: CARD_THEME_FG[t], opacity: 0.35 }} />
                  {colorTheme === t && (
                    <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-h-brand text-[9px] text-h-brand-fg">
                      ✓
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-semibold text-h-muted">{CARD_THEME_LABEL[t]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Account details */}
        <div className="flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-h-muted">Account Details</span>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold text-h-muted">Name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maybank, TnG eWallet" />
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
                    type === t ? "border-black bg-black text-white" : "border-h-border bg-white text-h-muted hover:text-h-fg"
                  )}
                >
                  {ACCOUNT_TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Icon */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-h-muted">Icon</span>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {Object.entries(FINANCE_ACCOUNT_ICONS).map(([key, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setIcon(key)}
                className={cn(
                  "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border transition-colors",
                  icon === key ? "border-black bg-black text-white" : "border-h-border bg-white text-h-muted hover:text-h-fg"
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={isShared} onChange={(e) => setIsShared(e.target.checked)} className="h-4 w-4 accent-current" />
          Visible to my partner
        </label>

        {error && <p className="text-xs font-semibold text-h-bad">{error}</p>}

        {account && (
          <button type="button" onClick={remove} disabled={pending} className="text-xs font-bold text-h-bad">
            Delete account
          </button>
        )}

        <Button
          type="button"
          onClick={submit}
          disabled={pending || !name.trim()}
          className="w-full bg-black py-5 text-sm font-bold text-white hover:bg-black/90"
        >
          {pending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </FinanceModal>
  );
}
