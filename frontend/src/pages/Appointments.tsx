import { useEffect, useState, useLayoutEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useRole } from "@/hooks/useRole";
import { useTheme } from "@/hooks/useTheme";
import { useScrollLock } from "@/hooks/useScrollLock";
import Header from "@/components/header/Header";
import { getAppointments, acceptAppointment, denyAppointment, setBookingFinalPrice, startBookingVerification, verifyBookingCompletion, Booking } from "@/api";
import { useBookingRealtime } from "@/hooks/useBookingRealtime";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AftercareInstructions from "@/components/dashboard/shared/AftercareInstructions";
import LazyReveal from "@/components/ui/LazyReveal";
import ArtistWaitlist from "@/components/dashboard/artist/ArtistWaitlist";
import SketchPanel from "@/components/dashboard/shared/SketchPanel";
import PaymentBreakdown from "@/components/dashboard/client/PaymentBreakdown";
import { Calendar, Clock, DollarSign, FileText, Image, RefreshCw, CheckCircle, XCircle, AlertCircle, Hash } from "lucide-react";

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

const AFTERCARE_DISMISS_KEY = "ink:aftercare-dismissed";
function getDismissedAftercare(): string[] {
  try { return JSON.parse(localStorage.getItem(AFTERCARE_DISMISS_KEY) || "[]"); } catch { return []; }
}
function markAftercareDismissed(id: string) {
  try {
    const arr = getDismissedAftercare();
    if (!arr.includes(id)) localStorage.setItem(AFTERCARE_DISMISS_KEY, JSON.stringify([...arr, id]));
  } catch { }
}

