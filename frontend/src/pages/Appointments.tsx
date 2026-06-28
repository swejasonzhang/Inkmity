import { useCallback, useEffect, useState, useLayoutEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useRole } from "@/hooks/useRole";
import { useTheme } from "@/hooks/useTheme";
import { useScrollLock } from "@/hooks/useScrollLock";
import Header from "@/components/header/Header";
import { getAppointments, acceptAppointment, denyAppointment, reportArtistNoShow, respondArtistNoShow, checkInBooking, setBookingFinalPrice, approveBookingFinalPrice, startBookingVerification, verifyBookingCompletion, Booking } from "@/api";
import { useBookingRealtime } from "@/hooks/useBookingRealtime";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import LazyReveal from "@/components/ui/LazyReveal";
import ArtistWaitlist from "@/components/dashboard/artist/ArtistWaitlist";
import SketchPanel from "@/components/dashboard/shared/SketchPanel";
import PaymentBreakdown from "@/components/dashboard/client/PaymentBreakdown";
import IntakeFormPanel from "@/components/dashboard/client/IntakeFormPanel";
import TipModal from "@/components/dashboard/client/TipModal";
import ReviewPromptModal from "@/components/dashboard/shared/ReviewPromptModal";
import PromptModal, { type PromptConfig } from "@/components/dashboard/shared/PromptModal";
import { Calendar, Clock, DollarSign, FileText, Image, RefreshCw, CheckCircle, XCircle, AlertCircle, Hash, Heart, Star } from "lucide-react";
import { formatCurrency } from "@/lib/format";

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
  const [appointments, setAppointments] = useState<AppointmentWithUsers[]>([]);
  const [view, setView] = useState<"pending" | "past">("pending");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [priceEditId, setPriceEditId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [tipTarget, setTipTarget] = useState<AppointmentWithUsers | null>(null);
  const [reviewTarget, setReviewTarget] = useState<AppointmentWithUsers | null>(null);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [prompt, setPrompt] = useState<PromptConfig | null>(null);

  useScrollLock(cancelTarget !== null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tipped") === "1") {
      toast.success("Thank you — your tip went 100% to your artist.", { position: "top-center", hideProgressBar: true });
    }
    if (params.get("tipped") || params.get("tip_cancelled")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useLayoutEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = "transparent";
    return () => {
      document.body.style.backgroundColor = prev;
    };
  }, [theme]);

  const isClient = role === "client";
  const isArtist = role === "artist";

  const loadAppointments = useCallback(async (silent = false) => {
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
  }, [roleLoaded, user?.id, getToken]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

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

  const handleArtistNoShow = (id: string) => {
    setPrompt({
      title: "Report a no-show",
      message: "The artist will be asked to confirm or dispute this.",
      confirmLabel: "Submit report",
      input: { label: "What happened? (optional)", placeholder: "e.g. the artist never arrived" },
      onConfirm: async (reason) => {
        try {
          const token = await getToken();
          await reportArtistNoShow(id, reason || undefined, token ?? undefined);
          toast.success("Reported — the artist will be asked to confirm or dispute.", { position: "top-center", hideProgressBar: true });
          await loadAppointments();
        } catch (error: any) {
          toast.error(error?.body?.message || error?.body?.error || "Couldn't submit the report");
          throw error;
        }
      },
    });
  };

  const handleCheckIn = async (id: string) => {
    if (processing) return;
    setProcessing(id);
    const getCoords = () =>
      new Promise<{ lat: number; lng: number } | undefined>((resolve) => {
        if (!navigator.geolocation) return resolve(undefined);
        const t = window.setTimeout(() => resolve(undefined), 4000);
        navigator.geolocation.getCurrentPosition(
          (pos) => { window.clearTimeout(t); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
          () => { window.clearTimeout(t); resolve(undefined); },
          { timeout: 4000 }
        );
      });
    try {
      const coords = await getCoords();
      const token = await getToken();
      await checkInBooking(id, coords, token ?? undefined);
      toast.success("Checked in.", { position: "top-center", hideProgressBar: true });
      await loadAppointments();
    } catch (error: any) {
      toast.error(error?.body?.message || error?.body?.error || "Couldn't check in");
    } finally {
      setProcessing(null);
    }
  };

  const runRespondNoShow = async (id: string, accept: boolean, note: string) => {
    try {
      const token = await getToken();
      await respondArtistNoShow(id, accept, note || undefined, token ?? undefined);
      toast.success(accept ? "Confirmed — the deposit is being refunded." : "Disputed — sent to our team for review.", { position: "top-center", hideProgressBar: true });
      await loadAppointments();
    } catch (error: any) {
      toast.error(error?.body?.message || error?.body?.error || "Couldn't submit your response");
      throw error;
    }
  };

  const handleRespondNoShow = (id: string, accept: boolean) => {
    if (accept) {
      setPrompt({
        title: "Confirm you missed this appointment?",
        message: "The client's deposit will be refunded to them.",
        confirmLabel: "Yes, refund the client",
        onConfirm: () => runRespondNoShow(id, true, ""),
      });
    } else {
      setPrompt({
        title: "Dispute this report",
        message: "Add a note for our team's review.",
        confirmLabel: "Submit dispute",
        input: { label: "Note (optional)", placeholder: "e.g. the client didn't show" },
        onConfirm: (note) => runRespondNoShow(id, false, note),
      });
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

  const handleApproveFinalPrice = async (id: string) => {
    if (processing) return;
    setProcessing(id);
    try {
      const token = await getToken();
      await approveBookingFinalPrice(id, token ?? undefined);
      toast.success("Final price approved");
      await loadAppointments();
    } catch (error: any) {
      toast.error(error?.body?.message || error?.body?.error || "Failed to approve price");
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
    const needsFinalPriceApproval =
      isTattooSession && !!appointment.finalPriceSetAt && appointment.finalPriceApproved === false;

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

            {needsFinalPriceApproval && isClient && (
              <div className="col-span-2 mt-2 rounded-xl border p-3" style={{ borderColor: "var(--fg)", background: "var(--elevated)" }}>
                <p className="text-sm font-semibold text-app">Approve the final price</p>
                <p className="mt-0.5 text-xs text-subtle">
                  Your artist set the final price to{" "}
                  <span className="font-semibold text-app">{formatCurrency(appointment.priceCents || 0)}</span>
                  {appointment.quotedPriceCents ? <> (quoted {formatCurrency(appointment.quotedPriceCents)})</> : null}.
                  {" "}Your remaining balance won't be charged until you approve.
                </p>
                <Button
                  onClick={() => handleApproveFinalPrice(appointment._id)}
                  disabled={processing === appointment._id}
                  className="mt-2 h-9 rounded-lg text-xs px-4 bg-[color:var(--fg)] text-[color:var(--bg)] hover:opacity-90"
                >
                  {processing === appointment._id ? "Approving..." : `Approve ${formatCurrency(appointment.priceCents || 0)}`}
                </Button>
              </div>
            )}

            {needsFinalPriceApproval && isArtist && (
              <p className="col-span-2 mt-1 text-xs text-subtle">
                Waiting for the client to approve the final price before the balance is charged.
              </p>
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

          {isClient && isCompleted && (() => {
            const reviewed = (appointment as any).reviewed || reviewedIds.has(appointment._id);
            const tipped = (appointment as any).tipCents > 0;
            if (reviewed && tipped) {
              return (
                <div className="pt-2 border-t flex items-center justify-center gap-4 text-xs text-subtle" style={{ borderColor: "color-mix(in srgb, var(--border) 50%, transparent)" }}>
                  <span className="inline-flex items-center gap-1.5"><Star className="h-3.5 w-3.5" /> Reviewed</span>
                  <span className="inline-flex items-center gap-1.5"><Heart className="h-3.5 w-3.5" /> Tipped {formatCurrency((appointment as any).tipCents)}</span>
                </div>
              );
            }
            return (
              <div className="pt-2 border-t flex gap-2" style={{ borderColor: "color-mix(in srgb, var(--border) 50%, transparent)" }}>
                {reviewed ? (
                  <div className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs text-subtle"><Star className="h-3.5 w-3.5" /> Reviewed</div>
                ) : (
                  <Button onClick={() => setReviewTarget(appointment)} variant="outline" className="flex-1 h-9 text-sm font-medium gap-1.5" style={{ borderColor: "var(--border)", color: "var(--fg)", background: "var(--card)" }}>
                    <Star className="h-4 w-4" /> Review
                  </Button>
                )}
                {tipped ? (
                  <div className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs text-subtle"><Heart className="h-3.5 w-3.5" /> Tipped {formatCurrency((appointment as any).tipCents)}</div>
                ) : (
                  <Button onClick={() => setTipTarget(appointment)} variant="outline" className="flex-1 h-9 text-sm font-medium gap-1.5" style={{ borderColor: "var(--border)", color: "var(--fg)", background: "var(--card)" }}>
                    <Heart className="h-4 w-4" /> Tip
                  </Button>
                )}
              </div>
            );
          })()}

          {isTattooSession && isClient && (
            <SketchPanel bookingId={appointment._id} isArtist={isArtist} isClient={isClient} />
          )}

          {isClient && isTattooSession && !["completed", "cancelled", "denied", "no-show"].includes(appointment.status) && (
            <IntakeFormPanel bookingId={appointment._id} isClient={isClient} />
          )}

          {(() => {
            const startMs = new Date(appointment.startAt).getTime();
            const checkInOpen = Date.now() >= startMs - 3600000 && Date.now() <= startMs + 24 * 3600000;
            const myCheckedIn = isClient ? (appointment as any).clientCheckedInAt : (appointment as any).artistCheckedInAt;
            if (!checkInOpen || ["completed", "cancelled", "denied", "no-show"].includes(appointment.status)) return null;
            return (
              <div className="pt-2 border-t" style={{ borderColor: "color-mix(in srgb, var(--border) 50%, transparent)" }}>
                {myCheckedIn ? (
                  <div className="flex items-center justify-center gap-2 text-xs text-subtle py-1">
                    <CheckCircle className="h-3.5 w-3.5" /> You're checked in.
                  </div>
                ) : (
                  <Button
                    onClick={() => handleCheckIn(appointment._id)}
                    disabled={processing === appointment._id}
                    variant="outline"
                    className="w-full h-9 text-sm font-medium gap-2"
                    style={{ borderColor: "var(--border)", color: "var(--fg)", background: "var(--card)" }}
                  >
                    <CheckCircle className="h-4 w-4" /> Check in
                  </Button>
                )}
              </div>
            );
          })()}

          {isClient && new Date(appointment.startAt).getTime() < Date.now() && !["completed", "cancelled", "denied", "no-show"].includes(appointment.status) && (
            <div className="pt-2 border-t" style={{ borderColor: "color-mix(in srgb, var(--border) 50%, transparent)" }}>
              {(appointment as any).artistNoShowStatus === "disputed" ? (
                <div className="flex items-center justify-center gap-2 text-xs text-subtle py-1">
                  <AlertCircle className="h-3.5 w-3.5" /> The artist disputed your report — our team is reviewing it.
                </div>
              ) : (appointment as any).artistNoShowReportedAt ? (
                <div className="flex items-center justify-center gap-2 text-xs text-subtle py-1">
                  <AlertCircle className="h-3.5 w-3.5" /> No-show reported — awaiting the artist's response.
                </div>
              ) : (
                <Button
                  onClick={() => handleArtistNoShow(appointment._id)}
                  disabled={processing === appointment._id}
                  variant="outline"
                  className="w-full h-9 text-sm font-medium gap-2"
                  style={{ borderColor: "var(--border)", color: "var(--fg)", background: "var(--card)" }}
                >
                  <AlertCircle className="h-4 w-4" /> Artist didn't show up
                </Button>
              )}
            </div>
          )}

          {isArtist && (appointment as any).artistNoShowStatus === "reported" && (
            <div className="pt-2 border-t space-y-2" style={{ borderColor: "color-mix(in srgb, var(--border) 50%, transparent)" }}>
              <div className="text-xs text-subtle">
                The client reported you didn't show
                {(appointment as any).artistNoShowReason ? `: "${(appointment as any).artistNoShowReason}"` : ""}. Please respond.
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleRespondNoShow(appointment._id, false)}
                  disabled={processing === appointment._id}
                  variant="outline"
                  className="flex-1 h-9 text-sm font-medium"
                  style={{ borderColor: "var(--border)", color: "var(--fg)", background: "var(--card)" }}
                >
                  Dispute
                </Button>
                <Button
                  onClick={() => handleRespondNoShow(appointment._id, true)}
                  disabled={processing === appointment._id}
                  className="flex-1 h-9 text-sm font-semibold"
                  style={{ background: "var(--fg)", color: "var(--bg)" }}
                >
                  I missed it — refund
                </Button>
              </div>
            </div>
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
                <div className="ink-shimmer rounded-full h-11 w-48 sm:w-56" />
              </div>
              <div className="grid gap-3 sm:gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-app bg-card p-4 flex flex-col">
                    <div className="pb-3">
                      <div className="ink-shimmer rounded-xl h-16 w-full" />
                    </div>
                    <div className="space-y-2 flex-1">
                      <div
                        className="border-t pt-3"
                        style={{ borderColor: "color-mix(in srgb, var(--border) 50%, transparent)" }}
                      >
                        <div className="ink-shimmer rounded-xl h-40 w-full" />
                      </div>
                      <div
                        className="border-t pt-2"
                        style={{ borderColor: "color-mix(in srgb, var(--border) 50%, transparent)" }}
                      >
                        <div className="ink-shimmer rounded-xl h-10 w-full" />
                      </div>
                    </div>
                  </div>
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

      <TipModal
        open={tipTarget !== null}
        bookingId={tipTarget?._id || ""}
        artistName={tipTarget?.artist?.username}
        onClose={() => setTipTarget(null)}
      />

      <ReviewPromptModal
        open={reviewTarget !== null}
        onClose={() => setReviewTarget(null)}
        onSubmitted={() => {
          if (reviewTarget) setReviewedIds((prev) => new Set(prev).add(reviewTarget._id));
        }}
        artistId={reviewTarget?.artistId || ""}
        artistName={reviewTarget?.artist?.username || "your artist"}
        bookingId={reviewTarget?._id}
      />

      <PromptModal config={prompt} onClose={() => setPrompt(null)} />

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