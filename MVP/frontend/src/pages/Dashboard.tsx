import React, { lazy, Suspense, useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useRole } from "@/hooks/useRole";
import { useSyncOnAuth } from "@/hooks/useSyncOnAuth";

const ClientDashboard = lazy(() => import("@/components/dashboard/client/ClientDashboard"));
const ArtistDashboard = lazy(() => import("@/components/dashboard/artist/ArtistDashboard"));

function readInitialTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  const KEY = "dashboard-theme";
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "dark";
  } catch { return "dark"; }
}

const LOAD_MS = 400;
const FADE_MS = 160;

const Loading: React.FC = () => {
  return (
    <div
      className="fixed inset-0 grid place-items-center"
      style={{ zIndex: 2147483640, background: "var(--bg)", color: "var(--fg)" }}
    >
      <style>{`
        @keyframes ink-fill { 0% { transform: scaleX(0); } 100% { transform: scaleX(1); } }
        @keyframes ink-pulse { 0%,100% { opacity:.4;} 50% {opacity:1;} }
      `}</style>
      <div className="flex flex-col items-center gap-4">
        <div className="w-56 h-2 rounded overflow-hidden" style={{ background: "color-mix(in oklab, var(--fg) 10%, transparent)" }}>
          <div className="h-full origin-left" style={{ background: "var(--fg)", transform: "scaleX(0)", animation: `ink-fill ${LOAD_MS}ms linear forwards` }} />
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
    const KEY = "dashboard-theme";
    const sync = () => {
      let t: "light" | "dark" = initialTheme;
      try {
        const v = localStorage.getItem(KEY);
        if (v === "light" || v === "dark") t = v;
      } catch { }
      applyTheme(scopeEl, t);
    };
    const onStorage = (e: StorageEvent) => { if (!e.key || e.key === KEY) sync(); };
    const onBus = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d?.key !== KEY) return;
      try { if (d.value === "light" || d.value === "dark") localStorage.setItem(KEY, d.value); } catch { }
      sync();
    };
    requestAnimationFrame(() => scopeEl.classList.remove("ink-no-anim"));
    window.addEventListener("storage", onStorage);
    window.addEventListener("ink:theme-change", onBus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("ink:theme-change", onBus);
    };
  }, [scopeEl, initialTheme]);
}

const Dashboard: React.FC = () => {
  useSyncOnAuth();
  const { role, isLoaded, isSignedIn } = useRole();
  const navigate = useNavigate();
  const warnedRef = useRef(false as boolean);
  const { override } = useDevOverride();
  const initialTheme = readInitialTheme();

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

  const roleToUse = useMemo<"client" | "artist">(() => {
    if (override) return override;
    if (role === "artist" || role === "client") return role;
    return "client";
  }, [override, role]);

  const scopeRef = useRef<HTMLDivElement | null>(null);
  useDashboardScope(scopeRef.current, initialTheme);

  return (
    <div
      ref={scopeRef}
      id="dashboard-scope"
      className="ink-scope min-h-dvh overflow-y-hidden flex flex-col"
      style={{ background: "var(--bg)", color: "var(--fg)" }}
    >
      {!bootDone && <Loading />}
      <div
        className="flex-1 min-h-0 w-full"
        style={{ opacity: bootDone && fadeIn ? 1 : 0, transition: `opacity ${FADE_MS}ms linear` }}
      >
        <Suspense fallback={null}>
          {roleToUse === "artist" ? <ArtistDashboard /> : <ClientDashboard />}
        </Suspense>
      </div>
    </div>
  );
};

export default Dashboard;