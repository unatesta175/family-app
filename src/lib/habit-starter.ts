import type { HabitKind, HabitSchedule } from "@/lib/db/schema";

/**
 * Starter habits offered to a profile with nothing set up yet, and seeded once for the family's
 * first two members (see `seedStarterHabitsOnce`). This is only *seed data* — everything ends up
 * as ordinary rows in the habit tables and is fully editable/deletable like any user-made habit.
 */
export type StarterCategory = { key: string; name: string; color: string; icon: string };
export type StarterHabit = {
  name: string;
  description: string;
  category: string; // StarterCategory.key
  kind: HabitKind;
  icon: string;
  color: string;
  schedule: HabitSchedule;
  weeklyTarget?: number;
  dailyTarget?: number;
  unit?: string;
};

export const STARTER_CATEGORIES: StarterCategory[] = [
  { key: "quit", name: "Quit a bad habit", color: "rose", icon: "ban" },
  { key: "art", name: "Art", color: "pink", icon: "brush" },
  { key: "meditation", name: "Meditation", color: "pink", icon: "flower-2" },
  { key: "study", name: "Study", color: "violet", icon: "graduation-cap" },
  { key: "sports", name: "Sports", color: "indigo", icon: "bike" },
  { key: "entertainment", name: "Entertainment", color: "teal", icon: "ticket" },
  { key: "social", name: "Social", color: "emerald", icon: "message-square" },
  { key: "finance", name: "Finance", color: "emerald", icon: "dollar-sign" },
  { key: "health", name: "Health", color: "emerald", icon: "cross" },
  { key: "work", name: "Work", color: "amber", icon: "briefcase" },
  { key: "nutrition", name: "Nutrition", color: "amber", icon: "utensils" },
  { key: "home", name: "Home", color: "orange", icon: "house" },
  { key: "outdoor", name: "Outdoor", color: "orange", icon: "mountain" },
  { key: "other", name: "Other", color: "rose", icon: "layout-grid" },
];

export const STARTER_HABITS: StarterHabit[] = [
  {
    name: "Study",
    description: "Focused study time — books, courses, revision.",
    category: "study",
    kind: "build",
    icon: "book-open",
    color: "indigo",
    schedule: "daily",
  },
  {
    name: "Workout",
    description: "Strength or home workout.",
    category: "health",
    kind: "build",
    icon: "dumbbell",
    color: "emerald",
    schedule: "weekly_count",
    weeklyTarget: 4,
  },
  {
    name: "Jog",
    description: "A jog or brisk run.",
    category: "health",
    kind: "build",
    icon: "footprints",
    color: "teal",
    schedule: "weekly_count",
    weeklyTarget: 3,
  },
  {
    name: "Stop gaming",
    description: "Check in each day you stayed off games.",
    category: "quit",
    kind: "break",
    icon: "gamepad-2",
    color: "violet",
    schedule: "daily",
  },
  {
    name: "Stop doomscrolling",
    description: "No mindless scrolling through feeds and news.",
    category: "quit",
    kind: "break",
    icon: "smartphone",
    color: "orange",
    schedule: "daily",
  },
  {
    name: "Stop watching TV",
    description: "No TV / series binges.",
    category: "quit",
    kind: "break",
    icon: "tv",
    color: "amber",
    schedule: "daily",
  },
  {
    name: "Stop YouTube / TikTok",
    description: "No short-video rabbit holes.",
    category: "quit",
    kind: "break",
    icon: "play",
    color: "sky",
    schedule: "daily",
  },
  {
    name: "Stop impulse shopping",
    description: "No unplanned online or in-store purchases.",
    category: "finance",
    kind: "break",
    icon: "shopping-bag",
    color: "teal",
    schedule: "daily",
  },
];
