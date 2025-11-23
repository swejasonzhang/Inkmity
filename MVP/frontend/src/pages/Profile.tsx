import { lazy, Suspense, useLayoutEffect, useRef } from "react";
import { useRole } from "@/hooks/useRole";
import Header from "@/components/header/Header";

const LOAD_MS = 400;

const ArtistProfile = lazy(() => import("@/components/dashboard/artist/ArtistProfile"));
const ClientProfile = lazy(() => import("@/components/dashboard/client/ClientProfile"));

function readInitialTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  const KEY = "dashboard-theme";
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "dark";
  } catch {
    return "dark";
  }
}

function applyTheme(el: HTMLElement, theme: "light" | "dark") {
  el.classList.toggle("ink-light", theme === "light");
  el.setAttribute("data-ink", theme);
}

function useDashboardScope(scopeEl: HTMLElement | null, initialTheme: "light" | "dark") {
  useLayoutEffect(() => {
    if (!scopeEl) return;
    scopeEl.classList.add("ink-scope", "ink-no-anim");
    applyTheme(scopeEl, initialTheme);
    requestAnimationFrame(() => scopeEl.classList.remove("ink-no-anim"));
  }, [scopeEl, initialTheme]);
}

const Loading: React.FC<{ theme: "light" | "dark" }> = ({ theme }) => {
  const bg = theme === "light" ? "#ffffff" : "#0b0b0b";
  const fg = theme === "light" ? "#111111" : "#f5f5f5";
  return (
    <div
      className="fixed inset-0 grid place-items-center"
      style={{ zIndex: 2147483640, background: bg, color: fg }}
    >
      <style>{`
        @keyframes ink-fill { 0% { transform: scaleX(0); } 100% { transform: scaleX(1); } }
        @keyframes ink-pulse { 0%,100% { opacity:.4;} 50% {opacity:1;} }
      `}</style>
      <div className="flex flex-col items-center gap-4">
        <div className="w-56 h-2 rounded overflow-hidden" style={{ background: "rgba(0,0,0,0.1)" }}>
          <div className="h-full origin-left" style={{ background: fg, transform: "scaleX(0)", animation: `ink-fill ${LOAD_MS}ms linear forwards` }} />
        </div>
        <div className="text-xs tracking-widest uppercase" style={{ letterSpacing: "0.2em", opacity: 0.8, animation: "ink-pulse 1.2s ease-in-out infinite" }}>
          Loading
        </div>
      </div>
    </div>
  );
};

export default function Profile() {
  const { role, isLoaded } = useRole();
  const initialTheme = readInitialTheme();
  const scopeRef = useRef<HTMLDivElement | null>(null);
  useDashboardScope(scopeRef.current, initialTheme);

  useLayoutEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = initialTheme === "light" ? "#ffffff" : "#0b0b0b";
    return () => {
      document.body.style.backgroundColor = prev;
    };
  }, [initialTheme]);

  const shellBg = initialTheme === "light" ? "#ffffff" : "#0b0b0b";
  const shellFg = initialTheme === "light" ? "#111111" : "#f5f5f5";

  if (!isLoaded) {
    return (
      <div
        ref={scopeRef}
        id="dashboard-scope"
        className="ink-scope min-h-dvh overflow-y-hidden flex flex-col"
        style={{ background: shellBg, color: shellFg }}
      >
        <Header />
        <Loading theme={initialTheme} />
      </div>
    );
  }

  return (
    <div
      ref={scopeRef}
      id="dashboard-scope"
      className="ink-scope min-h-dvh overflow-y-hidden flex flex-col"
      style={{ background: shellBg, color: shellFg }}
    >
      <Header />
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 h-full">
          <Suspense
            fallback={
              <Loading theme={initialTheme} />
            }
          >
            {role === "artist" ? <ArtistProfile /> : <ClientProfile />}
          </Suspense>
        </div>
      </main>
    </div>
  );
}

