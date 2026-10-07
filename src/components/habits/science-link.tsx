import Link from "next/link";
import { ChevronRight, FlaskConical } from "lucide-react";

/** A link card to the research-backed habit guide. */
export function ScienceLink() {
  return (
    <Link href="/habits/science" className="h-card flex items-center gap-3 p-3.5 transition-colors hover:bg-h-surface2">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-h-brand-soft text-h-brand">
        <FlaskConical className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold">How to start</span>
        <span className="block text-xs text-h-muted">20 science-backed ways to stop procrastinating and start</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-h-muted" />
    </Link>
  );
}
