"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

const FinancePortalContext = createContext<HTMLElement | null>(null);

/**
 * Radix's Dialog/Select/Popover/DropdownMenu/Tooltip all portal their content straight to
 * `document.body` by default. `.finance-theme` (and the `--h-*` CSS variables it sets) lives on a
 * div well below `<body>`, so a plain `document.body` portal renders OUTSIDE that scope and every
 * `bg-h-surface`/`text-h-fg`/etc. class resolves to nothing — the washed-out, see-through modal
 * bug. This provider exposes the themed div itself so those primitives can portal INTO it instead.
 */
export function FinancePortalProvider({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [node, setNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setNode(ref.current);
  }, []);

  return (
    <div ref={ref} className={className}>
      <FinancePortalContext.Provider value={node}>{children}</FinancePortalContext.Provider>
    </div>
  );
}

/** Pass as a Radix `Portal`'s `container` prop. `undefined` until mounted falls back to the Radix default. */
export function useFinancePortalContainer(): HTMLElement | undefined {
  return useContext(FinancePortalContext) ?? undefined;
}
