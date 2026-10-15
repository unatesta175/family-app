"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AccountIcon, CARD_THEME_FG, CARD_THEME_GRADIENT } from "@/components/finance/finance-icons";
import { CardTexture } from "@/components/finance/card-texture";
import type { AccountRow } from "@/lib/db/repo-finance";

const money = (n: number) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export type AccountStats = { income: number; spending: number };

/**
 * Dashboard-only hero carousel: one card per account in its chosen colorTheme, swipeable, with
 * balance front-and-center and this-month income/spending mini-stats in the corners. The 3D flip
 * cards stay on the dedicated Accounts page — this is a separate, dashboard-specific visual treatment.
 */
export function AccountHeroCarousel({
  accounts,
  statsByAccount,
  appName,
}: {
  accounts: AccountRow[];
  statsByAccount: Map<number, AccountStats>;
  appName: string;
}) {
  const [index, setIndex] = useState(0);
  if (accounts.length === 0) return null;

  const clamped = Math.min(index, accounts.length - 1);
  const account = accounts[clamped];
  const stats = statsByAccount.get(account.id) ?? { income: 0, spending: 0 };
  const gradient = CARD_THEME_GRADIENT[account.colorTheme];
  const fg = CARD_THEME_FG[account.colorTheme];

  const go = (dir: 1 | -1) => setIndex((i) => Math.max(0, Math.min(accounts.length - 1, i + dir)));

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={account.id}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) go(1);
              else if (info.offset.x > 60) go(-1);
            }}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="relative aspect-[1.75/1] w-full cursor-grab overflow-hidden rounded-3xl p-5 shadow-lg active:cursor-grabbing"
            style={{ background: gradient, color: fg }}
          >
            <CardTexture />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/15">
                  <AccountIcon icon={account.icon} className="h-5 w-5" />
                </span>
                <span className="text-xs font-extrabold uppercase tracking-widest opacity-50">{appName}</span>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest opacity-50">Balance</p>
                <p className="text-3xl font-extrabold tabular-nums tracking-tight">{money(account.balance)}</p>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-40">Income</p>
                  <p className="text-sm font-extrabold tabular-nums text-emerald-500">{money(stats.income)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-40">Spending</p>
                  <p className="text-sm font-extrabold tabular-nums text-rose-500">{money(stats.spending)}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={clamped === 0}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-h-border text-h-muted disabled:opacity-30"
          aria-label="Previous account"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-xs font-bold text-h-muted">
          {account.name} · {clamped + 1} of {accounts.length}
        </p>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={clamped === accounts.length - 1}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-h-border text-h-muted disabled:opacity-30"
          aria-label="Next account"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
