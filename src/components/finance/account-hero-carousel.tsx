"use client";

import { useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { ChevronLeft, ChevronRight, Pencil, RotateCw, Undo2 } from "lucide-react";
import {
  ACCOUNT_TYPE_LABEL,
  AccountIcon,
  CARD_THEME_FG,
  CARD_THEME_GRADIENT,
} from "@/components/finance/finance-icons";
import { CardTexture } from "@/components/finance/card-texture";
import { AccountFormModal } from "@/components/finance/account-form";
import type { AccountRow } from "@/lib/db/repo-finance";

const money = (n: number) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const slideVariants = {
  enter: (d: 1 | -1) => ({ opacity: 0, x: d * 60, rotateY: d * 35, scale: 0.92 }),
  center: { opacity: 1, x: 0, rotateY: 0, scale: 1 },
  exit: (d: 1 | -1) => ({ opacity: 0, x: d * -60, rotateY: d * -35, scale: 0.92 }),
};

export type AccountStats = { income: number; spending: number };

/**
 * Dashboard-only hero carousel: one card per account in its chosen colorTheme, swipeable with a
 * 3D tilt-on-hover/drag feel, and flippable to an info side (type, visibility, this month's
 * income/spending split, and an Edit shortcut). The 3D flip cards on the dedicated Accounts page
 * are a separate component — this is the dashboard-specific treatment.
 */
export function AccountHeroCarousel({
  accounts,
  statsByAccount,
  appName,
  readOnly,
}: {
  accounts: AccountRow[];
  statsByAccount: Map<number, AccountStats>;
  appName: string;
  readOnly?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [flipped, setFlipped] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, mx: 50, my: 50 });

  const dragX = useMotionValue(0);
  const dragRotate = useTransform(dragX, [-140, 140], [-10, 10]);

  if (accounts.length === 0) return null;

  const clamped = Math.min(index, accounts.length - 1);
  const account = accounts[clamped];
  const stats = statsByAccount.get(account.id) ?? { income: 0, spending: 0 };
  const gradient = CARD_THEME_GRADIENT[account.colorTheme];
  const fg = CARD_THEME_FG[account.colorTheme];
  const total = stats.income + stats.spending;
  const incomePct = total > 0 ? Math.round((stats.income / total) * 100) : 50;

  const go = (d: 1 | -1) => {
    setDir(d);
    setFlipped(false);
    setIndex((i) => Math.max(0, Math.min(accounts.length - 1, i + d)));
  };

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({ rx: (0.5 - py) * 14, ry: (px - 0.5) * 14, mx: px * 100, my: py * 100 });
  }

  function resetTilt() {
    setTilt({ rx: 0, ry: 0, mx: 50, my: 50 });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative [perspective:1600px]">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={account.id}
            drag="x"
            style={{ x: dragX, rotate: dragRotate }}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            whileDrag={{ scale: 1.03 }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) go(1);
              else if (info.offset.x > 60) go(-1);
            }}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="relative aspect-[1.75/1] w-full cursor-grab touch-pan-y active:cursor-grabbing"
          >
            {/* Tilt layer: plain CSS transform driven by pointer position, independent of the flip transform below. */}
            <div
              onPointerMove={handlePointerMove}
              onPointerLeave={resetTilt}
              className="fin-flip-outer h-full w-full"
              style={{
                transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
                transition: "transform 300ms cubic-bezier(0.22,1,0.36,1)",
              }}
            >
              {/* Flip layer */}
              <motion.div
                className="fin-flip-inner h-full w-full"
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              >
                {/* Front */}
                <div
                  className="fin-flip-face relative flex flex-col justify-between overflow-hidden rounded-3xl p-5 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.45)]"
                  style={{ background: gradient, color: fg }}
                >
                  <CardTexture />
                  <div
                    className="pointer-events-none absolute inset-0 opacity-60 mix-blend-overlay"
                    style={{
                      background: `radial-gradient(circle at ${tilt.mx}% ${tilt.my}%, rgba(255,255,255,0.35), transparent 55%)`,
                    }}
                  />
                  <div className="relative z-10 flex items-start justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/15">
                      <AccountIcon icon={account.icon} className="h-5 w-5" />
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold uppercase tracking-widest opacity-50">{appName}</span>
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFlipped(true);
                        }}
                        aria-label="Flip card"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-black/15 transition-transform hover:scale-110 hover:bg-black/25 active:scale-95"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="relative z-10">
                    <p className="text-[11px] font-bold uppercase tracking-widest opacity-50">Balance</p>
                    <p className="text-3xl font-extrabold tabular-nums tracking-tight">{money(account.balance)}</p>
                  </div>

                  <div className="relative z-10 flex items-end justify-between">
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

                {/* Back */}
                <div
                  className="fin-flip-face fin-flip-back relative flex flex-col justify-between overflow-hidden rounded-3xl p-5 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.45)]"
                  style={{ background: gradient, color: fg }}
                >
                  <CardTexture />
                  <div className="relative z-10 flex items-start justify-between">
                    <div>
                      <p className="text-sm font-extrabold">{account.name}</p>
                      <p className="text-[11px] font-bold uppercase tracking-widest opacity-60">
                        {ACCOUNT_TYPE_LABEL[account.type]} · {account.isShared ? "Shared" : "Private"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!readOnly && (
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditing(true);
                          }}
                          aria-label="Edit account"
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-black/15 transition-transform hover:scale-110 hover:bg-black/25 active:scale-95"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFlipped(false);
                        }}
                        aria-label="Flip back"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-black/15 transition-transform hover:scale-110 hover:bg-black/25 active:scale-95"
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="relative z-10 flex flex-col gap-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-50">This month</p>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/15">
                      <div className="flex h-full w-full">
                        <div className="h-full bg-emerald-500" style={{ width: `${incomePct}%` }} />
                        <div className="h-full bg-rose-500" style={{ width: `${100 - incomePct}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-emerald-500">+{money(stats.income)}</span>
                      <span className="text-rose-500">-{money(stats.spending)}</span>
                    </div>
                  </div>

                  <div className="relative z-10">
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-40">Balance</p>
                    <p className="text-xl font-extrabold tabular-nums">{money(account.balance)}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={clamped === 0}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-h-border text-h-muted transition-transform hover:scale-110 disabled:opacity-30 disabled:hover:scale-100"
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
          className="flex h-7 w-7 items-center justify-center rounded-full border border-h-border text-h-muted transition-transform hover:scale-110 disabled:opacity-30 disabled:hover:scale-100"
          aria-label="Next account"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {!readOnly && editing && (
        <AccountFormModal account={account} open onClose={() => setEditing(false)} />
      )}
    </div>
  );
}
