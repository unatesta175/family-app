"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Layers, LayoutDashboard, ListChecks, BarChart3, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/habits", label: "Today", icon: LayoutDashboard },
  { href: "/habits/week", label: "Progress", icon: CalendarDays },
  { href: "/habits/tasks", label: "Tasks", icon: ListTodo },
  { href: "/habits/stats", label: "Stats", icon: BarChart3 },
  { href: "/habits/manage", label: "Habits", icon: Layers },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/habits") return pathname === "/habits";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Phone bottom bar. On md+ screens (768px and up, which covers laptops and desktop PWA windows) the same items render as a left sidebar instead. */
export function HabitBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-20 flex w-full items-stretch justify-between border-t border-h-border bg-h-surface/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur md:hidden">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1 text-[11px] font-semibold transition-colors",
              active ? "text-h-brand" : "text-h-muted hover:text-h-fg"
            )}
          >
            <span
              className={cn(
                "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                active && "bg-h-brand-soft"
              )}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.5 : 2} />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function HabitSidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-1 border-r border-h-border px-3 py-6 md:flex">
      <div className="mb-4 flex items-center gap-2 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-h-brand text-h-brand-fg">
          <ListChecks className="h-5 w-5" />
        </span>
        <span className="text-lg font-extrabold tracking-tight">Habits</span>
      </div>
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
              active ? "bg-h-brand-soft text-h-brand" : "text-h-muted hover:bg-h-surface2 hover:text-h-fg"
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
