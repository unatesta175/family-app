"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Check, ListChecks, MoonStar, Target, Wallet, Sparkles, HeartHandshake } from "lucide-react";
import { cn } from "@/lib/utils";

export type ModuleKey = "prayer" | "habits" | "goals";

const MODULES = [
  {
    key: "prayer",
    label: "Prayer",
    hint: "Salah, streaks & garden",
    href: "/",
    icon: MoonStar,
    tile: "bg-emerald-100 text-emerald-700",
  },
  {
    key: "habits",
    label: "Habits",
    hint: "Build, break & track daily",
    href: "/habits",
    icon: ListChecks,
    tile: "bg-indigo-100 text-indigo-600",
  },
  {
    key: "goals",
    label: "Goals",
    hint: "Life goals, milestones & vision",
    href: "/goals",
    icon: Target,
    tile: "bg-sky-100 text-sky-600",
  },
] as const;

const COMING_SOON = [
  { label: "Finance", icon: Wallet },
  { label: "Sunnah", icon: Sparkles },
  { label: "Akhlaq", icon: HeartHandshake },
] as const;

/**
 * Switches between the app's modules (Prayer, Habits, and later Finance/Sunnah/Akhlaq). Lives in
 * the top-left of every module's header so it's always one tap away no matter which module's
 * bottom nav is showing — the bottom navs stay module-specific instead of growing past 5 items.
 */
export function ModuleSwitcher({ current, tone }: { current: ModuleKey; tone: "prayer" | "habits" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = MODULES.find((m) => m.key === current)!;
  const ActiveIcon = active.icon;

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const habitsTone = tone === "habits";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 text-sm font-bold shadow-sm transition-colors",
          habitsTone
            ? "border border-h-border bg-h-surface text-h-fg hover:bg-h-surface2"
            : "bg-white text-neutral-800 hover:bg-neutral-50"
        )}
      >
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-full", active.tile)}>
          <ActiveIcon className="h-4 w-4" />
        </span>
        {active.label}
        <ChevronDown className={cn("h-3.5 w-3.5 opacity-60 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "habit-sheet-in absolute left-0 top-full z-50 mt-2 w-64 rounded-2xl border p-2 shadow-xl",
            habitsTone ? "border-h-border bg-h-surface text-h-fg" : "border-black/5 bg-white text-neutral-800"
          )}
        >
          <p className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider opacity-50">Switch module</p>
          {MODULES.map((m) => {
            const Icon = m.icon;
            const isCurrent = m.key === current;
            return (
              <Link
                key={m.key}
                href={m.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-2 py-2 transition-colors",
                  habitsTone ? "hover:bg-h-surface2" : "hover:bg-neutral-50",
                  isCurrent && (habitsTone ? "bg-h-brand-soft" : "bg-emerald-50")
                )}
              >
                <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", m.tile)}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-bold leading-tight">{m.label}</span>
                  <span className="block text-[11px] leading-tight opacity-60">{m.hint}</span>
                </span>
                {isCurrent && <Check className="h-4 w-4 opacity-70" />}
              </Link>
            );
          })}
          <div className="mt-1 border-t border-current/10 px-2 pb-1 pt-2">
            <p className="pb-1.5 text-[10px] font-bold uppercase tracking-wider opacity-50">Coming soon</p>
            <div className="flex gap-1.5">
              {COMING_SOON.map(({ label, icon: Icon }) => (
                <span
                  key={label}
                  className="flex flex-1 flex-col items-center gap-1 rounded-xl border border-dashed border-current/15 py-1.5 text-[10px] font-semibold opacity-50"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
