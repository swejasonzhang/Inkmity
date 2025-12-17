import React, { lazy, Suspense, useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useRole } from "@/hooks/useRole";
import { useSyncOnAuth } from "@/hooks/useSyncOnAuth";
import { useTheme } from "@/hooks/useTheme";

const loadClientDashboard = (): Promise<{ default: React.ComponentType<any> }> => {
  return import("@/components/dashboard/client/ClientDashboard").catch((error) => {
    console.error("Failed to load ClientDashboard, retrying...", error);
    return new Promise<{ default: React.ComponentType<any> }>((resolve, reject) => {
      setTimeout(() => {
        import("@/components/dashboard/client/ClientDashboard")
          .then(resolve)
          .catch(reject);
      }, 1000);
    });
  });
};

const loadArtistDashboard = (): Promise<{ default: React.ComponentType<any> }> => {
  return import("@/components/dashboard/artist/ArtistDashboard").catch((error) => {
    console.error("Failed to load ArtistDashboard, retrying...", error);
    return new Promise<{ default: React.ComponentType<any> }>((resolve, reject) => {
      setTimeout(() => {
        import("@/components/dashboard/artist/ArtistDashboard")
          .then(resolve)
          .catch(reject);
      }, 1000);
    });
  });
};

const ClientDashboard = lazy(loadClientDashboard);
const ArtistDashboard = lazy(loadArtistDashboard);

const LOAD_MS = 500;
const FADE_MS = 160;

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

function useDevOverride() {
  const isDev = import.meta.env.MODE !== "production";
  const search = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const q = (search?.get("as") || "").toLowerCase();
  const fromQuery = q === "client" || q === "artist" ? (q as "client" | "artist") : null;
  return { override: isDev ? fromQuery : null };
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

const Dashboard: React.FC = () => {
  useSyncOnAuth();
  const { role, isLoaded, isSignedIn } = useRole();
  const navigate = useNavigate();
  const warnedRef = useRef(false as boolean);
  const { override } = useDevOverride();
  const { theme } = useTheme();

  const [bootDone, setBootDone] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn && !warnedRef.current) {
      warnedRef.current = true;
      toast.error("You aren't logged in. Please log in.", { position: "top-center", theme: "dark" });
      navigate("/login", { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    setBootDone(false);
    setFadeIn(false);
    const t1 = window.setTimeout(() => {
      setBootDone(true);
      const t2 = window.setTimeout(() => setFadeIn(true), 0);
      return () => window.clearTimeout(t2);
    }, LOAD_MS);
    return () => window.clearTimeout(t1);
  }, [isLoaded, isSignedIn]);

  useLayoutEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = theme === "light" ? "#ffffff" : "#0b0b0b";
    return () => {
      document.body.style.backgroundColor = prev;
    };
  }, [theme]);

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

  const roleToUse = useMemo<"client" | "artist">(() => {
    if (override) return override;
    if (role === "artist" || role === "client") return role;
    return "client";
  }, [override, role]);

  const scopeRef = useRef<HTMLDivElement | null>(null);
  useDashboardScope(scopeRef.current, theme);

  const shellBg = theme === "light" ? "#ffffff" : "#0b0b0b";
  const shellFg = theme === "light" ? "#111111" : "#f5f5f5";

  return (
    <div
      ref={scopeRef}
      id="dashboard-scope"
      className="ink-scope min-h-dvh overflow-y-hidden flex flex-col"
      style={{ background: shellBg, color: shellFg }}
    >
      {!bootDone && <Loading theme={theme} />}
      <div
        className="flex-1 min-h-0 w-full"
        style={{ opacity: bootDone && fadeIn ? 1 : 0, transition: `opacity ${FADE_MS}ms linear` }}
      >
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4">
              <div 
                className="rounded-full border-4"
                style={{ 
                  width: "48px", 
                  height: "48px", 
                  borderColor: "color-mix(in oklab, var(--fg) 15%, transparent)",
                  borderTopColor: "var(--fg)",
                  animation: "spin 1s linear infinite"
                }} 
              />
              <div className="text-sm font-semibold" style={{ color: "var(--fg)" }}>
                Loading dashboard...
              </div>
            </div>
            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        }>
          {roleToUse === "artist" ? <ArtistDashboard /> : <ClientDashboard />}
        </Suspense>
      </div>
    </div>
  );
};

export default Dashboard;