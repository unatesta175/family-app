"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { MORE_LINKS, NAV_ITEMS as ITEMS, withMemberQuery } from "@/lib/finance-nav-links";

export { MORE_LINKS, withMemberQuery };

export function useMemberQuery() {
  const m = useSearchParams().get("member");
  return m && /^\d+$/.test(m) ? `?member=${m}` : "";
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
    <nav className="sticky bottom-0 z-20 flex w-full items-stretch justify-between border-t border-border bg-card/95 px-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-1.5 backdrop-blur md:hidden">
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
