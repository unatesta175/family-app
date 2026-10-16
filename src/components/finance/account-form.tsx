"use client";

import { useState, useTransition } from "react";
import { Eye, Plus } from "lucide-react";
import { Button } from "@/components/finance/ui/button";
import { Input } from "@/components/finance/ui/input";
import { FinanceModal, FinanceField } from "@/components/finance/finance-modal";
import { Switch } from "@/components/finance/ui/switch";
import {
  ACCOUNT_TYPE_LABEL,
  AccountIcon,
  CARD_THEME_FG,
  CARD_THEME_GRADIENT,
  CARD_THEME_IS_LIGHT,
  CARD_THEME_LABEL,
  FINANCE_ACCOUNT_ICONS,
} from "@/components/finance/finance-icons";
import { CardTexture } from "@/components/finance/card-texture";
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
        <button type="button" onClick={() => setOpen(true)} className="text-xs font-bold text-primary">
          Edit
        </button>
      ) : (
        <Button type="button" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
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
    <FinanceModal
      open={open}
      onClose={onClose}
      title={account ? "Edit account" : "New account"}
      className="md:max-w-md"
      onSave={submit}
      saveLabel={pending ? "Saving…" : "Save changes"}
      saveDisabled={pending || !name.trim()}
    >
      <div className="flex min-w-0 flex-col gap-5">
        {/* Live hero preview */}
        <div
          className="relative flex aspect-[1.75/1] w-full flex-col justify-between overflow-hidden rounded-2xl p-4 shadow-lg"
          style={{ background: gradient, color: fg }}
        >
          <CardTexture />
          <div className="relative z-10 flex items-start justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: chipBg }}>
              <AccountIcon icon={icon} className="h-5 w-5" />
            </span>
            <span className="text-xs font-extrabold uppercase tracking-widest" style={{ opacity: 0.55 }}>
              {APP_NAME}
            </span>
          </div>

          <div className="relative z-10">
            <p className="truncate text-sm font-bold">{name.trim() || "e.g. Maybank, TnG eWallet"}</p>
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ opacity: 0.65 }}>
              {ACCOUNT_TYPE_LABEL[type]}
            </p>
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ opacity: 0.55 }}>
                Balance
              </p>
              <Eye className="h-3 w-3" style={{ opacity: 0.55 }} />
            </div>
            <p className="text-2xl font-extrabold tabular-nums tracking-tight">{money(balanceNum)}</p>
          </div>

          <div className="relative z-10 flex items-end justify-between">
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
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Card Design</span>
            <span className="text-xs font-extrabold">{CARD_THEME_LABEL[colorTheme]}</span>
          </div>
          <div className="flex min-w-0 gap-2.5 overflow-x-auto pb-1">
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
                    colorTheme === t && "ring-2 ring-primary"
                  )}
                  style={{ background: CARD_THEME_GRADIENT[t] }}
                >
                  <span className="h-1 w-full" style={{ background: CARD_THEME_FG[t], opacity: 0.35 }} />
                  {colorTheme === t && (
                    <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] text-primary-foreground">
                      ✓
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground">{CARD_THEME_LABEL[t]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Account details */}
        <div className="flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Account Details</span>

          <FinanceField label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maybank, TnG eWallet" />
          </FinanceField>

          <FinanceField label="Starting / current balance (RM)">
            <Input type="number" inputMode="decimal" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} />
          </FinanceField>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-foreground">Type</span>
            <div className="flex flex-wrap gap-1.5">
              {FINANCE_ACCOUNT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors",
                    type === t ? "border-black bg-black text-white" : "border-border bg-white text-muted-foreground hover:text-foreground"
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
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Icon</span>
          <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
            {Object.entries(FINANCE_ACCOUNT_ICONS).map(([key, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setIcon(key)}
                className={cn(
                  "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border transition-colors",
                  icon === key ? "border-black bg-black text-white" : "border-border bg-white text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between gap-2 text-sm font-semibold">
          Visible to my partner
          <Switch checked={isShared} onCheckedChange={setIsShared} />
        </label>

        {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

        {account && (
          <button type="button" onClick={remove} disabled={pending} className="self-center text-xs font-bold text-destructive">
            Delete account
          </button>
        )}
      </div>
    </FinanceModal>
  );
}
