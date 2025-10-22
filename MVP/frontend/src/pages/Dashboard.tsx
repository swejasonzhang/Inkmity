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
  const fromQuery = (search?.get("as") as "client" | "artist" | null) ?? null;
  const fromStorage = typeof window !== "undefined" ? localStorage.getItem("roleOverride") : null;
  const normalized = fromQuery ?? ((fromStorage === "client" || fromStorage === "artist") ? (fromStorage as "client" | "artist") : null);
  return { override: isDev ? normalized : null };
}

const Dashboard: React.FC = () => {
  useSyncOnAuth();
  const { role, isLoaded, isSignedIn } = useRole();
  const navigate = useNavigate();
  const warnedRef = useRef(false);
  const { override } = useDevOverride();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn && !warnedRef.current) {
      warnedRef.current = true;
      toast.error("You aren't logged in. Please log in.", { position: "top-center", theme: "dark" });
      navigate("/login", { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  const roleToUse = useMemo<"client" | "artist">(() => (override ?? role ?? "client"), [override, role]);

  if (!isLoaded || !isSignedIn) return <Loading />;

  if (!role && !override && !warnedRef.current) {
    warnedRef.current = true;
    toast.info("No role set — showing client dashboard by default.", { position: "bottom-right" });
  }

  return (
    <Suspense fallback={<Loading />}>
      {roleToUse === "artist" ? <ArtistDashboard /> : <ClientDashboard />}
    </Suspense>
  );
};

export default Dashboard;