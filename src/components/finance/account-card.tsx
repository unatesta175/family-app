"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Pencil } from "lucide-react";
import type { AccountRow } from "@/lib/db/repo-finance";
import { ACCOUNT_TYPE_LABEL, AccountIcon, CARD_THEME_FG, CARD_THEME_GRADIENT } from "@/components/finance/finance-icons";
import { Badge } from "@/components/finance/ui/badge";

const money = (n: number) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** A 3D flip card: balance on the front, account details on the back. Tap/click to flip. */
export function AccountCard({ account, readOnly, onEdit }: { account: AccountRow; readOnly: boolean; onEdit?: () => void }) {
  const [flipped, setFlipped] = useState(false);
  const gradient = CARD_THEME_GRADIENT[account.colorTheme];
  const fg = CARD_THEME_FG[account.colorTheme];

  return (
    <div className="fin-flip-outer aspect-[1.6/1] w-full cursor-pointer select-none" onClick={() => setFlipped((v) => !v)}>
      <motion.div
        className="fin-flip-inner h-full w-full"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: "easeInOut" }}
      >
        <div
          className="fin-flip-face flex flex-col justify-between rounded-2xl p-4 shadow-lg"
          style={{ background: gradient, color: fg }}
        >
          <div className="flex items-start justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/15">
              <AccountIcon icon={account.icon} className="h-5 w-5" />
            </span>
            {!account.isShared && (
              <Badge variant="outline" className="border-transparent bg-black/15 text-[10px] font-bold" style={{ color: fg }}>
                Private
              </Badge>
            )}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">{account.name}</p>
            <p className="text-2xl font-extrabold tabular-nums">{money(account.balance)}</p>
          </div>
        </div>
        <div
          className="fin-flip-face fin-flip-back flex flex-col justify-between rounded-2xl p-4 shadow-lg"
          style={{ background: gradient, color: fg }}
        >
          <div className="flex items-start justify-between">
            <p className="text-sm font-extrabold">{account.name}</p>
            {!readOnly && onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="rounded-full bg-black/15 p-1.5 hover:bg-black/25"
                aria-label="Edit account"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-col gap-1 text-xs font-semibold opacity-90">
            <span>{ACCOUNT_TYPE_LABEL[account.type]}</span>
            <span>{account.isShared ? "Visible to partner" : "Private"}</span>
            <span className="opacity-70">Tap to flip back</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
