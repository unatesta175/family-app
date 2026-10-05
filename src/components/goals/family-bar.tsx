"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

type Member = { id: number; name: string; isMe?: boolean };

function useViewing(members: Member[]) {
  const memberId = Number(useSearchParams().get("member"));
  return members.find((m) => !m.isMe && m.id === memberId) ?? null;
}

/**
 * "Whose goals": a pill switcher between you and the rest of the circle. Their pages are view-only and
 * show only what they have shared.
 */
export function FamilyBar({ members }: { members: Member[] }) {
  const pathname = usePathname();
  const viewing = useViewing(members);
  if (members.length < 2) return null;
  // Goal detail pages have no member view; the pills go to the list instead.
  const base = /^\/goals\/\d+/.test(pathname) ? "/goals" : pathname;

  return (
    <div role="tablist" aria-label="Whose goals" className="no-print scrollbar-hide flex min-w-0 max-w-full gap-0.5 overflow-x-auto rounded-full border border-h-border bg-h-surface p-0.5 shadow-sm">
        {members.map((m) => {
          const active = m.isMe ? !viewing : viewing?.id === m.id;
          return (
            <Link
              key={m.id}
              role="tab"
              aria-selected={active}
              href={m.isMe ? base : `${base}?member=${m.id}`}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors sm:px-4 sm:text-sm",
                active ? "bg-h-brand text-h-brand-fg shadow-sm" : "text-h-muted hover:text-h-fg"
              )}
            >
              {m.name}
            </Link>
          );
        })}
    </div>
  );
}

/** Shown under the header while looking at someone else's goals. */
export function ViewingBanner({ members }: { members: Member[] }) {
  const viewing = useViewing(members);
  if (!viewing) return null;
  return (
    <p className="no-print mb-3 flex items-center gap-2 rounded-xl bg-h-brand-soft px-3 py-2 text-xs font-semibold text-h-brand md:mx-auto md:max-w-5xl">
      <Eye className="h-4 w-4 shrink-0" />
      Viewing {viewing.name}&apos;s goals. View only: you only see the goals they have shared.
    </p>
  );
}
