import { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

export const THEME_MS = 900;
type Theme = "dark" | "light";
const STORAGE_KEY = "dashboard-theme";

const qs = (sel: string) => document.querySelector(sel) as HTMLElement | null;
const qsa = (sel: string) =>
  Array.from(document.querySelectorAll(sel)) as HTMLElement[];

function resolveScope(
  isDashboard: boolean,
  scopeEl?: Element | null
): HTMLElement | null {
  if (scopeEl instanceof HTMLElement) return scopeEl;
  if (isDashboard) return qs("#dashboard-scope") || qs(".ink-scope");
  return qs("#public-scope") || qs(".ink-scope");
}

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved as Theme;
  } catch {}
  const prefersDark = window.matchMedia?.(
    "(prefers-color-scheme: dark)"
  )?.matches;
  return prefersDark ? "dark" : "light";
}

export function useTheme(scopeEl?: Element | null) {
  const { pathname } = useLocation();
  const isDashboard = pathname.startsWith("/dashboard");

  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const lastApplied = useRef<Theme | null>(null);
  const timer = useRef<number | null>(null);

  const stripAllLight = () => {
    qsa(".ink-scope.ink-light").forEach((n) => n.classList.remove("ink-light"));
  };

  const applyToScope = (t: Theme, animate: boolean) => {
    const el = resolveScope(isDashboard, scopeEl);
    if (!el) {
      if (!isDashboard) stripAllLight();
      return false;
    }

    el.classList.add("ink-scope");

    const shouldLight = isDashboard && t === "light";
    el.classList.toggle("ink-light", shouldLight);

    if (!isDashboard) stripAllLight();

    if (animate && isDashboard) {
      el.classList.add("ink-theming", "ink-smoothing");
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        el.classList.remove("ink-theming", "ink-smoothing");
      }, THEME_MS + 40);
    } else {
      el.classList.remove("ink-theming", "ink-smoothing");
    }

    lastApplied.current = t;
    return true;
  };

  useLayoutEffect(() => {
    applyToScope(theme, false);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
    return () => {
      const el = resolveScope(isDashboard, scopeEl);
      if (el) {
        el.classList.remove("ink-theming", "ink-smoothing");
        el.classList.remove("ink-light");
      }
      if (timer.current) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [isDashboard, scopeEl]);

  useEffect(() => {
    if (lastApplied.current === null) return;
    applyToScope(theme, true);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}

    window.dispatchEvent(
      new CustomEvent("ink:theme-change", {
        detail: { key: STORAGE_KEY, value: theme },
      })
    );

    return () => {
      if (timer.current) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [theme, isDashboard, scopeEl]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key !== STORAGE_KEY) return;
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const next = saved === "light" ? "light" : "dark";
        setTheme(next);
      } catch {}
    };
    const onBus = (e: Event) => {
      const det = (e as CustomEvent).detail;
      if (!det || det.key !== STORAGE_KEY) return;
      setTheme(det.value === "light" ? "light" : "dark");
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("ink:theme-change", onBus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("ink:theme-change", onBus);
    };
  }, []);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  const themeClass = useMemo(
    () =>
      theme === "light" && isDashboard ? "ink-scope ink-light" : "ink-scope",
    [theme, isDashboard]
  );

  const logoSrc = useMemo(
    () =>
      theme === "light" && isDashboard
        ? "/assets/BlackLogo.png"
        : "/assets/WhiteLogo.png",
    [theme, isDashboard]
  );

  return { theme, toggleTheme, logoSrc, themeClass };
}