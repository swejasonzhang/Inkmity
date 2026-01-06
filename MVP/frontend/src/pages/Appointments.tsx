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
import { Calendar, Clock, DollarSign, FileText, Image, RefreshCw, CheckCircle, XCircle, AlertCircle, Hash } from "lucide-react";

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
    const hasRescheduled = appointment.rescheduledAt && appointment.rescheduledFrom;
    const hasReferenceImages = appointment.referenceImageIds && appointment.referenceImageIds.length > 0;
    const remainingBalance = appointment.priceCents && appointment.depositPaidCents 
      ? appointment.priceCents - appointment.depositPaidCents 
      : undefined;

    const getStatusBadgeStyle = (): React.CSSProperties => {
      const statusColors: Record<string, { bg: string; text: string; border: string }> = {
        pending: {
          bg: "color-mix(in oklab, var(--fg) 15%, transparent)",
          text: "color-mix(in oklab, var(--fg) 85%, transparent)",
          border: "color-mix(in oklab, var(--border) 80%, transparent)"
        },
        accepted: {
          bg: "color-mix(in oklab, var(--fg) 15%, transparent)",
          text: "color-mix(in oklab, var(--fg) 90%, transparent)",
          border: "color-mix(in oklab, var(--border) 80%, transparent)"
        },
        confirmed: {
          bg: "color-mix(in oklab, var(--fg) 15%, transparent)",
          text: "color-mix(in oklab, var(--fg) 90%, transparent)",
          border: "color-mix(in oklab, var(--border) 80%, transparent)"
        },
        completed: {
          bg: "color-mix(in oklab, var(--fg) 12%, transparent)",
          text: "color-mix(in oklab, var(--fg) 85%, transparent)",
          border: "color-mix(in oklab, var(--border) 75%, transparent)"
        },
        denied: {
          bg: "color-mix(in oklab, var(--fg) 12%, transparent)",
          text: "color-mix(in oklab, var(--fg) 80%, transparent)",
          border: "color-mix(in oklab, var(--border) 70%, transparent)"
        },
        cancelled: {
          bg: "color-mix(in oklab, var(--fg) 12%, transparent)",
          text: "color-mix(in oklab, var(--fg) 80%, transparent)",
          border: "color-mix(in oklab, var(--border) 70%, transparent)"
        },
        "no-show": {
          bg: "color-mix(in oklab, var(--fg) 12%, transparent)",
          text: "color-mix(in oklab, var(--fg) 75%, transparent)",
          border: "color-mix(in oklab, var(--border) 70%, transparent)"
        }
      };

      const colors = statusColors[appointment.status] || {
        bg: "var(--elevated)",
        text: "var(--fg)",
        border: "var(--border)"
      };

      return {
        background: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`
      };
    };

    const DetailRow = ({ icon: Icon, label, value, className = "" }: { icon: any; label: string; value: string | React.ReactNode; className?: string }) => (
      <div className={`flex items-start gap-2 py-1.5 px-1.5 rounded-md transition-colors hover:bg-[color-mix(in_oklab,var(--elevated)_50%,transparent)] ${className}`}>
        <Icon className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: "color-mix(in oklab, var(--fg) 50%, transparent)" }} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold mb-0.5 uppercase tracking-wide" style={{ color: "color-mix(in oklab, var(--fg) 65%, transparent)", letterSpacing: "0.05em" }}>
            {label}
          </div>
          <div className="text-xs leading-relaxed" style={{ color: "var(--fg)" }}>
            {value}
          </div>
        </div>
      </div>
    );

    return (
      <Card
        className="border rounded-xl p-4 bg-card border-app h-full flex flex-col transition-all duration-200 hover:shadow-lg"
        style={{
          borderColor: "var(--border)",
          boxShadow: `0 1px 3px color-mix(in oklab, var(--fg) 8%, transparent), 0 1px 2px color-mix(in oklab, var(--fg) 5%, transparent)`,
          background: "var(--card)"
        }}
      >
        <CardHeader className="p-0 pb-3 flex-shrink-0">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-full flex items-center justify-between">
              <div className="flex-1"></div>
              <div 
                className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide transition-all"
                style={getStatusBadgeStyle()}
              >
                {appointment.status.replace("-", " ")}
              </div>
              <div className="flex-1"></div>
            </div>
            
            <div className="w-full text-center">
              <CardTitle className="text-xl font-bold mb-1 text-app">
                {otherUser?.username || "Unknown"}
              </CardTitle>
              <div className="text-xs font-medium px-2 py-0.5 rounded-md inline-block mb-1" style={{ 
                color: "color-mix(in oklab, var(--fg) 75%, transparent)",
                background: "var(--elevated)"
              }}>
                {isConsultation ? "Consultation" : isTattooSession ? "Tattoo Session" : "Appointment"}
              </div>
              {appointment.createdAt && (
                <div className="text-xs" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                  Requested: {formatDateTime(appointment.createdAt)}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 space-y-2 flex-1">
          <div 
            className="border-t pt-3 grid grid-cols-2 gap-x-2 gap-y-0.5"
            style={{ borderColor: "color-mix(in oklab, var(--border) 50%, transparent)" }}
          >
            <DetailRow 
              icon={Calendar} 
              label="Date" 
              value={formatDate(appointment.startAt)} 
            />
            <DetailRow 
              icon={Clock} 
              label="Time" 
              value={`${formatTime(appointment.startAt)} – ${formatTime(appointment.endAt)}`} 
            />
            <DetailRow 
              icon={Clock} 
              label="Duration" 
              value={formatDuration(duration)} 
            />

            {isTattooSession && appointment.sessionNumber && (
              <DetailRow 
                icon={Hash} 
                label="Session Number" 
                value={`#${appointment.sessionNumber}`} 
              />
            )}

            {isTattooSession && appointment.priceCents !== undefined && appointment.priceCents > 0 && (
              <>
                <DetailRow 
                  icon={DollarSign} 
                  label="Total Price" 
                  value={formatCurrency(appointment.priceCents)} 
                />
                {appointment.depositRequiredCents !== undefined && appointment.depositRequiredCents > 0 && (
                  <DetailRow 
                    icon={DollarSign} 
                    label="Deposit" 
                    value={
                      <div className="space-y-0.5">
                        <div>Required: {formatCurrency(appointment.depositRequiredCents)}</div>
                    {appointment.depositPaidCents !== undefined && appointment.depositPaidCents > 0 && (
                          <div className="text-xs" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
                            Paid: {formatCurrency(appointment.depositPaidCents)}
                            {remainingBalance !== undefined && remainingBalance > 0 && (
                              <span className="ml-1.5">
                                • Remaining: {formatCurrency(remainingBalance)}
                      </span>
                    )}
                  </div>
                )}
              </div>
                    } 
                  />
                )}
              </>
            )}

            {isConsultation && (
              <DetailRow 
                icon={CheckCircle} 
                label="Fee" 
                value="No charge for consultations" 
              />
            )}

            {hasReferenceImages && (
              <DetailRow 
                icon={Image} 
                label="Reference Images" 
                value={`${appointment.referenceImageIds?.length || 0} image${(appointment.referenceImageIds?.length || 0) !== 1 ? 's' : ''} attached`} 
              />
            )}

            {appointment.projectId && (
              <DetailRow 
                icon={FileText} 
                label="Project" 
                value={`Project ID: ${appointment.projectId}`} 
              />
            )}

            {isAccepted && appointment.confirmedAt && (
              <DetailRow 
                icon={CheckCircle} 
                label="Confirmed" 
                value={formatDateTime(appointment.confirmedAt)} 
              />
            )}

            {isCompleted && (
              <DetailRow 
                icon={CheckCircle} 
                label="Completed" 
                value={formatDateTime(appointment.endAt)} 
              />
            )}

            {appointment.note && (
              <DetailRow 
                icon={FileText} 
                label="Note" 
                value={<span className="italic">{appointment.note}</span>} 
                className="col-span-2"
              />
            )}

            {hasRescheduled && (
              <DetailRow 
                icon={RefreshCw} 
                label="Rescheduled" 
                value={
                  <div className="space-y-0.5">
                    <div>From: {formatDateTime(appointment.rescheduledFrom!)}</div>
                    <div className="text-xs" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
                      By: {appointment.rescheduledBy === "client" ? "Client" : "Artist"}
                    </div>
              </div>
                }
                className="col-span-2"
              />
            )}

            {isDenied && appointment.cancelledAt && (
              <DetailRow 
                icon={XCircle} 
                label={appointment.cancelledBy === "client" ? "Cancelled" : "Denied"} 
                value={
                  <div className="space-y-0.5">
                    <div>{formatDateTime(appointment.cancelledAt)}</div>
                {appointment.cancellationReason && (
                      <div className="text-xs italic" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
                    Reason: {appointment.cancellationReason}
                  </div>
                )}
              </div>
                }
                className="col-span-2"
              />
            )}

            {appointment.status === "no-show" && appointment.noShowMarkedAt && (
              <DetailRow 
                icon={AlertCircle} 
                label="No-Show" 
                value={
                  <div className="space-y-0.5">
                    <div>Marked: {formatDateTime(appointment.noShowMarkedAt)}</div>
                    {appointment.noShowMarkedBy && (
                      <div className="text-xs" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
                        By: {appointment.noShowMarkedBy === "client" ? "Client" : appointment.noShowMarkedBy === "artist" ? "Artist" : "System"}
                      </div>
                    )}
                  </div>
                }
                className="col-span-2"
              />
            )}
          </div>

          {isCompleted && isTattooSession && (
            <div className="pt-2 border-t" style={{ borderColor: "color-mix(in oklab, var(--border) 50%, transparent)" }}>
              <Button
                onClick={() => {
                  setAftercareAppointment(appointment);
                  setAftercareModalOpen(true);
                }}
                variant="outline"
                className="w-full h-9 text-sm font-medium transition-all hover:scale-[1.02]"
                style={{ 
                  borderColor: "var(--border)", 
                  color: "var(--fg)",
                  background: "var(--card)"
                }}
              >
                View Aftercare Instructions
              </Button>
            </div>
          )}

          {(canAccept || canDeny || canCancel) && (
            <div className="flex gap-2 pt-2 border-t" style={{ borderColor: "color-mix(in oklab, var(--border) 50%, transparent)" }}>
              {canAccept && (
                <Button
                  onClick={() => handleAccept(appointment._id)}
                  disabled={processing === appointment._id}
                  className="flex-1 h-9 text-sm font-semibold transition-all hover:scale-[1.02] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="flex-1 h-9 text-sm font-semibold transition-all hover:scale-[1.02] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    borderColor: "color-mix(in oklab, var(--fg) 50%, transparent)",
                    color: "color-mix(in oklab, var(--fg) 80%, transparent)",
                    background: "transparent",
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
                  className="flex-1 h-9 text-sm font-semibold transition-all hover:scale-[1.02] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--fg)",
                    background: "transparent",
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
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold mb-2 text-app">
            Appointments
          </h1>
          <p className="text-sm" style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }}>
            Manage your consultation and tattoo session requests
          </p>
        </div>

        {loading ? (
          <div className="fixed inset-0 grid place-items-center" style={{ zIndex: 2147483639 }}>
            <Loading theme={theme} />
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-8 text-muted">
            No appointments found
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="text-center w-full">
              <div className="flex items-center justify-center gap-2 mb-4">
                <h2 className="text-xl font-bold text-app">
                  Pending
                </h2>
                <span 
                  className="px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{
                    background: "var(--elevated)",
                    color: "color-mix(in oklab, var(--fg) 75%, transparent)"
                  }}
                >
                  {pendingAppointments.length}
                </span>
              </div>
              {pendingAppointments.length === 0 ? (
                <div className="text-center py-6 min-h-[150px] rounded-lg border border-dashed" style={{ 
                  color: "color-mix(in oklab, var(--fg) 50%, transparent)",
                  borderColor: "color-mix(in oklab, var(--border) 50%, transparent)"
                }}>
                  No pending appointments
                </div>
              ) : (
                <div className="grid gap-4 max-w-2xl mx-auto w-full">
                  {pendingAppointments.map((appointment) => (
                    <AppointmentCard key={appointment._id} appointment={appointment} />
                  ))}
                </div>
              )}
            </div>

            <div className="text-center w-full">
              <div className="flex items-center justify-center gap-2 mb-4">
                <h2 className="text-xl font-bold text-app">
                  Past
                </h2>
                <span 
                  className="px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{
                    background: isLightTheme ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.1)",
                    color: "color-mix(in oklab, var(--fg) 70%, transparent)"
                  }}
                >
                  {pastAppointments.length}
                </span>
              </div>
              {pastAppointments.length === 0 ? (
                <div className="text-center py-6 min-h-[150px] rounded-lg border border-dashed" style={{ 
                  color: "color-mix(in oklab, var(--fg) 50%, transparent)",
                  borderColor: "color-mix(in oklab, var(--border) 50%, transparent)"
                }}>
                  No past appointments
                </div>
              ) : (
                <div className="grid gap-4 max-w-2xl mx-auto w-full">
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

