import { lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import CircularProgress from "@mui/material/CircularProgress";
import { useRole } from "@/hooks/useRole";
import { useUser } from "@clerk/clerk-react";

const ClientDashboard = lazy(() => import("@/components/dashboard/client/ClientDashboard"));
const ArtistDashboard = lazy(() => import("@/components/dashboard/artist/ArtistDashboard"));

const Loading = () => (
  <div className="fixed inset-0 grid place-items-center bg-app text-app">
    <CircularProgress sx={{ color: "var(--fg)" }} />
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { isSignedIn } = useUser();
  const { role, isLoaded } = useRole();

  if (!isSignedIn) {
    navigate("/login", { replace: true });
    return null;
  }
  if (!isLoaded) return <Loading />;

  return (
    <Suspense fallback={<Loading />}>
      {role === "artist" ? <ArtistDashboard /> : <ClientDashboard />}
    </Suspense>
  );
}
