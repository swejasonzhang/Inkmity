import React, { lazy, Suspense, useEffect, useMemo, useRef, useLayoutEffect } from "react";
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
      <div className="flex-1 min-h-0 w-full">
        <Suspense fallback={null}>
          {isLoaded ? (roleToUse === "artist" ? <ArtistDashboard /> : <ClientDashboard />) : null}
        </Suspense>
      </div>
    </div>
  );
};

export default Dashboard;