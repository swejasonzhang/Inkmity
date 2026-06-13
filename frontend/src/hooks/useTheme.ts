import { useCallback, useLayoutEffect, useMemo, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";

export const THEME_MS = 300;
type Theme = "dark" | "light";
const STORAGE_KEY = "inkmity-theme";

export function isThemedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/artists") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/appointments") ||
    pathname.startsWith("/portfolio") ||
    pathname.startsWith("/explore") ||
    pathname.startsWith("/artist/")
  );
}

function readStored(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
    const legacy = localStorage.getItem("dashboard-theme");
    if (legacy === "light" || legacy === "dark") {
      localStorage.setItem(STORAGE_KEY, legacy);
      return legacy;
    }
  } catch {}
  return "dark";
}

let store: Theme = readStored();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot(): Theme {
  return store;
}
function setStore(t: Theme) {
  if (store === t) return;
  store = t;
  try {
    localStorage.setItem(STORAGE_KEY, t);
  } catch {}
  notify();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    const next = e.newValue === "light" || e.newValue === "dark" ? e.newValue : "dark";
    if (next !== store) {
      store = next;
      notify();
    }
  });

  if (isThemedPath(window.location.pathname)) {
    const html = document.documentElement;
    html.setAttribute("data-ink", store);
    html.setAttribute("data-ink-themed", "true");
    html.classList.toggle("ink-light", store === "light");
  }
}

function applyToDom(t: Theme, animate: boolean) {
  const html = document.documentElement;
  const dash = document.getElementById("dashboard-scope");
  if (!dash) {
    html.removeAttribute("data-ink-themed");
    html.classList.remove("ink-light");
    html.setAttribute("data-ink", "dark");
    return;
  }
  if (animate) {
    dash.classList.add("ink-smoothing");
    window.setTimeout(() => dash.classList.remove("ink-smoothing"), THEME_MS + 40);
  }
  dash.classList.toggle("ink-light", t === "light");
  dash.setAttribute("data-ink", t);
  html.setAttribute("data-ink", t);
  html.setAttribute("data-ink-themed", "true");
  html.classList.toggle("ink-light", t === "light");
}

export function useTheme() {
  const { pathname } = useLocation();
  const themed = isThemedPath(pathname);
  const stored = useSyncExternalStore(subscribe, getSnapshot, () => "dark" as Theme);
  const theme: Theme = themed ? stored : "dark";

  useLayoutEffect(() => {
    applyToDom(theme, false);
  }, [theme, pathname]);

  const toggleTheme = useCallback(() => {
    if (!themed) return;
    const next: Theme = store === "light" ? "dark" : "light";
    setStore(next);
    applyToDom(next, false);
  }, [themed]);

  const logoSrc = useMemo(() => {
    if (!themed) return "/assets/WhiteLogo.png";
    return theme === "light" ? "/assets/BlackLogo.png" : "/assets/WhiteLogo.png";
  }, [theme, themed]);

  return {
    theme,
    toggleTheme,
    logoSrc,
    themeClass: "ink-scope" as const,
    canToggleTheme: themed,
  };
}
