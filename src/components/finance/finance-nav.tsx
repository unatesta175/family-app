"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Bell,
  BookmarkPlus,
  CreditCard,
  Grid2x2,
  HandCoins,
  LayoutDashboard,
  Luggage,
  PiggyBank,
  Receipt,
  Settings,
  Tag,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Mobile bottom tab bar: the four most-used destinations, everything else lives behind "More". */
const ITEMS = [
  { href: "/finance", label: "Home", icon: LayoutDashboard },
  { href: "/finance/transactions", label: "Transactions", icon: Receipt },
  { href: "/finance/bills", label: "Bills", icon: Wallet },
  { href: "/finance/more", label: "More", icon: Grid2x2 },
] as const;

/** Everything else — the full desktop sidebar, grouped into tiles on the mobile More page. */
export const MORE_LINKS = [
  { href: "/finance/accounts", label: "Accounts", icon: CreditCard, group: "Everyday" },
  { href: "/finance/templates", label: "Templates", icon: BookmarkPlus, group: "Everyday" },
  { href: "/finance/money-plan", label: "Money Plan", icon: PiggyBank, group: "Everyday" },
  { href: "/finance/lending", label: "Who Owes Who", icon: HandCoins, group: "Everyday" },
  { href: "/finance/trips", label: "Trips", icon: Luggage, group: "Everyday" },
  { href: "/finance/reminders", label: "Reminders", icon: Bell, group: "Everyday" },
  { href: "/finance/net-worth", label: "Net Worth", icon: TrendingUp, group: "Advanced" },
  { href: "/finance/settings?tab=categories", label: "Categories", icon: Tag, group: "Advanced" },
  { href: "/finance/settings", label: "Settings", icon: Settings, group: "Advanced" },
] as const;

export function useMemberQuery() {
  const m = useSearchParams().get("member");
  return m && /^\d+$/.test(m) ? `?member=${m}` : "";
}

/** Appends `?member=` onto an href that may already carry its own query string (e.g. "…/settings?tab=categories"). */
export function withMemberQuery(href: string, memberQuery: string) {
  if (!memberQuery) return href;
  return href.includes("?") ? `${href}&${memberQuery.slice(1)}` : `${href}${memberQuery}`;
}

function isActive(pathname: string, href: string) {
  const path = href.split("?")[0];
  if (path === "/finance") return pathname === "/finance";
  return pathname === path || pathname.startsWith(`${path}/`);
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
            href={withMemberQuery(href, q)}
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
  const all = [...ITEMS.filter((i) => i.href !== "/finance/more"), ...MORE_LINKS];
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
            href={withMemberQuery(href, q)}
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
