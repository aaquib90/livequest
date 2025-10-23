"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isReady: boolean;
};

const STORAGE_KEY = "livequest-theme";
const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
  isReady: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const stored = (window.localStorage.getItem(STORAGE_KEY) as Theme | null) ?? null;
    const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    const initialTheme: Theme = stored ?? (prefersLight ? "light" : "dark");

    applyThemeClass(root, initialTheme);
    setThemeState(initialTheme);
    setIsReady(true);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    const handlePreferenceChange = (event: MediaQueryListEvent) => {
      const persisted = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (persisted) return;
      const nextTheme: Theme = event.matches ? "light" : "dark";
      applyThemeClass(root, nextTheme);
      setThemeState(nextTheme);
    };
    mediaQuery.addEventListener("change", handlePreferenceChange);
    return () => mediaQuery.removeEventListener("change", handlePreferenceChange);
  }, []);

  const setTheme = (next: Theme) => {
    const root = document.documentElement;
    applyThemeClass(root, next);
    setThemeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      isReady,
    }),
    [theme, isReady],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

function applyThemeClass(root: HTMLElement, theme: Theme) {
  root.classList.remove("light", "dark");
  root.classList.add(theme);
}
