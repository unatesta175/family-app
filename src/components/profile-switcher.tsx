"use client";

import { useTransition } from "react";
import { switchActiveProfile } from "@/lib/actions";
import { cn } from "@/lib/utils";

type Profile = { id: number; name: string; colorTheme: string };

export function ProfileSwitcher({
  profiles,
  activeProfileId,
}: {
  profiles: Profile[];
  activeProfileId: number;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-sm">
      {profiles.map((p) => {
        const active = p.id === activeProfileId;
        return (
          <button
            key={p.id}
            disabled={isPending}
            onClick={() => startTransition(() => switchActiveProfile(p.id))}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60",
              active
                ? "bg-emerald-700 text-white"
                : "text-neutral-500 hover:bg-neutral-100"
            )}
          >
            {p.name}
          </button>
        );
      })}
    </div>
  );
}
