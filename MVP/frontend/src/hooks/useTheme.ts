import { useEffect, useMemo, useRef, useState } from "react";

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
  const rafHandle = useRef<number | null>(null);
  const timer = useRef<number | null>(null);

  const applyToScope = (t: Theme) => {
    const el = resolveScope(scopeEl);
    if (el) {
      el.classList.add("ink-scope");
      el.classList.add("ink-theming");
      el.classList.toggle("ink-light", t === "light");
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(
        () => el.classList.remove("ink-theming"),
        THEME_MS
      );
      return true;
    }
    return false;
  };

  useEffect(() => {
    const applied = applyToScope(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
    if (!applied) {
      rafHandle.current = window.requestAnimationFrame(() => {
        applyToScope(theme);
      });
    }
    window.dispatchEvent(
      new CustomEvent("ink:theme-change", {
        detail: { key: STORAGE_KEY, value: theme },
      })
    );
    return () => {
      if (rafHandle.current) {
        cancelAnimationFrame(rafHandle.current);
        rafHandle.current = null;
      }
      if (timer.current) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [theme]);

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

  const themeClass = useMemo(() => "", []);
  const logoSrc = useMemo(
    () =>
      theme === "light" ? "/assets/BlackLogo.png" : "/assets/WhiteLogo.png",
    [theme]
  );

  return { theme, toggleTheme, logoSrc, themeClass };
}