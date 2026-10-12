import {
  Banknote,
  Briefcase,
  Car,
  Circle,
  CircleEllipsis,
  Clapperboard,
  CreditCard,
  Gem,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Lock,
  Globe,
  Plane,
  PiggyBank,
  Receipt,
  Shield,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Star,
  Tag,
  TrendingUp,
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
  "trending-up": TrendingUp,
  briefcase: Briefcase,
  lock: Lock,
  shield: Shield,
  globe: Globe,
  star: Star,
  home: Home,
  "graduation-cap": GraduationCap,
  plane: Plane,
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
  credit_card: "credit-card",
  other: "circle",
};

export const ACCOUNT_TYPE_LABEL: Record<FinanceAccountType, string> = {
  bank: "Bank",
  ewallet: "E-Wallet",
  cash: "Cash",
  savings: "Savings",
  credit_card: "Credit Card / PayLater",
  other: "Other",
};

/** CSS gradient per card theme, used for the flip-card front/back faces and the account form preview. */
export const CARD_THEME_GRADIENT: Record<FinanceCardTheme, string> = {
  rose_gold: "linear-gradient(135deg, #e8b4a0 0%, #d9a08c 45%, #b97a68 100%)",
  black: "linear-gradient(135deg, #2b2b2b 0%, #141414 55%, #000000 100%)",
  holographic: "linear-gradient(135deg, #a78bfa 0%, #60a5fa 35%, #34d399 70%, #fbbf24 100%)",
  mint: "linear-gradient(135deg, #a7f3d0 0%, #6ee7b7 45%, #34d399 100%)",
  sunset: "linear-gradient(135deg, #fda4af 0%, #fb923c 50%, #f59e0b 100%)",
  midnight: "linear-gradient(135deg, #312e81 0%, #1e1b4b 55%, #0f172a 100%)",
  obsidian: "linear-gradient(135deg, #1c1c1e 0%, #0a0a0b 55%, #000000 100%)",
  glacier: "linear-gradient(135deg, #ffffff 0%, #f1f5f9 45%, #e2e8f0 100%)",
  emerald: "linear-gradient(135deg, #065f46 0%, #064e3b 55%, #022c22 100%)",
  amethyst: "linear-gradient(135deg, #6d28d9 0%, #4c1d95 55%, #2e1065 100%)",
  topaz: "linear-gradient(135deg, #78350f 0%, #451a03 55%, #1c0a00 100%)",
  ruby: "linear-gradient(135deg, #9f1239 0%, #7f1d1d 55%, #450a0a 100%)",
  coral: "linear-gradient(135deg, #7c2d12 0%, #431407 55%, #1f0a03 100%)",
  ocean: "linear-gradient(135deg, #0e7490 0%, #164e63 55%, #082f36 100%)",
  sunshine: "linear-gradient(135deg, #fef08a 0%, #fde047 45%, #facc15 100%)",
  flamingo: "linear-gradient(135deg, #fecdd3 0%, #fda4af 45%, #fb7185 100%)",
  sky: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 45%, #7dd3fc 100%)",
};

/** Themes with a light/pale background: hero card and swatch text render dark instead of white. */
export const CARD_THEME_IS_LIGHT: Record<FinanceCardTheme, boolean> = {
  rose_gold: false,
  black: false,
  holographic: false,
  mint: false,
  sunset: false,
  midnight: false,
  obsidian: false,
  glacier: true,
  emerald: false,
  amethyst: false,
  topaz: false,
  ruby: false,
  coral: false,
  ocean: false,
  sunshine: true,
  flamingo: true,
  sky: true,
};

export const CARD_THEME_FG: Record<FinanceCardTheme, string> = {
  rose_gold: "#2b1810",
  black: "#f5f5f5",
  holographic: "#141432",
  mint: "#052e1c",
  sunset: "#2a1205",
  midnight: "#f1f1ff",
  obsidian: "#f5f5f5",
  glacier: "#0f172a",
  emerald: "#ecfdf5",
  amethyst: "#f5f3ff",
  topaz: "#fef3c7",
  ruby: "#fff1f2",
  coral: "#fff7ed",
  ocean: "#ecfeff",
  sunshine: "#422006",
  flamingo: "#4c0519",
  sky: "#0c4a6e",
};

export const CARD_THEME_LABEL: Record<FinanceCardTheme, string> = {
  rose_gold: "Rose gold",
  black: "Black",
  holographic: "Holographic",
  mint: "Mint",
  sunset: "Sunset",
  midnight: "Midnight",
  obsidian: "Obsidian",
  glacier: "Glacier",
  emerald: "Emerald",
  amethyst: "Amethyst",
  topaz: "Topaz",
  ruby: "Ruby",
  coral: "Coral",
  ocean: "Ocean",
  sunshine: "Sunshine",
  flamingo: "Flamingo",
  sky: "Sky",
};
