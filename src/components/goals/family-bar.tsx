"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "Whose goals": switches the Goals pages between yours and a family member's. Their pages are
 * view-only and show only what they have shared.
 */
export function FamilyBar({ members }: { members: { id: number; name: string }[] }) {
  const pathname = usePathname();
  const memberId = Number(useSearchParams().get("member"));
  const active = members.find((m) => m.id === memberId) ?? null;
  if (members.length === 0) return null;
  // Goal detail pages have no member view; the chips go to the list instead.
  const base = /^\/goals\/\d+/.test(pathname) ? "/goals" : pathname;
  const chip = "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors";

  return (
    <div className="no-print mb-3 flex flex-col gap-2 md:mx-auto md:max-w-5xl">
      <div className="scrollbar-hide -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0" aria-label="Whose goals">
        <Link href={base} className={cn(chip, !active ? "border-h-brand bg-h-brand text-h-brand-fg" : "border-h-border bg-h-surface text-h-muted hover:text-h-fg")}>
          Mine
        </Link>
        {members.map((m) => (
          <Link
            key={m.id}
            href={`${base}?member=${m.id}`}
            className={cn(chip, active?.id === m.id ? "border-h-brand bg-h-brand text-h-brand-fg" : "border-h-border bg-h-surface text-h-muted hover:text-h-fg")}
          >
            {m.name}
          </Link>
        ))}
      </div>
      {active && (
        <p className="flex items-center gap-2 rounded-xl bg-h-brand-soft px-3 py-2 text-xs font-semibold text-h-brand">
          <Eye className="h-4 w-4 shrink-0" />
          Viewing {active.name}&apos;s goals. View only: you only see the goals they have shared.
        </p>
      )}
    </div>
  );
}
