import { useEffect, useMemo, useState } from "react";
import whiteLogo from "@/assets/WhiteLogo.png";
import blackLogo from "@/assets/BlackLogo.png";

export const THEME_MS = 600;
type Theme = "dark" | "light";
const STORAGE_KEY = "theme";

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
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

function applyClass(theme: Theme, el: Element) {
  const c = el.classList;
  if (theme === "light") {
    c.add("ink-light");
    c.remove("dark");
  } else {
    c.add("dark");
    c.remove("ink-light");
  }
}

export function useTheme(scopeEl?: Element | null) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  const target =
    scopeEl ??
    (typeof document !== "undefined" ? document.documentElement : null);

  useEffect(() => {
    if (!target) return;
    applyClass(theme, target);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme, target]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  const logoSrc = useMemo(
    () => (theme === "light" ? blackLogo : whiteLogo),
    [theme]
  );
  const themeClass = theme === "light" ? "ink-light" : "dark";

  return { theme, toggleTheme, logoSrc, themeClass };
}