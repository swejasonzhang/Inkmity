import { lazy, Suspense, useLayoutEffect, useRef, useEffect, useState } from "react";
import { useRole } from "@/hooks/useRole";
import { useTheme } from "@/hooks/useTheme";
import Header from "@/components/header/Header";

const ArtistProfile = lazy(() => import("@/components/dashboard/artist/ArtistProfile"));
const ClientProfile = lazy(() => import("@/components/dashboard/client/ClientProfile"));

const FADE_MS = 300;

function applyTheme(el: HTMLElement, theme: "light" | "dark") {
  el.classList.toggle("ink-light", theme === "light");
  el.setAttribute("data-ink", theme);
}

function useDashboardScope(scopeEl: HTMLElement | null, theme: "light" | "dark") {
  useLayoutEffect(() => {
    if (!scopeEl) return;
    scopeEl.classList.add("ink-scope", "ink-no-anim");
    applyTheme(scopeEl, theme);
    requestAnimationFrame(() => scopeEl.classList.remove("ink-no-anim"));
  }, [scopeEl, theme]);
}

export default function Profile() {
  const { role, isLoaded } = useRole();
  const { theme } = useTheme();
  const scopeRef = useRef<HTMLDivElement | null>(null);
  const [fadeIn, setFadeIn] = useState(false);

  useLayoutEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = theme === "light" ? "#ffffff" : "#0b0b0b";
    return () => {
      document.body.style.backgroundColor = prev;
    };
  }, [theme]);

  useEffect(() => {
    if (!isLoaded) {
      setFadeIn(false);
      return;
    }
    
    setFadeIn(false);
    const timer = setTimeout(() => {
      setFadeIn(true);
    }, 50);
    
    return () => clearTimeout(timer);
  }, [isLoaded, role]);

  useEffect(() => {
    const handleThemeChange = (e?: CustomEvent) => {
      const scope = scopeRef.current;
      if (!scope) return;
      const newTheme = (e?.detail?.value as "light" | "dark") || theme;
      applyTheme(scope, newTheme);
      const shellBg = newTheme === "light" ? "#ffffff" : "#0b0b0b";
      const shellFg = newTheme === "light" ? "#111111" : "#f5f5f5";
      scope.style.background = shellBg;
      scope.style.color = shellFg;
      document.body.style.backgroundColor = shellBg;
    };
    
    handleThemeChange();
    const handler = handleThemeChange as EventListener;
    window.addEventListener("ink:theme-change", handler);
    return () => window.removeEventListener("ink:theme-change", handler);
  }, [theme]);

  useDashboardScope(scopeRef.current, theme);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.innerWidth < 640;
    if (isMobile && isLoaded) {
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.width = "";
      };
    }
  }, [isLoaded]);

  const shellBg = theme === "light" ? "#ffffff" : "#0b0b0b";
  const shellFg = theme === "light" ? "#111111" : "#f5f5f5";

  if (!isLoaded) {
    return (
      <div
        ref={scopeRef}
        id="dashboard-scope"
        className="ink-scope min-h-dvh overflow-y-hidden flex flex-col"
        style={{ background: shellBg, color: shellFg }}
      >
        <Header />
      </div>
    );
  }

  return (
    <div
      ref={scopeRef}
      id="dashboard-scope"
      className="ink-scope overflow-y-hidden flex flex-col"
      style={{ background: shellBg, color: shellFg, height: "100vh", maxHeight: "100vh", overflow: "hidden" }}
    >
      <Header />
      <main 
        className="flex-1 min-h-0 overflow-hidden flex items-center justify-center sm:overflow-auto"
        style={{ 
          opacity: fadeIn ? 1 : 0, 
          transition: `opacity ${FADE_MS}ms ease-in-out`,
          overscrollBehavior: "none",
          touchAction: "none",
          height: "calc(100vh - 96px)",
          maxHeight: "calc(100vh - 96px)"
        }}
      >
        <div className="w-full max-w-7xl px-4 sm:px-6 md:px-8 flex items-stretch sm:items-center justify-center h-full overflow-hidden sm:overflow-visible pb-2 sm:pb-0">
          <Suspense fallback={null}>
            {role === "artist" ? <ArtistProfile /> : <ClientProfile />}
          </Suspense>
        </div>
      </main>
    </div>
  );
}

