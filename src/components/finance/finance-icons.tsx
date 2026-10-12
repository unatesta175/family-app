import {
  Banknote,
  Car,
  Circle,
  CircleEllipsis,
  Clapperboard,
  CreditCard,
  Gem,
  HeartPulse,
  Landmark,
  PiggyBank,
  Receipt,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Tag,
  Utensils,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { FinanceAccountType, FinanceCardTheme } from "@/lib/db/schema";

export const FINANCE_CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  car: Car,
  receipt: Receipt,
  "shopping-basket": ShoppingBasket,
  "shopping-bag": ShoppingBag,
  clapperboard: Clapperboard,
  "heart-pulse": HeartPulse,
  "piggy-bank": PiggyBank,
  "circle-ellipsis": CircleEllipsis,
  tag: Tag,
};

export function categoryIcon(key: string | null | undefined): LucideIcon {
  return (key && FINANCE_CATEGORY_ICONS[key]) || Tag;
}

export const FINANCE_ACCOUNT_ICONS: Record<string, LucideIcon> = {
  landmark: Landmark,
  smartphone: Smartphone,
  banknote: Banknote,
  "piggy-bank": PiggyBank,
  wallet: Wallet,
  "credit-card": CreditCard,
  gem: Gem,
  circle: Circle,
};

export function accountIcon(key: string | null | undefined): LucideIcon {
  return (key && FINANCE_ACCOUNT_ICONS[key]) || Landmark;
}

/** Renders an account icon from its stored string key (component form, so it's stable across renders). */
export function AccountIcon({ icon, className }: { icon: string | null | undefined; className?: string }) {
  const Icon = (icon && FINANCE_ACCOUNT_ICONS[icon]) || Landmark;
  return <Icon className={className} />;
}

/** Renders a category icon from its stored string key. */
export function FinanceCategoryIcon({ icon, className }: { icon: string | null | undefined; className?: string }) {
  const Icon = (icon && FINANCE_CATEGORY_ICONS[icon]) || Tag;
  return <Icon className={className} />;
}

export const ACCOUNT_TYPE_ICON: Record<FinanceAccountType, string> = {
  bank: "landmark",
  ewallet: "smartphone",
  cash: "banknote",
  savings: "piggy-bank",
};

export const ACCOUNT_TYPE_LABEL: Record<FinanceAccountType, string> = {
  bank: "Bank",
  ewallet: "E-wallet",
  cash: "Cash",
  savings: "Savings",
};

/** CSS gradient per card theme, used for the flip-card front/back faces. */
export const CARD_THEME_GRADIENT: Record<FinanceCardTheme, string> = {
  rose_gold: "linear-gradient(135deg, #e8b4a0 0%, #d9a08c 45%, #b97a68 100%)",
  black: "linear-gradient(135deg, #2b2b2b 0%, #141414 55%, #000000 100%)",
  holographic: "linear-gradient(135deg, #a78bfa 0%, #60a5fa 35%, #34d399 70%, #fbbf24 100%)",
  mint: "linear-gradient(135deg, #a7f3d0 0%, #6ee7b7 45%, #34d399 100%)",
  sunset: "linear-gradient(135deg, #fda4af 0%, #fb923c 50%, #f59e0b 100%)",
  midnight: "linear-gradient(135deg, #312e81 0%, #1e1b4b 55%, #0f172a 100%)",
};

export const CARD_THEME_FG: Record<FinanceCardTheme, string> = {
  rose_gold: "#2b1810",
  black: "#f5f5f5",
  holographic: "#141432",
  mint: "#052e1c",
  sunset: "#2a1205",
  midnight: "#f1f1ff",
};

export const CARD_THEME_LABEL: Record<FinanceCardTheme, string> = {
  rose_gold: "Rose gold",
  black: "Black",
  holographic: "Holographic",
  mint: "Mint",
  sunset: "Sunset",
  midnight: "Midnight",
};
