import React, { lazy, Suspense, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import CircularProgress from "@mui/material/CircularProgress";
import { useRole } from "@/hooks/useRole";
import { useSyncOnAuth } from "@/hooks/useSyncOnAuth";

const ClientDashboard = lazy(() => import("@/components/dashboard/client/ClientDashboard"));
const ArtistDashboard = lazy(() => import("@/components/dashboard/artist/ArtistDashboard"));

function readInitialTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  const LEGACY = "dashboard-theme";
  const NS = `${LEGACY}::`;
  const GUEST = `${NS}guest`;
  try {
    const a = window.localStorage.getItem(LEGACY);
    const b = window.localStorage.getItem(GUEST);
    const val = (a === "light" || a === "dark") ? a : (b === "light" || b === "dark") ? b : null;
    return val ?? "dark";
  } catch {
    return "dark";
  }
}

const Loading: React.FC = () => {
  const t = readInitialTheme();
  const bg = t === "light" ? "#ffffff" : "#0b0b0b";
  const fg = t === "light" ? "#111111" : "#f5f5f5";
  return (
    <div
      className="fixed inset-0 grid place-items-center"
      style={{
        background: bg,
        color: fg,
        transition: "none",
      }}
    >
      <CircularProgress sx={{ color: fg }} />
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

function useDashboardScope(scopeEl: HTMLElement | null) {
  useEffect(() => {
    if (!scopeEl) return;
    scopeEl.classList.add("ink-scope", "ink-no-anim");
    const KEY = "dashboard-theme";
    const apply = () => {
      let isLight = false;
      try { isLight = localStorage.getItem(KEY) === "light"; } catch { }
      scopeEl.classList.toggle("ink-light", isLight);
      scopeEl.setAttribute("data-ink", isLight ? "light" : "dark");
    };
    apply();
    requestAnimationFrame(() => {
      scopeEl.classList.remove("ink-no-anim");
    });
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key !== KEY) return;
      apply();
    };
    const onBus = (e: Event) => {
      if ((e as CustomEvent).detail?.key !== KEY) return;
      apply();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("ink:theme-change", onBus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("ink:theme-change", onBus);
    };
  }, [scopeEl]);
}

const Dashboard: React.FC = () => {
  useSyncOnAuth();
  const { role, isLoaded, isSignedIn } = useRole();
  const navigate = useNavigate();
  const warnedRef = useRef(false as boolean);
  const { override } = useDevOverride();

  const roleToUse = useMemo<"client" | "artist">(() => {
    if (override) return override;
    if (role === "artist" || role === "client") return role;
    return "client";
  }, [override, role]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn && !warnedRef.current) {
      warnedRef.current = true;
      toast.error("You aren't logged in. Please log in.", { position: "top-center", theme: "dark" });
      navigate("/login", { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  const scopeRef = useRef<HTMLDivElement | null>(null);
  useDashboardScope(scopeRef.current);

  if (!isLoaded || !isSignedIn) return <Loading />;

  return (
    <div
      ref={scopeRef}
      id="dashboard-scope"
      className="ink-scope min-h-dvh overflow-y-hidden flex flex-col"
    >
      <div className="flex-1 min-h-0 w-full">
        <Suspense fallback={<Loading />}>
          {roleToUse === "artist" ? <ArtistDashboard /> : <ClientDashboard />}
        </Suspense>
      </div>
    </div>
  );
};

export default Dashboard;