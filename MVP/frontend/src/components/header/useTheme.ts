import { useEffect, useMemo, useState } from "react";
import whiteLogo from "@/assets/WhiteLogo.png";
import blackLogo from "@/assets/BlackLogo.png";

export const THEME_MS = 600;
type Theme = "dark" | "light";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") return saved;
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
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));
  const logoSrc = useMemo(
    () => (theme === "light" ? blackLogo : whiteLogo),
    [theme]
  );

  const themeClass = theme === "light" ? "ink-light" : "";

  return { theme, toggleTheme, logoSrc, themeClass };
}