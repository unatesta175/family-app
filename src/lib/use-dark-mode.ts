"use client";

import { useCallback, useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  const observer = new MutationObserver(cb);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

/**
 * The app's light/dark preference. The source of truth is the `dark` class on <html> (set before
 * first paint by the inline script in the root layout) plus localStorage["theme"]; every toggle
 * in the app reads it through this hook so they always stay in sync.
 */
export function useDarkMode(): [boolean, (dark: boolean) => void] {
  const dark = useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("dark"),
    () => false
  );
  const setDark = useCallback((next: boolean) => {
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  }, []);
  return [dark, setDark];
}
