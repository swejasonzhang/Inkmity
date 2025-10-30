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
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

function setMeta(theme: Theme) {
  document
    .querySelector('meta[name="color-scheme"]')
    ?.setAttribute("content", theme === "dark" ? "dark light" : "light dark");
}

export function useTheme(_scopeEl?: Element | null) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const html = document.documentElement;
    if (theme === "dark") html.classList.add("dark");
    else html.classList.remove("dark");
    setMeta(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));
  const logoSrc = useMemo(
    () => (theme === "light" ? blackLogo : whiteLogo),
    [theme]
  );
  const themeClass = ""; 

  return { theme, toggleTheme, logoSrc, themeClass };
}
