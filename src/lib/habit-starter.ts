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
  { key: "health", name: "Health & Fitness", color: "emerald", icon: "dumbbell" },
  { key: "learning", name: "Learning", color: "indigo", icon: "book-open" },
  { key: "detox", name: "Digital Detox", color: "orange", icon: "smartphone" },
  { key: "spending", name: "Mindful Spending", color: "teal", icon: "wallet" },
];

export const STARTER_HABITS: StarterHabit[] = [
  {
    name: "Study",
    description: "Focused study time — books, courses, revision.",
    category: "learning",
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
    category: "detox",
    kind: "break",
    icon: "gamepad-2",
    color: "violet",
    schedule: "daily",
  },
  {
    name: "Stop doomscrolling",
    description: "No mindless scrolling through feeds and news.",
    category: "detox",
    kind: "break",
    icon: "smartphone",
    color: "orange",
    schedule: "daily",
  },
  {
    name: "Stop watching TV",
    description: "No TV / series binges.",
    category: "detox",
    kind: "break",
    icon: "tv",
    color: "amber",
    schedule: "daily",
  },
  {
    name: "Stop YouTube / TikTok",
    description: "No short-video rabbit holes.",
    category: "detox",
    kind: "break",
    icon: "play",
    color: "sky",
    schedule: "daily",
  },
  {
    name: "Stop impulse shopping",
    description: "No unplanned online or in-store purchases.",
    category: "spending",
    kind: "break",
    icon: "shopping-bag",
    color: "teal",
    schedule: "daily",
  },
];
