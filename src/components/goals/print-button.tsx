"use client";

import { Printer } from "lucide-react";

/** Opens the browser's print dialog, where "Save as PDF" is one of the destinations. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print flex items-center gap-1.5 rounded-xl bg-h-brand px-4 py-2 text-xs font-extrabold text-h-brand-fg"
    >
      <Printer className="h-3.5 w-3.5" />
      Print or save as PDF
    </button>
  );
}
