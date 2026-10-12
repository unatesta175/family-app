"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Bell, BookmarkPlus, CreditCard, HandCoins, LayoutDashboard, Luggage, PiggyBank, Receipt, Settings, TrendingUp, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/finance", label: "Home", icon: LayoutDashboard },
  { href: "/finance/transactions", label: "Transactions", icon: Receipt },
  { href: "/finance/accounts", label: "Accounts", icon: CreditCard },
  { href: "/finance/bills", label: "Bills", icon: Wallet },
  { href: "/finance/net-worth", label: "Net worth", icon: TrendingUp },
] as const;

/** "Planning" group, plus the other secondary links — shown in the sidebar and via FinanceMoreLinks on mobile. */
const SIDEBAR_EXTRA = [
  { href: "/finance/templates", label: "Templates", icon: BookmarkPlus },
  { href: "/finance/trips", label: "Trips", icon: Luggage },
  { href: "/finance/money-plan", label: "Money Plan", icon: PiggyBank },
  { href: "/finance/reminders", label: "Reminders", icon: Bell },
  { href: "/finance/lending", label: "Lending", icon: HandCoins },
  { href: "/finance/settings", label: "Settings", icon: Settings },
] as const;

function useMemberQuery() {
  const m = useSearchParams().get("member");
  return m && /^\d+$/.test(m) ? `?member=${m}` : "";
}

function isActive(pathname: string, href: string) {
  if (href === "/finance") return pathname === "/finance";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function FinanceBottomNav() {
  const pathname = usePathname();
  const q = useMemberQuery();
  return (
    <nav className="sticky bottom-0 z-20 flex w-full items-stretch justify-between border-t border-border bg-card/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur md:hidden">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={`${href}${q}`}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1 text-[10px] font-semibold transition-colors",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className={cn("flex h-7 w-10 items-center justify-center rounded-full transition-colors", active && "bg-primary/10")}>
              <Icon className="h-[17px] w-[17px]" strokeWidth={active ? 2.5 : 2} />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function FinanceSidebar() {
  const pathname = usePathname();
  const q = useMemberQuery();
  const all = [...ITEMS, ...SIDEBAR_EXTRA];
  return (
    <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-1 border-r border-border px-3 py-6 md:flex">
      <div className="mb-4 flex items-center gap-2 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Wallet className="h-5 w-5" />
        </span>
        <span className="text-lg font-extrabold tracking-tight">Finance</span>
      </div>
      {all.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={`${href}${q}`}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
              active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.5 : 2} />
            {label}
          </Link>
        );
      })}
    </aside>
  );
}

/** Small link row shown on mobile pages that don't fit the bottom nav (Lending, Settings). */
export function FinanceMoreLinks() {
  const q = useMemberQuery();
  return (
    <div className="flex gap-2 md:hidden">
      {SIDEBAR_EXTRA.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={`${href}${q}`}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </Link>
      ))}
    </div>
  );
}
