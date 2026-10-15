import {
  Bell,
  BookmarkPlus,
  CreditCard,
  Grid2x2,
  HandCoins,
  LayoutDashboard,
  Luggage,
  PiggyBank,
  Receipt,
  Settings,
  Tag,
  TrendingUp,
  Wallet,
} from "lucide-react";

/**
 * Plain nav data + helpers shared between the client-side nav bar/sidebar and server-rendered
 * pages (like the mobile "More" page). Deliberately NOT in a "use client" file: a Server Component
 * importing a plain value (not a component) from a "use client" module gets a client-reference
 * stub on the server instead of the real value, so e.g. `MORE_LINKS.filter(...)` throws at
 * render time in production even though it type-checks and works in dev.
 */

/** Mobile bottom tab bar: the four most-used destinations, everything else lives behind "More". */
export const NAV_ITEMS = [
  { href: "/finance", label: "Home", icon: LayoutDashboard },
  { href: "/finance/transactions", label: "Transactions", icon: Receipt },
  { href: "/finance/bills", label: "Bills", icon: Wallet },
  { href: "/finance/more", label: "More", icon: Grid2x2 },
] as const;

/** Everything else — the full desktop sidebar, grouped into tiles on the mobile More page. */
export const MORE_LINKS = [
  { href: "/finance/accounts", label: "Accounts", icon: CreditCard, group: "Everyday" },
  { href: "/finance/templates", label: "Templates", icon: BookmarkPlus, group: "Everyday" },
  { href: "/finance/money-plan", label: "Money Plan", icon: PiggyBank, group: "Everyday" },
  { href: "/finance/lending", label: "Who Owes Who", icon: HandCoins, group: "Everyday" },
  { href: "/finance/trips", label: "Trips", icon: Luggage, group: "Everyday" },
  { href: "/finance/reminders", label: "Reminders", icon: Bell, group: "Everyday" },
  { href: "/finance/net-worth", label: "Net Worth", icon: TrendingUp, group: "Advanced" },
  { href: "/finance/settings?tab=categories", label: "Categories", icon: Tag, group: "Advanced" },
  { href: "/finance/settings", label: "Settings", icon: Settings, group: "Advanced" },
] as const;

/** Appends `?member=` onto an href that may already carry its own query string (e.g. "…/settings?tab=categories"). */
export function withMemberQuery(href: string, memberQuery: string) {
  if (!memberQuery) return href;
  return href.includes("?") ? `${href}&${memberQuery.slice(1)}` : `${href}${memberQuery}`;
}
