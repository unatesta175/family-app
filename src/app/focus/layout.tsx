import type { Metadata, Viewport } from "next";
import { ModuleSwitcher } from "@/components/module-switcher";
import { FocusBottomNav, FocusSidebar } from "@/components/focus/focus-nav";
import { HabitLogout, HabitThemeToggle } from "@/components/habits/habit-header-controls";
import { requireAuth } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: "Focus · Istiqamahly", template: "%s · Focus" },
  description: "Grow a tree for every focus session and watch your grove fill up.",
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/** Focus module shell: the shared habit tokens in the pine palette (`.focus-theme`). */
export default async function FocusLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return (
    <div className="habits-theme focus-theme habits-app flex min-h-dvh flex-1 flex-col bg-h-bg text-h-fg">
      <div className="mx-auto flex w-full max-w-md flex-1 md:max-w-6xl md:flex-row">
        <FocusSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-2 bg-h-bg/90 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur md:px-8">
            <ModuleSwitcher current="focus" tone="habits" />
            <div className="flex items-center gap-2">
              <HabitThemeToggle />
              <HabitLogout />
            </div>
          </header>
          <main className="flex-1 px-4 pb-28 pt-2 md:px-8 md:pb-12">{children}</main>
          <FocusBottomNav />
        </div>
      </div>
    </div>
  );
}
