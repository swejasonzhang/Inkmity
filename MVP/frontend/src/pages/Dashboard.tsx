import { lazy, Suspense, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import CircularProgress from "@mui/material/CircularProgress";
import { useRole } from "@/hooks/useRole";
import { useSyncOnAuth } from "@/hooks/useSyncOnAuth";

const ClientDashboard = lazy(() => import("@/components/dashboard/client/ClientDashboard"));
const ArtistDashboard = lazy(() => import("@/components/dashboard/artist/ArtistDashboard"));

const Loading = () => (
  <div className="fixed inset-0 grid place-items-center bg-app text-app">
    <CircularProgress sx={{ color: "var(--fg)" }} />
  </div>
);

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
  const warnedRef = useRef(false);
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

  if (!isLoaded || !isSignedIn) return <Loading />;

  return (
    <Suspense fallback={<Loading />}>
      {roleToUse === "artist" ? <ArtistDashboard /> : <ClientDashboard />}
    </Suspense>
  );
};

export default Dashboard;