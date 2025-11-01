import { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";

export const THEME_MS = 900;
type Theme = "dark" | "light";
const STORAGE_KEY = "dashboard-theme";

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved as Theme;
  } catch {}
  return "dark";
}

function resolveScope(scopeEl?: Element | null) {
  if (scopeEl instanceof HTMLElement) return scopeEl as HTMLElement;
  return (
    (document.getElementById("dashboard-scope") as HTMLElement | null) ||
    (document.querySelector(".ink-scope") as HTMLElement | null)
  );
}

export function useTheme(scopeEl?: Element | null) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const lastApplied = useRef<Theme | null>(null);
  const timer = useRef<number | null>(null);

  const applyToScope = (t: Theme, animate: boolean) => {
    const el = resolveScope(scopeEl);
    if (!el) return false;

    el.classList.add("ink-scope");
    el.classList.toggle("ink-light", t === "light");

    if (animate) {
      el.classList.add("ink-theming");
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        el.classList.remove("ink-theming");
      }, THEME_MS);
    } else {
      el.classList.remove("ink-theming");
    }

    lastApplied.current = t;
    return true;
  };

  // First paint: apply WITHOUT animation to avoid any veil/flash.
  useLayoutEffect(() => {
    applyToScope(theme, false);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
    // no dispatch on initial mount (prevents listeners from re-applying)
    return () => {
      if (timer.current) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    };
    // we intentionally run once; theme changes are handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subsequent theme changes: animate (veil) only when theme actually changes.
  useEffect(() => {
    if (lastApplied.current === null) return; // initial handled by layout effect above
    if (lastApplied.current === theme) return;

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
  }, [theme, scopeEl]);

  // Cross-tab and in-app bus sync
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
    () => (theme === "light" ? "ink-scope ink-light" : "ink-scope"),
    [theme]
  );

  const logoSrc = useMemo(
    () =>
      theme === "light" ? "/assets/BlackLogo.png" : "/assets/WhiteLogo.png",
    [theme]
  );

  return { theme, toggleTheme, logoSrc, themeClass };
}