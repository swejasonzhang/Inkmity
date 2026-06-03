import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

export const THEME_MS = 300;
type Theme = "dark" | "light";
const STORAGE_KEY = "inkmity-theme";

// Routes that support light/dark theming (and persist the choice). These all
// render inside #dashboard-scope. Public pages (incl. gallery) stay dark.
export function isThemedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/appointments") ||
    pathname.startsWith("/portfolio")
  );
}

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
  const themed = isThemedPath(pathname);

  const [theme, setTheme] = useState<Theme>(() =>
    themed ? readStored() : "dark"
  );

  // Apply to DOM whenever the themed-ness of the route changes (no animation on mount).
  useEffect(() => {
    applyToDom(themed ? theme : "dark", false);
  }, [themed]);

  // Reset to dark when leaving themed routes
  useEffect(() => {
    if (!themed && theme !== "dark") setTheme("dark");
  }, [themed]);

  // Sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = e.newValue === "light" || e.newValue === "dark" ? e.newValue : "dark";
      setTheme(next);
      if (themed) applyToDom(next, false);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [themed]);

  const toggleTheme = useCallback(() => {
    if (!themed) return;
    setTheme((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light";
      writeStored(next);
      applyToDom(next, true);
      return next;
    });
  }, [themed]);

  const logoSrc = useMemo(() => {
    if (!themed) return "/assets/WhiteLogo.png";
    return theme === "light" ? "/assets/BlackLogo.png" : "/assets/WhiteLogo.png";
  }, [theme, themed]);

  return {
    theme: themed ? theme : ("dark" as Theme),
    toggleTheme,
    logoSrc,
    themeClass: "ink-scope" as const,
    canToggleTheme: themed,
  };
}
