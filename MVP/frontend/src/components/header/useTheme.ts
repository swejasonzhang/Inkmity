import { useEffect, useMemo, useState } from "react";
import whiteLogo from "@/assets/WhiteLogo.png";
import blackLogo from "@/assets/BlackLogo.png";

export const THEME_MS = 600;
type Theme = "dark" | "light";

export function useTheme(scopeEl?: Element | null) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") return saved as Theme;
    } catch {}
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: light)").matches
    ) {
      return "light";
    }
    return "dark";
  });

  useEffect(() => {
    try {
      localStorage.setItem("theme", theme);
    } catch {}

    if (!scopeEl) return;

    scopeEl.classList.toggle("ink-light", theme === "light");
    scopeEl.classList.toggle("dark", theme === "dark");
  }, [theme, scopeEl]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  const logoSrc = useMemo(
    () => (theme === "light" ? blackLogo : whiteLogo),
    [theme]
  );

  const themeClass = theme === "light" ? "ink-light" : "dark";

  return { theme, toggleTheme, logoSrc, themeClass };
}