import { useEffect, useMemo, useState, useLayoutEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import { useLocation } from "react-router-dom";

export const THEME_MS = 900;
type Theme = "dark" | "light";
const LEGACY_STORAGE_KEY = "dashboard-theme";
const STORAGE_NAMESPACE = `${LEGACY_STORAGE_KEY}::`;
const GUEST_STORAGE_KEY = `${STORAGE_NAMESPACE}guest`;

function getStoredTheme(key: string): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(key);
    return saved === "light" || saved === "dark" ? saved : null;
  } catch {
    return null;
  }
}

const q = (sel: string) => document.querySelector<HTMLElement>(sel);
const qsa = (sel: string) =>
  Array.from(document.querySelectorAll<HTMLElement>(sel));

function getInitialTheme(): Theme {
  const scoped = getStoredTheme(GUEST_STORAGE_KEY);
  if (scoped) return scoped;
  const legacy = getStoredTheme(LEGACY_STORAGE_KEY);
  if (legacy) return legacy;
  return "dark";
}

function setStoredTheme(key: string, value: Theme) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {}
}

export function useTheme() {
  const { pathname } = useLocation();
  const { user, isLoaded: isUserLoaded } = useUser();
  const isDashboard = pathname.startsWith("/dashboard");

  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const timersRef = useRef(new Set<number>());

  const storageKey = useMemo(
    () => (user?.id ? `${STORAGE_NAMESPACE}${user.id}` : GUEST_STORAGE_KEY),
    [user?.id]
  );

  const applyTheme = (t: Theme, animate: boolean) => {
    const timers = timersRef.current;
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

  const initialEffectRef = useRef(true);

  useLayoutEffect(() => {
    applyTheme(theme, false);
    initialEffectRef.current = true;

    return () => {
      const timers = timersRef.current;
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
    };
  }, [isDashboard, storageKey]);

  useEffect(() => {
    if (!isUserLoaded) return;
    const stored =
      getStoredTheme(storageKey) ??
      (user?.id ? getStoredTheme(LEGACY_STORAGE_KEY) : null);
    if (stored && stored !== theme) {
      setTheme(stored);
    }
  }, [storageKey, isUserLoaded]);

  useEffect(() => {
    const shouldAnimate = initialEffectRef.current ? false : true;
    applyTheme(theme, shouldAnimate);
    if (initialEffectRef.current) {
      initialEffectRef.current = false;
    }
    setStoredTheme(storageKey, theme);
    if (storageKey !== LEGACY_STORAGE_KEY) {
      setStoredTheme(LEGACY_STORAGE_KEY, theme);
    }

    window.dispatchEvent(
      new CustomEvent("ink:theme-change", {
        detail: {
          key: LEGACY_STORAGE_KEY,
          scopedKey: storageKey,
          value: theme,
        },
      })
    );
  }, [theme, isDashboard, storageKey]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key !== storageKey && e.key !== LEGACY_STORAGE_KEY) return;
      try {
        const saved =
          getStoredTheme(storageKey) ?? getStoredTheme(LEGACY_STORAGE_KEY);
        const next = saved ?? "dark";
        setTheme(next);
      } catch {}
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [storageKey]);

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
