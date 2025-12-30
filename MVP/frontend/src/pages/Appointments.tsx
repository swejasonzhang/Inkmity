import { useEffect, useState, useLayoutEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useRole } from "@/hooks/useRole";
import { useTheme } from "@/hooks/useTheme";
import Header from "@/components/header/Header";
import { getAppointments, acceptAppointment, denyAppointment, Booking } from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AftercareInstructions from "@/components/dashboard/shared/AftercareInstructions";

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

function calculateDuration(start: string | Date, end: string | Date): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }
  return `${hours}h ${mins}m`;
}

function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
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
  const [bootDone, setBootDone] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [appointments, setAppointments] = useState<AppointmentWithUsers[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [aftercareModalOpen, setAftercareModalOpen] = useState(false);
  const [aftercareAppointment, setAftercareAppointment] = useState<AppointmentWithUsers | null>(null);

  useLayoutEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = theme === "light" ? "#ffffff" : "#0b0b0b";
    return () => {
      document.body.style.backgroundColor = prev;
    };
  }, [theme]);

  useEffect(() => {
    if (!roleLoaded) {
      setBootDone(false);
      setFadeIn(false);
      return;
    }
    
    setBootDone(false);
    setFadeIn(false);
    const t1 = window.setTimeout(() => {
      setBootDone(true);
      const t2 = window.setTimeout(() => setFadeIn(true), 0);
      return () => window.clearTimeout(t2);
    }, LOAD_MS);
    return () => window.clearTimeout(t1);
  }, [roleLoaded]);

  const isClient = role === "client";
  const isArtist = role === "artist";

  useEffect(() => {
    loadAppointments();
  }, [roleLoaded, user?.id]);

  useEffect(() => {
    if (appointments.length > 0 && isClient) {
      const completedTattooSession = appointments.find(
        (a) => a.status === "completed" && a.appointmentType === "tattoo_session"
      );
      if (completedTattooSession && !aftercareAppointment) {
        setAftercareAppointment(completedTattooSession);
        setAftercareModalOpen(true);
      }
    }
  }, [appointments, isClient]);

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
      toast.success(isClient ? "Appointment cancelled" : "Appointment denied");
      window.dispatchEvent(new CustomEvent(isClient ? "ink:booking-cancelled" : "ink:booking-denied"));
      await loadAppointments();
    } catch (error: any) {
      console.error("Error denying appointment:", error);
      toast.error(error?.body?.error || (isClient ? "Failed to cancel appointment" : "Failed to deny appointment"));
    } finally {
      setProcessing(null);
    }
  };

  const isLightTheme = theme === "light";

  const isClient = role === "client";
  const isArtist = role === "artist";

  const pendingAppointments = appointments
    .filter((a) => a.status === "pending")
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const pastAppointments = appointments
    .filter((a) => a.status !== "pending")
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

  const AppointmentCard = ({ appointment }: { appointment: AppointmentWithUsers }) => {
    const isPending = appointment.status === "pending";
    const isAccepted = appointment.status === "accepted";
    const isDenied = appointment.status === "denied";
    const isCompleted = appointment.status === "completed";
    const isConsultation = appointment.appointmentType === "consultation";
    const isTattooSession = appointment.appointmentType === "tattoo_session";
    
    const otherUser = isClient ? appointment.artist : appointment.client;
    const duration = calculateDuration(appointment.startAt, appointment.endAt);
    const canAccept = isArtist && isPending;
    const canCancel = isClient && isPending;
    const canDeny = isArtist && isPending;

    const getStatusBadgeStyle = (): React.CSSProperties => {
      return {
        background: isLightTheme 
          ? "#ffffff" 
          : "#000000",
        color: isLightTheme 
          ? "#000000"
          : "#ffffff",
        border: `1px solid ${isLightTheme ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.2)"}`
      };
    };

    return (
      <Card
        className="border rounded-xl p-6 bg-card border-app h-full flex flex-col"
        style={{
          borderColor: "var(--border)"
        }}
      >
        <CardHeader className="p-0 pb-4 flex-shrink-0">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-full flex items-center justify-between">
              <div className="flex-1"></div>
              <div 
                className="px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide"
                style={getStatusBadgeStyle()}
              >
                {appointment.status}
              </div>
              <div className="flex-1"></div>
            </div>
            
            <div className="w-full text-center">
              <CardTitle className="text-2xl font-bold mb-1 text-app">
                {otherUser?.username || "Unknown"}
              </CardTitle>
              <div className="text-base font-medium text-subtle">
                {isConsultation ? "Consultation" : "Appointment"}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 space-y-3 flex-1 flex flex-col items-center justify-center">
          <div className="text-center space-y-1.5 text-app w-full">
            <div className="text-lg font-semibold">
              {formatDate(appointment.startAt)}
            </div>
            <div className="text-base font-medium">
              {formatTime(appointment.startAt)} – {formatTime(appointment.endAt)}
            </div>
            <div className="text-sm text-muted">
              Duration: {formatDuration(duration)}
            </div>
          </div>

          <div 
            className="border-t pt-3 space-y-2"
            style={{ borderColor: "var(--border)" }}
          >
            {isTattooSession && appointment.priceCents !== undefined && appointment.priceCents > 0 && (
              <div className="text-center space-y-1 text-app">
                <div className="text-sm font-medium">
                  Total Price: {formatCurrency(appointment.priceCents)}
                </div>
                {appointment.depositRequiredCents !== undefined && appointment.depositRequiredCents > 0 && (
                  <div className="text-xs text-muted">
                    Deposit Required: {formatCurrency(appointment.depositRequiredCents)}
                    {appointment.depositPaidCents !== undefined && appointment.depositPaidCents > 0 && (
                      <span className="ml-2">
                        (Paid: {formatCurrency(appointment.depositPaidCents)})
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {isConsultation && (
              <div 
                className="text-center text-sm font-medium"
                style={{
                  color: isLightTheme 
                    ? "#000000"
                    : "#ffffff",
                  backgroundColor: isLightTheme 
                    ? "#ffffff"
                    : "#000000",
                  border: `1px solid ${isLightTheme ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.2)"}`,
                  padding: "0.5rem",
                  borderRadius: "0.5rem"
                }}
              >
                ✓ No charge for consultations
              </div>
            )}

            {appointment.note && (
              <div className="text-center text-sm text-muted">
                <div className="font-medium mb-1">Note:</div>
                <div className="italic">{appointment.note}</div>
              </div>
            )}

            {appointment.sessionNumber && isTattooSession && (
              <div className="text-center text-sm text-muted">
                Session #{appointment.sessionNumber}
              </div>
            )}

            {appointment.createdAt && (
              <div className="text-center text-xs text-muted">
                Requested: {formatDateTime(appointment.createdAt)}
              </div>
            )}

            {isAccepted && appointment.confirmedAt && (
              <div className="text-center text-xs text-muted">
                Confirmed: {formatDateTime(appointment.confirmedAt)}
              </div>
            )}

            {isDenied && appointment.cancelledAt && (
              <div className="text-center text-xs text-muted">
                {appointment.cancelledBy === "client" ? "Cancelled" : "Denied"}: {formatDateTime(appointment.cancelledAt)}
                {appointment.cancellationReason && (
                  <div className="mt-1 italic">
                    Reason: {appointment.cancellationReason}
                  </div>
                )}
              </div>
            )}
          </div>

          {isCompleted && isTattooSession && (
            <div className="mt-4">
              <Button
                onClick={() => {
                  setAftercareAppointment(appointment);
                  setAftercareModalOpen(true);
                }}
                variant="outline"
                className="w-full"
                style={{ borderColor: "var(--border)", color: "var(--fg)" }}
              >
                View Aftercare Instructions
              </Button>
            </div>
          )}

          {(canAccept || canDeny || canCancel) && (
            <div className="flex gap-3 pt-4">
              {canAccept && (
                <Button
                  onClick={() => handleAccept(appointment._id)}
                  disabled={processing === appointment._id}
                  className="flex-1 h-11 text-base font-semibold"
                  style={{
                    background: "var(--fg)",
                    color: "var(--card)",
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
                  className="flex-1 h-11 text-base font-semibold"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--fg)",
                  }}
                >
                  {processing === appointment._id ? "Processing..." : "Deny"}
                </Button>
              )}
              {canCancel && (
                <Button
                  onClick={() => handleDeny(appointment._id)}
                  disabled={processing === appointment._id}
                  variant="outline"
                  className="flex-1 h-11 text-base font-semibold"
                  style={{
                    borderColor: isLightTheme 
                      ? "rgba(0, 0, 0, 0.2)"
                      : "rgba(255, 255, 255, 0.2)",
                    color: isLightTheme 
                      ? "#000000"
                      : "#ffffff",
                    backgroundColor: isLightTheme 
                      ? "#ffffff" 
                      : "#000000",
                  }}
                >
                  {processing === appointment._id ? "Processing..." : "Cancel"}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div
      className="min-h-screen flex flex-col bg-app text-app"
    >
      {!bootDone && <Loading theme={theme} />}
      <div
        className="flex-1 min-h-0 w-full"
        style={{ opacity: bootDone && fadeIn ? 1 : 0, transition: `opacity ${FADE_MS}ms linear` }}
      >
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-3 text-app">
            Appointments
          </h1>
          <p className="text-base text-muted">
            Manage your consultation and tattoo session requests
          </p>
        </div>

        {loading ? (
          <div className="fixed inset-0 grid place-items-center" style={{ zIndex: 2147483639 }}>
            <Loading theme={theme} />
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-12 text-muted">
            No appointments found
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="text-center w-full">
              <h2 className="text-2xl font-bold mb-6 text-app">
                Pending ({pendingAppointments.length})
              </h2>
              {pendingAppointments.length === 0 ? (
                <div className="text-center py-10 text-muted min-h-[200px]">
                  No pending appointments
                </div>
              ) : (
                <div className="grid gap-6 max-w-2xl mx-auto w-full">
                  {pendingAppointments.map((appointment) => (
                    <AppointmentCard key={appointment._id} appointment={appointment} />
                  ))}
                </div>
              )}
            </div>

            <div className="text-center w-full">
              <h2 className="text-2xl font-bold mb-6 text-app">
                Past ({pastAppointments.length})
              </h2>
              {pastAppointments.length === 0 ? (
                <div className="text-center py-10 text-muted min-h-[200px]">
                  No past appointments
                </div>
              ) : (
                <div className="grid gap-6 max-w-2xl mx-auto w-full">
                  {pastAppointments.map((appointment) => (
                    <AppointmentCard key={appointment._id} appointment={appointment} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </div>

      {aftercareAppointment && (
        <AftercareInstructions
          open={aftercareModalOpen}
          onClose={() => {
            setAftercareModalOpen(false);
            setAftercareAppointment(null);
          }}
          appointmentDate={aftercareAppointment.startAt}
        />
      )}

      <ToastContainer
        position="top-center"
        newestOnTop
        closeOnClick
        draggable
        pauseOnHover
        hideProgressBar
        toastStyle={{
          background: "var(--card)",
          color: "var(--fg)",
          border: "1px solid var(--border)",
          boxShadow: "0 10px 25px color-mix(in oklab, var(--fg) 8%, transparent)"
        }}
        className="text-sm"
        style={{ zIndex: 2147483647 }}
      />
    </div>
  );
}