export default function Appointments() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { role, isLoaded: roleLoaded } = useRole();
  const { theme } = useTheme();
  const [appointments, setAppointments] = useState<AppointmentWithUsers[]>([]);
  const [view, setView] = useState<"pending" | "past">("pending");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [priceEditId, setPriceEditId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [aftercareModalOpen, setAftercareModalOpen] = useState(false);
  const [aftercareAppointment, setAftercareAppointment] = useState<AppointmentWithUsers | null>(null);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  useScrollLock(cancelTarget !== null);

  useLayoutEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = theme === "light" ? "#ffffff" : "#0b0b0b";
    return () => {
      document.body.style.backgroundColor = prev;
    };
  }, [theme]);

  const isClient = role === "client";
  const isArtist = role === "artist";

  useEffect(() => {
    loadAppointments();
  }, [roleLoaded, user?.id]);


  const loadAppointments = async (silent = false) => {
    if (!roleLoaded || !user?.id) return;
    if (!silent) setLoading(true);
    try {
      const token = await getToken();
      const data = await getAppointments(undefined, token ?? undefined);
      setAppointments(data || []);
    } catch (error: any) {
      console.error("Error loading appointments:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useBookingRealtime(() => loadAppointments(true));

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

  const handleSetPrice = async (id: string, dollars: string) => {
    if (processing) return;
    const cents = Math.round(parseFloat(dollars) * 100);
    if (!Number.isFinite(cents) || cents < 0) {
      toast.error("Enter a valid price");
      return;
    }
    setProcessing(id);
    try {
      const token = await getToken();
      await setBookingFinalPrice(id, cents, token ?? undefined);
      toast.success(`Final price set to ${formatCurrency(cents)}`);
      setPriceEditId(null);
      setPriceInput("");
      await loadAppointments();
    } catch (error: any) {
      toast.error(error?.body?.message || error?.body?.error || "Failed to set price");
    } finally {
      setProcessing(null);
    }
  };

  const handleStartVerification = async (id: string) => {
    if (processing) return;
    setProcessing(id);
    try {
      const token = await getToken();
      await startBookingVerification(id, token ?? undefined);
      toast.success("Verification started — a code was sent to both of you (valid 3 minutes).");
      await loadAppointments();
    } catch (error: any) {
      toast.error(error?.body?.message || error?.body?.error || "Couldn't start verification");
    } finally {
      setProcessing(null);
    }
  };

  const handleConfirmComplete = async (id: string, who: "client" | "artist", code: string) => {
    if (processing) return;
    if (!code) {
      toast.error("Confirmation code unavailable — refresh and try again.");
      return;
    }
    setProcessing(id);
    try {
      const token = await getToken();
      const updated = await verifyBookingCompletion(id, who, code, token ?? undefined);
      toast.success(
        updated.status === "completed" ? "Completed — processing payment." : "Confirmed — awaiting the other party.",
        { hideProgressBar: true }
      );
      await loadAppointments();
    } catch (error: any) {
      toast.error(error?.body?.message || error?.body?.error || "Couldn't confirm completion");
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
          bg: "color-mix(in srgb, var(--fg) 15%, transparent)",
          text: "color-mix(in srgb, var(--fg) 85%, transparent)",
          border: "color-mix(in srgb, var(--border) 80%, transparent)"
        },
        accepted: {
          bg: "color-mix(in srgb, var(--fg) 15%, transparent)",
          text: "color-mix(in srgb, var(--fg) 90%, transparent)",
          border: "color-mix(in srgb, var(--border) 80%, transparent)"
        },
        confirmed: {
          bg: "color-mix(in srgb, var(--fg) 15%, transparent)",
          text: "color-mix(in srgb, var(--fg) 90%, transparent)",
          border: "color-mix(in srgb, var(--border) 80%, transparent)"
        },
        completed: {
          bg: "color-mix(in srgb, var(--fg) 12%, transparent)",
          text: "color-mix(in srgb, var(--fg) 85%, transparent)",
          border: "color-mix(in srgb, var(--border) 75%, transparent)"
        },
        denied: {
          bg: "color-mix(in srgb, var(--fg) 12%, transparent)",
          text: "color-mix(in srgb, var(--fg) 80%, transparent)",
          border: "color-mix(in srgb, var(--border) 70%, transparent)"
        },
        cancelled: {
          bg: "color-mix(in srgb, var(--fg) 12%, transparent)",
          text: "color-mix(in srgb, var(--fg) 80%, transparent)",
          border: "color-mix(in srgb, var(--border) 70%, transparent)"
        },
        "no-show": {
          bg: "color-mix(in srgb, var(--fg) 12%, transparent)",
          text: "color-mix(in srgb, var(--fg) 75%, transparent)",
          border: "color-mix(in srgb, var(--border) 70%, transparent)"
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
      <div className={`flex items-start gap-2 py-1.5 px-1.5 rounded-md transition-colors hover:bg-[color-mix(in_srgb,var(--elevated)_50%,transparent)] ${className}`}>
        <Icon className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: "color-mix(in srgb, var(--fg) 50%, transparent)" }} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold mb-0.5 uppercase tracking-wide" style={{ color: "color-mix(in srgb, var(--fg) 65%, transparent)", letterSpacing: "0.05em" }}>
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
        className="border rounded-2xl p-4 bg-card border-app h-full flex flex-col transition-all duration-200 hover:shadow-lg hover:border-app"
        style={{
          borderColor: "var(--border)",
          boxShadow: `0 1px 3px color-mix(in srgb, var(--fg) 8%, transparent), 0 1px 2px color-mix(in srgb, var(--fg) 5%, transparent)`,
          background: "var(--card)"
        }}
      >
        <CardHeader className="p-0 pb-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="grid place-items-center h-10 w-10 rounded-full bg-elevated border border-app text-app font-bold text-sm uppercase flex-shrink-0">
              {(otherUser?.username || "?").charAt(0)}
            </span>
            <div className="min-w-0 flex-1 text-left">
              <CardTitle className="text-base font-bold text-app truncate">
                {otherUser?.username || "Unknown"}
              </CardTitle>
              <div className="text-[11px] text-muted truncate">
                {isConsultation ? "Consultation" : isTattooSession ? "Tattoo Session" : "Appointment"}
              </div>
            </div>
            <span
              className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide flex-shrink-0"
              style={getStatusBadgeStyle()}
            >
              {appointment.status.replace("-", " ")}
            </span>
          </div>
          {appointment.createdAt && (
            <div className="mt-2 text-[11px] text-muted">
              Requested {formatDateTime(appointment.createdAt)}
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0 space-y-2 flex-1">
          <div
            className="border-t pt-3 grid grid-cols-2 gap-x-2 gap-y-0.5"
            style={{ borderColor: "color-mix(in srgb, var(--border) 50%, transparent)" }}
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
                          <div className="text-xs" style={{ color: "color-mix(in srgb, var(--fg) 80%, transparent)" }}>
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

            {isArtist && isTattooSession && !["completed", "cancelled", "denied", "no-show"].includes(appointment.status) && (
              <div className="col-span-2 mt-2 rounded-xl border p-3" style={{ borderColor: "var(--border)", background: "var(--elevated)" }}>
                {priceEditId === appointment._id ? (
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 min-w-0">
                      <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
                      <input
                        type="number"
                        min="0"
                        step="1"
                        autoFocus
                        value={priceInput}
                        onChange={(e) => setPriceInput(e.target.value)}
                        placeholder="Final price"
                        className="w-full rounded-lg border bg-card py-2 pl-8 pr-3 text-sm text-app outline-none focus:border-[color:var(--fg)]/40"
                        style={{ borderColor: "var(--border)" }}
                      />
                    </div>
                    <Button onClick={() => handleSetPrice(appointment._id, priceInput)} disabled={processing === appointment._id} className="h-9 rounded-lg text-xs px-3">
                      {processing === appointment._id ? "Saving..." : "Save"}
                    </Button>
                    <Button onClick={() => { setPriceEditId(null); setPriceInput(""); }} className="h-9 rounded-lg text-xs px-3 bg-elevated border border-app text-app hover:bg-elevated/70">
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-subtle min-w-0">
                      {appointment.priceCents && appointment.priceCents > 0
                        ? <>Final price: <span className="font-semibold text-app">{formatCurrency(appointment.priceCents)}</span></>
                        : "Set the final price — the client is charged at completion."}
                    </span>
                    <Button
                      onClick={() => { setPriceEditId(appointment._id); setPriceInput(appointment.priceCents ? (appointment.priceCents / 100).toString() : ""); }}
                      className="h-8 rounded-lg text-xs px-3 whitespace-nowrap"
                    >
                      {appointment.priceCents && appointment.priceCents > 0 ? "Edit price" : "Set price"}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {isTattooSession && appointment.status === "accepted" && (() => {
              const a = appointment as any;
              const myVerified = isClient ? a.clientVerifiedAt : a.artistVerifiedAt;
              const otherVerified = isClient ? a.artistVerifiedAt : a.clientVerifiedAt;
              const myCode = isClient ? a.clientCode : a.artistCode;
              const otherLabel = isClient ? "artist" : "client";
              const codeActive = a.codeExpiresAt && new Date(a.codeExpiresAt).getTime() > Date.now();
              return (
                <div className="col-span-2 mt-2 rounded-xl border p-3" style={{ borderColor: "var(--border)", background: "var(--elevated)" }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <CheckCircle className="h-4 w-4 opacity-70" />
                    <span className="text-xs font-semibold">Confirm completion</span>
                  </div>
                  {!codeActive ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-subtle min-w-0">
                        When the session is done, start verification — you'll each get a code to confirm{isClient ? " (this charges your card)" : ""}.
                      </span>
                      <Button
                        onClick={() => handleStartVerification(appointment._id)}
                        disabled={processing === appointment._id}
                        className="h-8 rounded-lg text-xs px-3 whitespace-nowrap"
                      >
                        {processing === appointment._id ? "..." : "Start"}
                      </Button>
                    </div>
                  ) : myVerified ? (
                    <p className="text-xs text-subtle">
                      You confirmed.{" "}
                      {otherVerified ? "Finalizing payment…" : `Waiting for the ${otherLabel} to confirm.`}
                    </p>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-subtle min-w-0">
                        Code sent to your messages — confirm within 3 minutes{isClient ? " to complete payment" : ""}.
                      </span>
                      <Button
                        onClick={() => handleConfirmComplete(appointment._id, isClient ? "client" : "artist", myCode)}
                        disabled={processing === appointment._id || !myCode}
                        className="h-8 rounded-lg text-xs px-3 whitespace-nowrap"
                      >
                        {processing === appointment._id ? "..." : "Confirm done"}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })()}

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
                    <div className="text-xs" style={{ color: "color-mix(in srgb, var(--fg) 80%, transparent)" }}>
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
                      <div className="text-xs italic" style={{ color: "color-mix(in srgb, var(--fg) 80%, transparent)" }}>
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
                      <div className="text-xs" style={{ color: "color-mix(in srgb, var(--fg) 80%, transparent)" }}>
                        By: {appointment.noShowMarkedBy === "client" ? "Client" : appointment.noShowMarkedBy === "artist" ? "Artist" : "System"}
                      </div>
                    )}
                  </div>
                }
                className="col-span-2"
              />
            )}
          </div>

          {isClient && appointment.priceCents !== undefined && appointment.priceCents > 0 && (
            <div className="pt-1">
              <PaymentBreakdown bookingId={appointment._id} />
            </div>
          )}

          {isCompleted && isTattooSession && (
            <div className="pt-2 border-t" style={{ borderColor: "color-mix(in srgb, var(--border) 50%, transparent)" }}>
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

          {isTattooSession && (
            <SketchPanel bookingId={appointment._id} isArtist={isArtist} isClient={isClient} />
          )}

          {(canAccept || canDeny || canCancel) && (
            <div className="flex gap-2 pt-2 border-t" style={{ borderColor: "color-mix(in srgb, var(--border) 50%, transparent)" }}>
              {canAccept && (
                <Button
                  onClick={() => handleAccept(appointment._id)}
                  disabled={processing === appointment._id}
                  className="flex-1 h-10 sm:h-11 text-xs sm:text-sm font-semibold transition-all hover:scale-[1.02] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="flex-1 h-10 sm:h-11 text-xs sm:text-sm font-semibold transition-all hover:scale-[1.02] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    borderColor: "color-mix(in srgb, var(--fg) 50%, transparent)",
                    color: "color-mix(in srgb, var(--fg) 80%, transparent)",
                    background: "transparent",
                  }}
                >
                  {processing === appointment._id ? "Processing..." : "Deny"}
                </Button>
              )}
              {canCancel && (
                <Button
                  onClick={() => setCancelTarget(appointment._id)}
                  disabled={processing === appointment._id}
                  variant="outline"
                  className="flex-1 h-10 sm:h-11 text-xs sm:text-sm font-semibold transition-all hover:scale-[1.02] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className="flex-1 min-h-0 w-full">
      <Header />
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8">
        <div className="mb-4 sm:mb-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 text-app">
            Appointments
          </h1>
          <p className="text-xs sm:text-sm" style={{ color: "color-mix(in srgb, var(--fg) 70%, transparent)" }}>
            Manage your consultation and tattoo session requests
          </p>
        </div>

        <LazyReveal
          loading={loading}
          skeleton={
            <div className="max-w-2xl mx-auto w-full">
              <div className="mb-5 sm:mb-6 flex justify-center">
                <div className="ink-shimmer rounded-full h-10 w-44 sm:w-52" />
              </div>
              <div className="grid gap-3 sm:gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="ink-shimmer rounded-2xl h-40 w-full" />
                ))}
              </div>
            </div>
          }
        >
          {appointments.length === 0 ? (
          <div className="text-center py-16 text-muted text-sm sm:text-base">
            No appointments found
          </div>
        ) : (
          <>
            <div className="mb-5 sm:mb-6 flex justify-center">
              <div className="inline-flex items-center gap-1 rounded-full border border-app bg-elevated p-1">
                {([
                  { key: "pending" as const, label: "Pending", count: pendingAppointments.length },
                  { key: "past" as const, label: "Past", count: pastAppointments.length },
                ]).map((t) => {
                  const active = view === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setView(t.key)}
                      aria-pressed={active}
                      className={`inline-flex items-center gap-2 rounded-full px-4 sm:px-5 py-2 text-sm font-semibold transition ${active ? "bg-neutral-700 text-white shadow-sm" : "text-app/70 hover:text-app"}`}
                    >
                      {t.label}
                      <span className={`grid place-items-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[11px] font-bold ${active ? "bg-white/20 text-white" : "bg-card text-app/70"}`}>
                        {t.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {(view === "pending" ? pendingAppointments : pastAppointments).length === 0 ? (
              <div className="max-w-2xl mx-auto text-center py-14 rounded-2xl border border-dashed border-app/50 text-sm text-muted">
                {view === "pending" ? "No pending appointments." : "No past appointments."}
              </div>
            ) : (
              <div className="grid gap-3 sm:gap-4 max-w-2xl mx-auto w-full">
                {(view === "pending" ? pendingAppointments : pastAppointments).map((appointment) => (
                  <AppointmentCard key={appointment._id} appointment={appointment} />
                ))}
              </div>
            )}
          </>
        )}
        </LazyReveal>
        {isArtist && <ArtistWaitlist />}
      </div>
      </div>

      <AftercareInstructions
        open={aftercareModalOpen}
        onClose={() => {
          setAftercareModalOpen(false);
          if (aftercareAppointment?._id) markAftercareDismissed(aftercareAppointment._id);
        }}
        appointmentDate={aftercareAppointment?.startAt}
      />

      {cancelTarget && (
        <div
          className="fixed inset-0 z-[2147483600] grid place-items-center p-4"
          style={{ background: "color-mix(in srgb, var(--bg) 70%, transparent)", backdropFilter: "blur(6px)" }}
          role="dialog"
          aria-modal="true"
          onClick={() => setCancelTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border bg-card p-5 text-center shadow-2xl"
            style={{ borderColor: "var(--border)", color: "var(--fg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold">Cancel this appointment?</h3>
            <p className="mt-1.5 text-sm text-subtle">
              This frees the slot and notifies the artist. You may need to wait before re-booking with them.
            </p>
            <div className="mt-5 flex gap-2">
              <Button
                onClick={() => setCancelTarget(null)}
                className="flex-1 h-10 text-sm font-semibold bg-elevated border border-app text-app hover:bg-elevated/70"
              >
                Keep it
              </Button>
              <Button
                onClick={() => { const id = cancelTarget; setCancelTarget(null); if (id) handleDeny(id); }}
                disabled={processing === cancelTarget}
                className="flex-1 h-10 text-sm font-semibold"
                style={{ background: "var(--fg)", color: "var(--bg)" }}
              >
                {processing === cancelTarget ? "Cancelling…" : "Yes, cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer
        position="top-center"
        newestOnTop
        closeOnClick
        draggable
        pauseOnHover
        hideProgressBar
        style={{ zIndex: 2147483647 }}
      />
    </div>
  );
}