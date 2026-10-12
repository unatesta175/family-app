import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { ModuleSwitcher } from "@/components/module-switcher";
import { FinanceBottomNav, FinanceSidebar } from "@/components/finance/finance-nav";
import { FinanceFamilyBar, FinanceViewingBanner } from "@/components/finance/finance-family-bar";
import { HabitLogout, HabitThemeToggle } from "@/components/habits/habit-header-controls";
import { requireAuth } from "@/lib/auth";
import { listFinanceMembers } from "@/lib/finance-data";

export const metadata: Metadata = {
  title: { default: "Finance · Istiqamahly", template: "%s · Finance" },
  description: "Track spending, stay under your daily budget, and never run out before payday.",
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/** Finance module shell. Shares the Habits theme tokens (`.habits-theme`), palette swapped via `.finance-theme`. */
export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  const members = await listFinanceMembers();
  return (
    <div className="habits-theme finance-theme habits-app flex min-h-dvh flex-1 flex-col bg-h-bg text-h-fg">
      <div className="mx-auto flex w-full max-w-md flex-1 md:max-w-6xl md:flex-row">
        <Suspense>
          <FinanceSidebar />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-2 bg-h-bg/90 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur md:px-8">
            <ModuleSwitcher current="finance" tone="habits" />
            <div className="flex min-w-0 items-center gap-2">
              <Suspense>
                <FinanceFamilyBar members={members} />
              </Suspense>
              <HabitThemeToggle />
              <HabitLogout />
            </div>
          </header>
          <main className="flex-1 px-4 pb-28 pt-2 md:px-8 md:pb-12">
            <Suspense>
              <FinanceViewingBanner members={members} />
            </Suspense>
            {children}
          </main>
          <Suspense>
            <FinanceBottomNav />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
