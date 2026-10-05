import type { Metadata, Viewport } from "next";
import { ModuleSwitcher } from "@/components/module-switcher";
import { GoalBottomNav, GoalSidebar } from "@/components/goals/goal-nav";
import { GoalFab } from "@/components/goals/goal-fab";
import { HabitLogout, HabitThemeToggle } from "@/components/habits/habit-header-controls";
import { Suspense } from "react";
import { FamilyBar, ViewingBanner } from "@/components/goals/family-bar";
import { requireAuth } from "@/lib/auth";
import { listCircleMembers } from "@/lib/goal-member";

export const metadata: Metadata = {
  title: { default: "Goals · Istiqamahly", template: "%s · Goals" },
  description: "Set the goals you want in life and track them with milestones, numbers and habits.",
};

export const viewport: Viewport = {
  themeColor: "#d97706",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/** Goals module shell. Shares the Habits theme tokens (`.habits-theme`) so the two feel like one product. */
export default async function GoalsLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  const members = await listCircleMembers();
  return (
    <div className="habits-theme goals-theme habits-app flex min-h-dvh flex-1 flex-col bg-h-bg text-h-fg">
      <div className="mx-auto flex w-full max-w-md flex-1 md:max-w-6xl md:flex-row">
        <Suspense>
          <GoalSidebar />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-2 bg-h-bg/90 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur md:px-8">
            <ModuleSwitcher current="goals" tone="habits" />
            <div className="flex min-w-0 items-center gap-2">
              <Suspense>
                <FamilyBar members={members} />
              </Suspense>
              <HabitThemeToggle />
              <HabitLogout />
            </div>
          </header>
          <main className="flex-1 px-4 pb-28 pt-2 md:px-8 md:pb-12">
            <Suspense>
              <ViewingBanner members={members} />
            </Suspense>
            {children}
          </main>
          <Suspense>
            <GoalFab />
            <GoalBottomNav />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
