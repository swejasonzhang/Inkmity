import { useEffect, useMemo, useState, useRef, useCallback } from "react";
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
  if (typeof window === "undefined") return "dark";
  
  const legacy = getStoredTheme(LEGACY_STORAGE_KEY);
  if (legacy) return legacy;
  
  const scoped = getStoredTheme(GUEST_STORAGE_KEY);
  if (scoped) return scoped;
  
  try {
    const userId = (window as any).__CLERK_USER_ID__;
    if (userId) {
      const userKey = `${STORAGE_NAMESPACE}${userId}`;
      const userTheme = getStoredTheme(userKey);
      if (userTheme) return userTheme;
    }
  } catch {}
  
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

  const [theme, setTheme] = useState<Theme>(() => {
    if (isDashboard) {
      const stored = getInitialTheme();
      return stored;
    }
    return "dark";
  });
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

    if (isDashboard && dash) {
      const currentTheme = dash.classList.contains("ink-light") || dash.getAttribute("data-ink") === "light" ? "light" : "dark";
      if (!animate && currentTheme === t && initialEffectRef.current === false) {
        return;
      }
    }

    scopes.forEach((n) => {
      if (n.getAttribute("data-ink-modal-portal") === "true") return;
      if (n.getAttribute("data-ink-no-theme") === "true") return;
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
  const previousThemeRef = useRef<Theme | null>(null);
  const userLoadedRef = useRef(false);

  useEffect(() => {
    if (!isUserLoaded) return;
    if (!isDashboard) return; // Don't load theme for non-dashboard pages
    
    const stored =
      getStoredTheme(storageKey) ??
      (user?.id ? getStoredTheme(LEGACY_STORAGE_KEY) : getStoredTheme(LEGACY_STORAGE_KEY));
    
    if (stored && stored !== theme) {
      setTheme(stored);
      return;
    }
    
    if (!userLoadedRef.current) {
      userLoadedRef.current = true;
      if (!stored && theme !== "dark") {
        setStoredTheme(storageKey, theme);
        if (storageKey !== LEGACY_STORAGE_KEY) {
          setStoredTheme(LEGACY_STORAGE_KEY, theme);
        }
      }
    }
  }, [isUserLoaded, storageKey, user?.id, isDashboard]);

  useEffect(() => {
    if (!isDashboard && theme !== "dark") {
      setTheme("dark");
    }
  }, [isDashboard, theme]);

  useEffect(() => {
    const isInitialMount = initialEffectRef.current;
    const previousTheme = previousThemeRef.current;
    const themeChanged = previousTheme !== null && previousTheme !== theme;
    
    const dash = q("#dashboard-scope");
    const currentDashTheme = dash?.classList.contains("ink-light") || dash?.getAttribute("data-ink") === "light" ? "light" : "dark";
    
    if (isInitialMount) {
      if (!isDashboard) {
        applyTheme("dark", false);
        initialEffectRef.current = false;
        previousThemeRef.current = "dark";
        return;
      }
      
      const stored =
        getStoredTheme(storageKey) ??
        (user?.id ? getStoredTheme(LEGACY_STORAGE_KEY) : getStoredTheme(LEGACY_STORAGE_KEY));
      
      if (stored && stored !== theme) {
        setTheme(stored);
        return;
      }
      
      applyTheme(theme, false);
      initialEffectRef.current = false;
      previousThemeRef.current = theme;
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
      return;
    }

    if (!themeChanged) {
      if (isDashboard && dash && currentDashTheme !== theme) {
        applyTheme(theme, false);
        setStoredTheme(storageKey, theme);
        if (storageKey !== LEGACY_STORAGE_KEY) {
          setStoredTheme(LEGACY_STORAGE_KEY, theme);
        }
      }
      return;
    }

    if (currentDashTheme === theme) {
      previousThemeRef.current = theme;
      return;
    }

    applyTheme(theme, true);
    previousThemeRef.current = theme;
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

    return () => {
      const timers = timersRef.current;
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
    };
  }, [theme, storageKey, user?.id, isDashboard]);

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

  const toggleTheme = useCallback(() => {
    if (!isDashboard) return;
    const dash = q("#dashboard-scope");
    const currentTheme = dash?.classList.contains("ink-light") || dash?.getAttribute("data-ink") === "light" ? "light" : "dark";
    const newTheme = currentTheme === "light" ? "dark" : "light";
    setTheme(newTheme);
    setStoredTheme(storageKey, newTheme);
    if (storageKey !== LEGACY_STORAGE_KEY) {
      setStoredTheme(LEGACY_STORAGE_KEY, newTheme);
    }
  }, [isDashboard, storageKey]);

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
