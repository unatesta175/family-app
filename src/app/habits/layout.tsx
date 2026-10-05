import type { Metadata, Viewport } from "next";
import { ModuleSwitcher } from "@/components/module-switcher";
import { AddFab } from "@/components/habits/add-fab";
import { InstallPrompt, OfflineBadge } from "@/components/habits/pwa-bits";
import { HabitBottomNav, HabitSidebar } from "@/components/habits/habit-nav";
import { HabitLogout, HabitProfileSwitcher, HabitThemeToggle } from "@/components/habits/habit-header-controls";
import { getActiveProfileId } from "@/lib/session";
import { requireAuth, getOwnProfileId } from "@/lib/auth";
import { getProfilesInHousehold } from "@/lib/db/repo";
import { getCategories } from "@/lib/db/repo-habits";
import { loadSelectableGoals } from "@/lib/goal-data";

// The Habits module is installable as its own app: separate manifest, name, icons and theme colour.
export const metadata: Metadata = {
  title: { default: "Habits · Istiqamahly", template: "%s · Habits" },
  description: "Build good habits, break bad ones, and track tasks and streaks with your family.",
  manifest: "/habits.webmanifest",
  applicationName: "Istiqamahly Habits",
  appleWebApp: { capable: true, title: "Habits", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icons/habits-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/habits-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/habits-apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#5b5bf0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover", // lets the shell use env(safe-area-inset-*) on notched phones
};

/**
 * Habit tracker shell. Deliberately its own layout with its own theme tokens (`.habits-theme`,
 * see globals.css): cool indigo SaaS look, sidebar on desktop, bottom bar on phones — nothing
 * shared with the prayer module's green chrome except auth and the profile/household model.
 */
export default async function HabitsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();
  const [profiles, activeProfileId, ownProfileId] = await Promise.all([
    getProfilesInHousehold(session.householdId),
    getActiveProfileId(),
    getOwnProfileId(),
  ]);
  const readOnly = ownProfileId === null || activeProfileId !== ownProfileId;
  const viewing = profiles.find((p) => p.id === activeProfileId);
  const categories = readOnly ? [] : await getCategories(activeProfileId);
  const goals = readOnly ? [] : await loadSelectableGoals();

  return (
    <div className="habits-theme habits-app flex min-h-dvh flex-1 flex-col bg-h-bg text-h-fg">
      <div className="mx-auto flex w-full max-w-md flex-1 md:max-w-[100rem] md:flex-row">
        <HabitSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <OfflineBadge />
          <header className="sticky top-0 z-30 flex flex-col gap-2 bg-h-bg/90 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur md:px-8">
            <div className="flex items-center justify-between gap-2">
              <ModuleSwitcher current="habits" tone="habits" />
              <div className="flex items-center gap-2">
                <HabitProfileSwitcher
                  profiles={profiles.map((p) => ({ id: p.id, name: p.name }))}
                  activeProfileId={activeProfileId}
                />
                <HabitThemeToggle />
                <HabitLogout />
              </div>
            </div>
            {readOnly && (
              <p className="self-end rounded-full bg-h-break-soft px-3 py-1 text-[11px] font-bold text-h-break">
                Viewing {viewing?.name ?? "family member"} — read only
              </p>
            )}
          </header>
          <main className="flex-1 px-4 pb-28 pt-2 md:px-8 md:pb-12">
            <InstallPrompt />
            {children}
          </main>
          {!readOnly && <AddFab categories={categories} circleSize={profiles.length} goals={goals} />}
          <HabitBottomNav />
        </div>
      </div>
    </div>
  );
}
