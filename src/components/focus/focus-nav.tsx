"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Sprout, Timer, Trees } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/focus", label: "Focus", icon: Timer },
  { href: "/focus/grove", label: "Grove", icon: Trees },
  { href: "/focus/stats", label: "Stats", icon: BarChart3 },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/focus") return pathname === "/focus" || pathname === "/focus/session";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Phone bottom bar. It steps aside while a session runs, so nothing tempts you away from it. */
export function FocusBottomNav() {
  const pathname = usePathname();
  if (pathname === "/focus/session") return null;
  return (
    <nav className="sticky bottom-0 z-20 flex w-full items-stretch justify-between border-t border-h-border bg-h-surface/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur md:hidden">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={cn("flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1 text-[11px] font-semibold transition-colors", active ? "text-h-brand" : "text-h-muted hover:text-h-fg")}
          >
            <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-h-brand-soft")}>
              <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.5 : 2} />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function FocusSidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-1 border-r border-h-border px-3 py-6 md:flex">
      <div className="mb-4 flex items-center gap-2 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-h-brand text-h-brand-fg">
          <Sprout className="h-5 w-5" />
        </span>
        <span className="text-lg font-extrabold tracking-tight">Focus</span>
      </div>
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors", active ? "bg-h-brand-soft text-h-brand" : "text-h-muted hover:bg-h-surface2 hover:text-h-fg")}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.5 : 2} />
            {label}
          </Link>
        );
      })}
    </aside>
  );
}
