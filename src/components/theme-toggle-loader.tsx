"use client";

import dynamic from "next/dynamic";

const ThemeToggle = dynamic(() => import("@/components/theme-toggle").then((m) => m.ThemeToggle), {
  ssr: false,
  loading: () => <div className="h-[42px] w-full animate-pulse rounded-full bg-neutral-100" />,
});

export { ThemeToggle };
