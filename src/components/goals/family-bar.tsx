"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "Whose goals": a pill switcher between you and the rest of the circle. Their pages are view-only and
 * show only what they have shared.
 */
export function FamilyBar({ members }: { members: { id: number; name: string; isMe?: boolean }[] }) {
  const pathname = usePathname();
  const memberId = Number(useSearchParams().get("member"));
  const viewing = members.find((m) => !m.isMe && m.id === memberId) ?? null;
  if (members.length < 2) return null;
  // Goal detail pages have no member view; the pills go to the list instead.
  const base = /^\/goals\/\d+/.test(pathname) ? "/goals" : pathname;

  return (
    <div className="no-print mb-3 flex flex-col items-start gap-2 md:mx-auto md:max-w-5xl">
      <div role="tablist" aria-label="Whose goals" className="scrollbar-hide flex max-w-full gap-1 overflow-x-auto rounded-full border border-h-border bg-h-surface p-1 shadow-sm">
        {members.map((m) => {
          const active = m.isMe ? !viewing : viewing?.id === m.id;
          return (
            <Link
              key={m.id}
              role="tab"
              aria-selected={active}
              href={m.isMe ? base : `${base}?member=${m.id}`}
              className={cn(
                "shrink-0 rounded-full px-5 py-1.5 text-sm font-bold transition-colors",
                active ? "bg-h-brand text-h-brand-fg shadow-sm" : "text-h-muted hover:text-h-fg"
              )}
            >
              {m.name}
            </Link>
          );
        })}
      </div>
      {viewing && (
        <p className="flex items-center gap-2 rounded-xl bg-h-brand-soft px-3 py-2 text-xs font-semibold text-h-brand">
          <Eye className="h-4 w-4 shrink-0" />
          Viewing {viewing.name}&apos;s goals. View only: you only see the goals they have shared.
        </p>
      )}
    </div>
  );
}
