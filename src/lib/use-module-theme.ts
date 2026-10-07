"use client";

import { usePathname } from "next/navigation";

/**
 * The theme classes for portalled UI (dialogs, dropdowns), which render outside the module's themed
 * wrapper. Goals pages get the amber Goals palette and Focus pages the pine one, on top of the shared habits tokens.
 */
export function useModuleTheme(): string {
  const pathname = usePathname();
  if (pathname.startsWith("/focus")) return "habits-theme focus-theme";
  return pathname.startsWith("/goals") ? "habits-theme goals-theme" : "habits-theme";
}
