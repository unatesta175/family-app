"use client";

import { usePathname } from "next/navigation";

/**
 * The theme classes for portalled UI (dialogs, dropdowns), which render outside the module's themed
 * wrapper. Goals pages get the amber Goals palette on top of the shared habits tokens.
 */
export function useModuleTheme(): string {
  const pathname = usePathname();
  return pathname.startsWith("/goals") ? "habits-theme goals-theme" : "habits-theme";
}
