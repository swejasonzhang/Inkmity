import { useEffect, useMemo, useState, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

export const THEME_MS = 900;
type Theme = "dark" | "light";
const STORAGE_KEY = "dashboard-theme";

const q = (sel: string) => document.querySelector<HTMLElement>(sel);
const qsa = (sel: string) =>
  Array.from(document.querySelectorAll<HTMLElement>(sel));

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved as Theme;
  } catch {}
  return "dark";
}

export function useTheme() {
  const { pathname } = useLocation();
  const isDashboard = pathname.startsWith("/dashboard");

  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const timers = new Set<number>();

  const applyTheme = (t: Theme, animate: boolean) => {
    const dash = q("#dashboard-scope");
    const publicScope = q("#public-scope");
    const scopes = qsa(".ink-scope");

    scopes.forEach((n) => {
      n.classList.remove("ink-light", "ink-theming", "ink-smoothing");
      n.removeAttribute("data-ink");
    });

    if (isDashboard && dash) {
      if (animate) {
        dash.classList.add("ink-theming", "ink-smoothing");
        const id = window.setTimeout(() => {
          dash.classList.remove("ink-theming", "ink-smoothing");
          timers.delete(id);
        }, THEME_MS + 40);
        timers.add(id);
      }

      if (t === "light") {
        dash.classList.add("ink-light");
        dash.setAttribute("data-ink", "light");
      } else {
        dash.setAttribute("data-ink", "dark");
      }
    }

    if (publicScope) {
      publicScope.classList.remove("ink-light");
      publicScope.setAttribute("data-ink", "dark");
    }
  };

  useLayoutEffect(() => {
    applyTheme(theme, false);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
    };
  }, [isDashboard]);

  useEffect(() => {
    applyTheme(theme, true);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}

    window.dispatchEvent(
      new CustomEvent("ink:theme-change", {
        detail: { key: STORAGE_KEY, value: theme },
      })
    );
  }, [theme, isDashboard]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key !== STORAGE_KEY) return;
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const next = saved === "light" ? "light" : "dark";
        setTheme(next);
      } catch {}
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggleTheme = () => {
    if (!isDashboard) return; 
    setTheme((t) => (t === "light" ? "dark" : "light"));
  };

  const themeClass = useMemo(() => "ink-scope", []);

  const logoSrc = useMemo(() => {
    if (!isDashboard) return "/assets/WhiteLogo.png";
    return theme === "light"
      ? "/assets/BlackLogo.png"
      : "/assets/WhiteLogo.png";
  }, [theme, isDashboard]);

  return {
    theme: isDashboard ? theme : "dark", 
    toggleTheme,
    logoSrc,
    themeClass,
    canToggleTheme: isDashboard, 
  };
}
