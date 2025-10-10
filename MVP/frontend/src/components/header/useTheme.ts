import { useEffect, useMemo, useState } from "react";
import whiteLogo from "@/assets/WhiteLogo.png";
import blackLogo from "@/assets/BlackLogo.png";

export const THEME_MS = 600;
type Theme = "dark" | "light";
const KEY = "theme";
const EVT = "ink-theme-change";

function readInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: light)").matches
  ) {
    return "light";
  }
  return "dark";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, theme);
    } catch {}
    const ev = new CustomEvent(EVT, { detail: theme });
    window.dispatchEvent(ev);
  }, [theme]);

  useEffect(() => {
    const onCustom = (e: Event) => {
      const t = (e as CustomEvent).detail as Theme | undefined;
      if (t && t !== theme) setTheme(t);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && (e.newValue === "light" || e.newValue === "dark")) {
        const t = e.newValue as Theme;
        if (t !== theme) setTheme(t);
      }
    };
    window.addEventListener(EVT, onCustom);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVT, onCustom);
      window.removeEventListener("storage", onStorage);
    };
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));
  const logoSrc = useMemo(
    () => (theme === "light" ? blackLogo : whiteLogo),
    [theme]
  );
  const themeClass = theme === "light" ? "light" : "";

  return { theme, toggleTheme, logoSrc, themeClass };
}
