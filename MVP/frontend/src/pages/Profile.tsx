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
      className="ink-scope flex flex-col min-h-screen"
      style={{ background: shellBg, color: shellFg }}
    >
      <Header />
      <main 
        className="flex-1 flex items-start justify-center"
        style={{ 
          opacity: fadeIn ? 1 : 0, 
          transition: `opacity ${FADE_MS}ms ease-in-out`,
        }}
      >
        <div className="w-full max-w-7xl px-3 xs:px-4 sm:px-5 md:px-6 lg:px-8 xl:px-10 flex items-stretch justify-center py-3 xs:py-4 sm:py-5 md:py-6 lg:py-7 mt-3 xs:mt-4 sm:mt-5 md:mt-6 lg:mt-8 pb-6 xs:pb-7 sm:pb-8 md:pb-9 lg:pb-10">
          <Suspense fallback={null}>
            {role === "artist" ? <ArtistProfile /> : <ClientProfile />}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
