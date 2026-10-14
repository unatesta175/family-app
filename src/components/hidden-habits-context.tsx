"use client";

import { createContext, useContext, useState } from "react";

const STORAGE_KEY = "hiddenHabitsRevealed";

type HiddenHabitsState = { revealed: boolean; reveal: () => void; conceal: () => void };

const HiddenHabitsContext = createContext<HiddenHabitsState | null>(null);

/**
 * Whether habits marked `hidden` should currently render, for the signed-in user's own view.
 * Lives in localStorage (not the DB): a this-device display preference that survives reloads
 * and new tabs, but defaults to concealed the very first time there's no stored value yet.
 */
export function HiddenHabitsProvider({ children }: { children: React.ReactNode }) {
  const [revealed, setRevealed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const reveal = () => {
    setRevealed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  };
  const conceal = () => {
    setRevealed(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  return <HiddenHabitsContext.Provider value={{ revealed, reveal, conceal }}>{children}</HiddenHabitsContext.Provider>;
}

export function useHiddenHabits() {
  const ctx = useContext(HiddenHabitsContext);
  if (!ctx) throw new Error("useHiddenHabits must be used within HiddenHabitsProvider");
  return ctx;
}

/** Filters a list down to what the owner should currently see on this device. */
export function useVisibleHabits<T extends { hidden: boolean }>(habits: T[]): T[] {
  const { revealed } = useHiddenHabits();
  return revealed ? habits : habits.filter((h) => !h.hidden);
}
