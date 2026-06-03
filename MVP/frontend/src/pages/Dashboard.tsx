import React, { lazy, Suspense, useEffect, useMemo, useRef, useLayoutEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
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

const Dashboard: React.FC = () => {
  useSyncOnAuth();
  const { role, isLoaded, isSignedIn } = useRole();
  const navigate = useNavigate();
  const warnedRef = useRef(false as boolean);
  const { override } = useDevOverride();
  const { theme } = useTheme();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn && !warnedRef.current) {
      warnedRef.current = true;
      toast.error("You aren't logged in. Please log in.", { position: "top-center", theme: "dark" });
      navigate("/login", { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  useLayoutEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = theme === "light" ? "#ffffff" : "#0b0b0b";
    return () => {
      document.body.style.backgroundColor = prev;
    };
  }, [theme]);

  const roleToUse = useMemo<"client" | "artist">(() => {
    if (override) return override;
    if (role === "artist" || role === "client") return role;
    return "client";
  }, [override, role]);

  const scopeRef = useRef<HTMLDivElement | null>(null);

  const shellBg = theme === "light" ? "#ffffff" : "#0b0b0b";
  const shellFg = theme === "light" ? "#111111" : "#f5f5f5";

  return (
    <div
      ref={scopeRef}
      id="dashboard-scope"
      className="ink-scope h-dvh overflow-y-hidden flex flex-col"
      style={{ background: shellBg, color: shellFg }}
    >
      {!isLoaded && <Loading theme={theme} />}
      <div
        className="flex-1 min-h-0 w-full"
        style={{ opacity: isLoaded ? 1 : 0, transition: `opacity ${FADE_MS}ms linear` }}
      >
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center gap-4 h-full">
            <Spinner size={40} className="text-[color:var(--fg)]" />
            <div className="text-sm font-semibold" style={{ color: "var(--fg)" }}>
              Loading dashboard...
            </div>
          </div>
        }>
          {isLoaded ? (roleToUse === "artist" ? <ArtistDashboard /> : <ClientDashboard />) : null}
        </Suspense>
      </div>
    </div>
  );
};

export default Dashboard;