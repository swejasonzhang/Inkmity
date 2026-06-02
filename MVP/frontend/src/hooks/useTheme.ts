import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

export const THEME_MS = 300;
type Theme = "dark" | "light";
const STORAGE_KEY = "inkmity-theme";

function readStored(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
    // migrate from legacy key
    const legacy = localStorage.getItem("dashboard-theme");
    if (legacy === "light" || legacy === "dark") {
      localStorage.setItem(STORAGE_KEY, legacy);
      return legacy;
    }
  } catch {}
  return "dark";
}

function writeStored(t: Theme) {
  try { localStorage.setItem(STORAGE_KEY, t); } catch {}
}

function applyToDom(t: Theme, animate: boolean) {
  const dash = document.getElementById("dashboard-scope");
  if (!dash) return;
  if (animate) {
    dash.classList.add("ink-smoothing");
    window.setTimeout(() => dash.classList.remove("ink-smoothing"), THEME_MS + 40);
  }
  dash.classList.toggle("ink-light", t === "light");
  dash.setAttribute("data-ink", t);
}

export function useTheme() {
  const { pathname } = useLocation();
  const isDashboard =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/appointments");

  const [theme, setTheme] = useState<Theme>(() =>
    isDashboard ? readStored() : "dark"
  );

  // Apply to DOM whenever isDashboard changes (no animation on mount)
  useEffect(() => {
    if (!isDashboard) return;
    applyToDom(theme, false);
  }, [isDashboard]);

  // Reset to dark when leaving dashboard routes
  useEffect(() => {
    if (!isDashboard && theme !== "dark") setTheme("dark");
  }, [isDashboard]);

  // Sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = e.newValue === "light" || e.newValue === "dark" ? e.newValue : "dark";
      setTheme(next);
      applyToDom(next, false);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggleTheme = useCallback(() => {
    if (!isDashboard) return;
    setTheme((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light";
      writeStored(next);
      applyToDom(next, true);
      return next;
    });
  }, [isDashboard]);

  const logoSrc = useMemo(() => {
    if (!isDashboard) return "/assets/WhiteLogo.png";
    return theme === "light" ? "/assets/BlackLogo.png" : "/assets/WhiteLogo.png";
  }, [theme, isDashboard]);

  return {
    theme: isDashboard ? theme : ("dark" as Theme),
    toggleTheme,
    logoSrc,
    themeClass: "ink-scope" as const,
    canToggleTheme: isDashboard,
  };
}
