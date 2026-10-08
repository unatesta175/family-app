"use client";

import { useTransition } from "react";
import { Eye, Trees, User } from "lucide-react";
import { switchActiveProfile } from "@/lib/actions";
import { formatFocus } from "@/lib/focus";
import { cn } from "@/lib/utils";

export type FocusMemberCard = { id: number; name: string; trees: number; seconds: number };

/** Circle view: tap a member to see their grove, stats and running session (read only). */
export function FocusMemberStrip({ members, viewedId }: { members: FocusMemberCard[]; viewedId: number }) {
  const [pending, startTransition] = useTransition();
  if (members.length < 2) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-xs font-extrabold uppercase tracking-wider text-h-muted">Circle</h2>
      <div className="grid grid-cols-2 gap-2">
        {members.map((m) => {
          const active = m.id === viewedId;
          return (
            <button
              key={m.id}
              type="button"
              disabled={pending || active}
              onClick={() => startTransition(() => switchActiveProfile(m.id))}
              className={cn(
                "h-card flex items-center gap-3 p-3 text-left transition-colors disabled:opacity-100",
                active ? "ring-2 ring-h-brand" : "hover:bg-h-surface2"
              )}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-h-brand-soft text-h-brand">
                <User className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1 truncate text-sm font-extrabold">
                  {m.name}
                  {!active && <Eye className="h-3 w-3 text-h-muted" />}
                </p>
                <p className="flex items-center gap-1 text-[11px] font-semibold text-h-muted">
                  <Trees className="h-3 w-3" />
                  {m.trees} today · {formatFocus(m.seconds)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** A banner shown while viewing another member's Focus pages, with a quick way back to your own. */
export function FocusViewerBanner({ name, ownId }: { name: string; ownId: number | null }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-h-brand/40 bg-h-brand-soft px-4 py-2.5">
      <p className="flex items-center gap-2 text-sm font-bold text-h-brand">
        <Eye className="h-4 w-4" />
        Viewing {name}&apos;s focus · read only
      </p>
      {ownId !== null && (
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => switchActiveProfile(ownId))}
          className="shrink-0 rounded-full bg-h-brand px-3 py-1.5 text-xs font-extrabold text-h-brand-fg disabled:opacity-60"
        >
          Back to mine
        </button>
      )}
    </div>
  );
}
