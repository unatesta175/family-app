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

/** "Whose finances": a pill switcher between you and your partner, same convention as Goals. */
export function FinanceFamilyBar({ members }: { members: Member[] }) {
  const pathname = usePathname();
  const viewing = useViewing(members);
  if (members.length < 2) return null;

  return (
    <div role="tablist" aria-label="Whose finances" className="no-print scrollbar-hide flex min-w-0 max-w-full gap-0.5 overflow-x-auto rounded-full border border-border bg-card p-0.5 shadow-sm">
      {members.map((m) => {
        const active = m.isMe ? !viewing : viewing?.id === m.id;
        return (
          <Link
            key={m.id}
            role="tab"
            aria-selected={active}
            href={m.isMe ? pathname : `${pathname}?member=${m.id}`}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors sm:px-4 sm:text-sm",
              active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {m.name}
          </Link>
        );
      })}
    </div>
  );
}

/** Shown under the header while looking at a partner's finances. */
export function FinanceViewingBanner({ members }: { members: Member[] }) {
  const viewing = useViewing(members);
  if (!viewing) return null;
  return (
    <p className="no-print mb-3 flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary md:mx-auto md:max-w-5xl">
      <Eye className="h-4 w-4 shrink-0" />
      Viewing {viewing.name}&apos;s finances. View only: you only see what they&apos;ve marked shared.
    </p>
  );
}
