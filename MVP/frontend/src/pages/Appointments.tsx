import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useRole } from "@/hooks/useRole";
import { useTheme } from "@/hooks/useTheme";
import Header from "@/components/header/Header";
import { getAppointments, acceptAppointment, denyAppointment, Booking } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString([], { 
    weekday: "short", 
    month: "short", 
    day: "numeric", 
    year: "numeric" 
  });
}

function formatTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString([], { 
    hour: "2-digit", 
    minute: "2-digit" 
  });
}

type AppointmentWithUsers = Booking & {
  client?: { username: string; avatar?: any } | null;
  artist?: { username: string; avatar?: any } | null;
};

export default function Appointments() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { role, isLoaded: roleLoaded } = useRole();
  const { theme } = useTheme();
  const scopeRef = useRef<HTMLDivElement | null>(null);
  const [fadeIn, setFadeIn] = useState(false);
  const [appointments, setAppointments] = useState<AppointmentWithUsers[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useLayoutEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = theme === "light" ? "#ffffff" : "#0b0b0b";
    return () => {
      document.body.style.backgroundColor = prev;
    };
  }, [theme]);

  useEffect(() => {
    if (!roleLoaded) {
      setFadeIn(false);
      return;
    }
    
    setFadeIn(false);
    const timer = setTimeout(() => {
      setFadeIn(true);
    }, 50);
    
    return () => clearTimeout(timer);
  }, [roleLoaded]);

  useEffect(() => {
    loadAppointments();
  }, [roleLoaded, user?.id]);

  const loadAppointments = async () => {
    if (!roleLoaded || !user?.id) return;
    setLoading(true);
    try {
      const token = await getToken();
      const data = await getAppointments(undefined, token ?? undefined);
      setAppointments(data || []);
    } catch (error: any) {
      console.error("Error loading appointments:", error);
      toast.error("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id: string) => {
    if (processing) return;
    setProcessing(id);
    try {
      const token = await getToken();
      await acceptAppointment(id, token ?? undefined);
      toast.success("Appointment accepted");
      await loadAppointments();
    } catch (error: any) {
      console.error("Error accepting appointment:", error);
      toast.error(error?.body?.error || "Failed to accept appointment");
    } finally {
      setProcessing(null);
    }
  };

  const handleDeny = async (id: string, reason?: string) => {
    if (processing) return;
    setProcessing(id);
    try {
      const token = await getToken();
      await denyAppointment(id, reason, token ?? undefined);
      toast.success("Appointment denied");
      await loadAppointments();
    } catch (error: any) {
      console.error("Error denying appointment:", error);
      toast.error(error?.body?.error || "Failed to deny appointment");
    } finally {
      setProcessing(null);
    }
  };

  useDashboardScope(scopeRef.current, theme);
  const isLightTheme = theme === "light";

  const isClient = role === "client";
  const isArtist = role === "artist";

  const pendingAppointments = appointments.filter(a => a.status === "pending");
  const acceptedAppointments = appointments.filter(a => a.status === "accepted");
  const deniedAppointments = appointments.filter(a => a.status === "denied");
  const otherAppointments = appointments.filter(
    a => !["pending", "accepted", "denied"].includes(a.status)
  );

  const AppointmentCard = ({ appointment }: { appointment: AppointmentWithUsers }) => {
    const isPending = appointment.status === "pending";
    const isAccepted = appointment.status === "accepted";
    const isDenied = appointment.status === "denied";
    const isConsultation = appointment.appointmentType === "consultation";
    const isTattooSession = appointment.appointmentType === "tattoo_session";
    
    const otherUser = isClient ? appointment.artist : appointment.client;
    const isMyRequest = isClient;
    const canAccept = isArtist && isPending;
    const canDeny = isPending && (isArtist || isClient);

    return (
      <Card
        className={`border rounded-xl p-4 ${
          isLightTheme 
            ? "bg-white border-black/20" 
            : "bg-card border-white/20"
        }`}
      >
        <CardHeader className="p-0 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className={`text-lg font-semibold ${
                isLightTheme ? "text-black" : "text-app"
              }`}>
                {otherUser?.username || "Unknown"}
              </CardTitle>
              <div className={`text-sm mt-1 ${
                isLightTheme ? "text-black/70" : "text-app/70"
              }`}>
                {isConsultation ? "Consultation" : "Tattoo Session"}
              </div>
            </div>
            <div className={`px-2 py-1 rounded-md text-xs font-medium ${
              isPending 
                ? isLightTheme 
                  ? "bg-yellow-100 text-yellow-800" 
                  : "bg-yellow-900/30 text-yellow-400"
                : isAccepted
                ? isLightTheme
                  ? "bg-green-100 text-green-800"
                  : "bg-green-900/30 text-green-400"
                : isDenied
                ? isLightTheme
                  ? "bg-red-100 text-red-800"
                  : "bg-red-900/30 text-red-400"
                : isLightTheme
                ? "bg-gray-100 text-gray-800"
                : "bg-gray-900/30 text-gray-400"
            }`}>
              {appointment.status}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 pt-3 space-y-2">
          <div className={`text-sm ${isLightTheme ? "text-black/80" : "text-app/80"}`}>
            <div className="font-medium">
              {formatDate(appointment.startAt)}
            </div>
            <div>
              {formatTime(appointment.startAt)} – {formatTime(appointment.endAt)}
            </div>
          </div>
          
          {appointment.note && (
            <div className={`text-sm ${isLightTheme ? "text-black/60" : "text-app/60"}`}>
              <span className="font-medium">Note: </span>
              {appointment.note}
            </div>
          )}

          {isTattooSession && appointment.priceCents > 0 && (
            <div className={`text-sm font-medium ${
              isLightTheme ? "text-black" : "text-app"
            }`}>
              Price: {formatCurrency(appointment.priceCents)}
              {appointment.depositRequiredCents > 0 && (
                <span className={`ml-2 ${isLightTheme ? "text-black/70" : "text-app/70"}`}>
                  (Deposit: {formatCurrency(appointment.depositRequiredCents)})
                </span>
              )}
            </div>
          )}

          {isConsultation && (
            <div className={`text-sm ${isLightTheme ? "text-black/70" : "text-app/70"}`}>
              No charge for consultations
            </div>
          )}

          {(canAccept || canDeny) && (
            <div className="flex gap-2 pt-2">
              {canAccept && (
                <Button
                  onClick={() => handleAccept(appointment._id)}
                  disabled={processing === appointment._id}
                  className="flex-1"
                  style={{
                    background: isLightTheme ? "#000000" : "var(--fg)",
                    color: isLightTheme ? "#ffffff" : "var(--card)",
                  }}
                >
                  {processing === appointment._id ? "Processing..." : "Accept"}
                </Button>
              )}
              {canDeny && (
                <Button
                  onClick={() => handleDeny(appointment._id)}
                  disabled={processing === appointment._id}
                  variant="outline"
                  className="flex-1"
                  style={{
                    borderColor: isLightTheme ? "rgba(0,0,0,0.35)" : "var(--border)",
                    color: isLightTheme ? "#000" : "var(--fg)",
                  }}
                >
                  {processing === appointment._id ? "Processing..." : "Deny"}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (!roleLoaded) {
    return (
      <div
        className="fixed inset-0 grid place-items-center"
        style={{
          zIndex: 2147483640,
          background: theme === "light" ? "#ffffff" : "#0b0b0b",
          color: theme === "light" ? "#111111" : "#f5f5f5",
        }}
      >
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div
      ref={scopeRef}
      className={`min-h-screen transition-opacity duration-300 ${
        fadeIn ? "opacity-100" : "opacity-0"
      }`}
      style={{
        background: theme === "light" ? "#ffffff" : "#0b0b0b",
        color: theme === "light" ? "#111111" : "#f5f5f5",
      }}
    >
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className={`text-3xl font-bold mb-2 ${
            isLightTheme ? "text-black" : "text-app"
          }`}>
            Appointments
          </h1>
          <p className={`text-sm ${
            isLightTheme ? "text-black/70" : "text-app/70"
          }`}>
            Manage your consultation and tattoo session requests
          </p>
        </div>

        {loading ? (
          <div className={`text-center py-12 ${
            isLightTheme ? "text-black/60" : "text-app/60"
          }`}>
            Loading appointments...
          </div>
        ) : appointments.length === 0 ? (
          <div className={`text-center py-12 ${
            isLightTheme ? "text-black/60" : "text-app/60"
          }`}>
            No appointments found
          </div>
        ) : (
          <div className="space-y-6">
            {pendingAppointments.length > 0 && (
              <div>
                <h2 className={`text-xl font-semibold mb-4 ${
                  isLightTheme ? "text-black" : "text-app"
                }`}>
                  Pending ({pendingAppointments.length})
                </h2>
                <div className="grid gap-4">
                  {pendingAppointments.map((appointment) => (
                    <AppointmentCard key={appointment._id} appointment={appointment} />
                  ))}
                </div>
              </div>
            )}

            {acceptedAppointments.length > 0 && (
              <div>
                <h2 className={`text-xl font-semibold mb-4 ${
                  isLightTheme ? "text-black" : "text-app"
                }`}>
                  Accepted ({acceptedAppointments.length})
                </h2>
                <div className="grid gap-4">
                  {acceptedAppointments.map((appointment) => (
                    <AppointmentCard key={appointment._id} appointment={appointment} />
                  ))}
                </div>
              </div>
            )}

            {deniedAppointments.length > 0 && (
              <div>
                <h2 className={`text-xl font-semibold mb-4 ${
                  isLightTheme ? "text-black" : "text-app"
                }`}>
                  Denied ({deniedAppointments.length})
                </h2>
                <div className="grid gap-4">
                  {deniedAppointments.map((appointment) => (
                    <AppointmentCard key={appointment._id} appointment={appointment} />
                  ))}
                </div>
              </div>
            )}

            {otherAppointments.length > 0 && (
              <div>
                <h2 className={`text-xl font-semibold mb-4 ${
                  isLightTheme ? "text-black" : "text-app"
                }`}>
                  Other ({otherAppointments.length})
                </h2>
                <div className="grid gap-4">
                  {otherAppointments.map((appointment) => (
                    <AppointmentCard key={appointment._id} appointment={appointment} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ToastContainer
        position="top-center"
        newestOnTop
        closeOnClick
        draggable
        pauseOnHover
        hideProgressBar
        toastStyle={{
          background: isLightTheme ? "#ffffff" : "var(--card)",
          color: isLightTheme ? "#000000" : "var(--fg)",
          border: `1px solid ${isLightTheme ? "rgba(0,0,0,0.18)" : "var(--border)"}`,
          boxShadow: "0 10px 25px color-mix(in oklab, var(--fg) 8%, transparent)"
        }}
        className="text-sm"
        style={{ zIndex: 2147483647 }}
      />
    </div>
  );
}

