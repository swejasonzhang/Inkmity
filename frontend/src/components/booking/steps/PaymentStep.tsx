import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { CreditCard, AlertCircle, Loader2, Gift } from "lucide-react";
import type { Artist, Booking } from "@/api";
import { format } from "date-fns";
import { toast } from "react-toastify";
import {
  createConsultation,
  createTattooSession,
  createDepositPaymentIntent,
  submitIntakeForm,
  getArtistPolicy,
  getBooking,
  getMyRewards,
  getMyCredits,
  type RewardsSummary,
} from "@/api";
import { useApi } from "@/api";
import DocumentSignModal from "@/components/dashboard/shared/DocumentSignModal";

type BookingFlowData = {
  appointmentType: "consultation" | "tattoo_session" | null;
  artistId: string;
  startISO: string | null;
  endISO: string | null;
  durationMinutes: number;
  priceCents: number;
  projectId: string | null;
  sessionNumber: number;
  referenceImageIds: string[];
  intakeForm: any;
};

type Props = {
  bookingData: BookingFlowData;
  artist: Artist;
  onSubmit: (booking: Booking) => void;
  submitting: boolean;
};

type DepositPolicy = {
  mode?: "percent" | "flat";
  percent?: number;
  amountCents?: number;
  minCents?: number;
  maxCents?: number;
  nonRefundable?: boolean;
  cutoffHours?: number;
  consultationFree?: boolean;
};

function computeDepositPreviewCents(
  deposit: DepositPolicy | undefined,
  priceCents: number,
  appointmentType: BookingFlowData["appointmentType"]
) {
  const p = deposit || {};
  if (appointmentType === "consultation" && (p.consultationFree ?? true)) return 0;
  const price = Math.max(0, Number(priceCents || 0));
  const mode = p.mode || "percent";
  let result: number;
  if (mode === "flat") {
    const base = Math.max(0, Number(p.amountCents || 0));
    result = appointmentType === "tattoo_session" ? Math.max(base, 5000) : base;
  } else {
    const percent = Math.max(0, Math.min(1, Number(p.percent ?? 0.2)));
    const enforcedMin = appointmentType === "tattoo_session" ? 5000 : 0;
    const minCents = Math.max(0, Number(p.minCents || 0), enforcedMin);
    const maxCents = Math.max(0, Number(p.maxCents || Infinity));
    const raw = Math.round(price * percent);
    result = Math.min(Math.max(raw, minCents), maxCents);
  }
  if (price > 0) result = Math.min(result, price);
  return result;
}

function PaymentForm({ bookingData, artist, onSubmit, submitting: parentSubmitting }: Props) {
  const { getToken } = useAuth();
  const { request } = useApi();
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  const [depositPolicy, setDepositPolicy] = useState<DepositPolicy | null>(null);
  useEffect(() => {
    if (!bookingData.artistId) return;
    const ac = new AbortController();
    getArtistPolicy(bookingData.artistId, ac.signal)
      .then((p) => setDepositPolicy(p?.deposit || null))
      .catch(() => setDepositPolicy(null));
    return () => ac.abort();
  }, [bookingData.artistId]);

  const depositPreviewCents = useMemo(() => {
    if (!bookingData.appointmentType) return 0;
    return computeDepositPreviewCents(
      depositPolicy || undefined,
      bookingData.priceCents || 0,
      bookingData.appointmentType
    );
  }, [depositPolicy, bookingData.priceCents, bookingData.appointmentType]);

  const [rewards, setRewards] = useState<RewardsSummary | null>(null);
  const [creditCents, setCreditCents] = useState(0);
  const [waiverOpen, setWaiverOpen] = useState(false);
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const token = await getToken();
        setRewards(await getMyRewards(token ?? undefined, ac.signal));
        try {
          const c = await getMyCredits(token ?? undefined, ac.signal);
          setCreditCents(c.availableCents || 0);
        } catch {
        }
      } catch {
        setRewards(null);
      }
    })();
    return () => ac.abort();
  }, [getToken]);

  const platformFeeCents = useMemo(() => {
    if (!rewards) return 0;
    const raw = Math.round((bookingData.priceCents || 0) * rewards.currentFeePct);
    return Math.max(raw, rewards.platformFeeMinCents || 0);
  }, [rewards, bookingData.priceCents]);

  const willRequireDeposit = useMemo(() => {
    if (!bookingData.appointmentType) return false;
    if (bookingData.appointmentType === "tattoo_session") return true;
    return depositPreviewCents > 0;
  }, [bookingData.appointmentType, depositPreviewCents]);

  const handleSubmit = useCallback(async () => {
    if (!bookingData.startISO || !bookingData.endISO || !bookingData.appointmentType) {
      toast.error("Please complete all required steps");
      return;
    }

    if (willRequireDeposit && (!stripe || !elements)) {
      toast.error("Payment system is not ready. Please refresh and try again.");
      return;
    }

    setSubmitting(true);
    setPaymentError(null);

    try {
      const token = await getToken();
      let booking: Booking;

      if (bookingData.appointmentType === "consultation") {
        booking = await createConsultation(
          {
            artistId: bookingData.artistId,
            startISO: bookingData.startISO,
            durationMinutes: bookingData.durationMinutes,
            priceCents: bookingData.priceCents,
          },
          token
        );
      } else {
        booking = await createTattooSession(
          {
            artistId: bookingData.artistId,
            startISO: bookingData.startISO,
            durationMinutes: bookingData.durationMinutes,
            priceCents: bookingData.priceCents,
            projectId: bookingData.projectId || undefined,
            sessionNumber: bookingData.sessionNumber,
            referenceImageIds: bookingData.referenceImageIds,
          },
          token
        );
      }

      if (bookingData.intakeForm && booking._id) {
        try {
          await submitIntakeForm(booking._id, bookingData.intakeForm, token);
        } catch (err) {
          console.error("Failed to submit intake form:", err);
        }
      }

      const depositToPay = Number(booking.depositRequiredCents || 0);
      if (depositToPay > 0) {
        try {
          if (!stripe || !elements) {
            throw new Error("Payment system is not ready. Please refresh and try again.");
          }

          const paymentData = await createDepositPaymentIntent(booking._id, token);

          if (!paymentData.clientSecret) {
            throw new Error("No payment intent received");
          }

          const cardElement = elements.getElement(CardElement);
          if (!cardElement) {
            throw new Error("Card element not found");
          }

          const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
            paymentData.clientSecret,
            {
              payment_method: {
                card: cardElement,
              },
            }
          );

          if (confirmError) {
            setPaymentError(confirmError.message || "Payment failed");
            toast.error(`Payment failed: ${confirmError.message}`);
            return;
          }

          if (paymentIntent?.status === "succeeded") {
            const token = await getToken();
            let pollAttempts = 0;
            const maxAttempts = 10;
            while (pollAttempts < maxAttempts) {
              const updated = await getBooking(booking._id, token);
              if ((updated as any)?.depositStatus === "paid") break;
              pollAttempts++;
              await new Promise((r) => setTimeout(r, 1000 * pollAttempts));
            }
            toast.success(`Deposit paid successfully! ($${(depositToPay / 100).toFixed(2)})`);
          } else {
            throw new Error("Payment did not complete successfully");
          }
        } catch (err: any) {
          console.error("Payment error:", err);
          const errorMessage = err?.message || "Payment processing failed. Please try again.";
          setPaymentError(errorMessage);
          toast.error(errorMessage);
          return;
        }
      }

      toast.success("Appointment booked successfully!");
      setConfirmedBooking(booking);
      onSubmit(booking);
    } catch (error: any) {
      console.error("Booking error:", error);
      if (error?.status === 403 && error?.body?.error === "waiver_required") {
        setWaiverOpen(true);
        return;
      }
      const errorMessage = error?.body?.message || error?.body?.error || error?.message || "Failed to create appointment";
      toast.error(errorMessage);
      setPaymentError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [bookingData, artist, onSubmit, stripe, elements, getToken, request, willRequireDeposit]);

  const isSubmitting = submitting || parentSubmitting;
  const canSubmit = !isSubmitting && !!bookingData.startISO && !!bookingData.endISO && !!bookingData.appointmentType;

  if (confirmedBooking) {
    return (
      <div className="space-y-6">
        <Card className="p-6 space-y-4">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="rounded-full bg-white/10 p-4">
              <CreditCard className="h-8 w-8 text-app" />
            </div>
            <h3 className="text-lg font-semibold">Booking Confirmed!</h3>
            <p className="text-sm text-muted-foreground">
              Your appointment has been booked successfully.
            </p>
            {confirmedBooking._id && (
              <p className="text-xs text-muted-foreground font-mono">
                Booking ID: {confirmedBooking._id}
              </p>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DocumentSignModal
        open={waiverOpen}
        docType="client_waiver"
        signerRole="client"
        onSigned={() => {
          setWaiverOpen(false);
          handleSubmit();
        }}
        onClose={() => setWaiverOpen(false)}
      />
      <div>
        <h3 className="text-lg font-semibold mb-2">Review & Payment</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Review your appointment details and complete payment
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <div>
          <h4 className="font-semibold mb-3">Appointment Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Artist:</span>
              <span className="font-medium">{artist.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium capitalize">
                {bookingData.appointmentType?.replace("_", " ")}
              </span>
            </div>
            {bookingData.startISO && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date & Time:</span>
                <span className="font-medium">
                  {format(new Date(bookingData.startISO), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-medium">{bookingData.durationMinutes} minutes</span>
            </div>
            {bookingData.priceCents > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated Total:</span>
                <span className="font-medium">
                  ${(bookingData.priceCents / 100).toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                Deposit{bookingData.appointmentType === "consultation" ? " (consultation)" : " (session)"}:
              </span>
              <span className="font-semibold">
                {depositPreviewCents > 0 ? `$${(depositPreviewCents / 100).toFixed(2)}` : "Free"}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {willRequireDeposit ? (
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Deposit Required
            </h4>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deposit (artist-set):</span>
                <span className="font-medium">${(depositPreviewCents / 100).toFixed(2)}</span>
              </div>
              {platformFeeCents > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Platform fee{rewards?.tier?.label ? ` (${rewards.tier.label})` : ""}:
                  </span>
                  <span className="font-medium">${(platformFeeCents / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between rounded-lg border px-3 py-2 mt-2" style={{ borderColor: "var(--border)", background: "var(--elevated)" }}>
                <span className="font-semibold">Total due now</span>
                <span className="text-lg font-bold">
                  ${((depositPreviewCents + platformFeeCents) / 100).toFixed(2)}
                </span>
              </div>
              {bookingData.priceCents > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Estimated remaining balance:</span>
                  <span>
                    ${(Math.max(0, bookingData.priceCents - depositPreviewCents) / 100).toFixed(2)}
                  </span>
                </div>
              )}
              {creditCents > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Inkmity credit (applied to balance):</span>
                  <span className="font-medium">
                    -$
                    {(
                      Math.min(
                        creditCents,
                        Math.max(0, bookingData.priceCents - depositPreviewCents)
                      ) / 100
                    ).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="p-4 border rounded-xl" style={{ borderColor: "var(--border)", background: "var(--elevated)" }}>
                <label className="text-sm font-medium mb-2 block text-center">Card details</label>
                <div className="p-3.5 border rounded-xl bg-white" style={{ borderColor: "var(--border)" }}>
                  <CardElement
                    options={{
                      style: {
                        base: {
                          fontSize: "16px",
                          color: "#424770",
                          "::placeholder": {
                            color: "#aab7c4",
                          },
                        },
                        invalid: {
                          color: "#9e2146",
                        },
                      },
                    }}
                  />
                </div>
                {paymentError && (
                  <p className="text-sm text-destructive mt-2">{paymentError}</p>
                )}
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--elevated)" }}>
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 opacity-70 shrink-0" />
                <div className="text-[11px] leading-relaxed opacity-75">
                  <p className="font-semibold mb-0.5 opacity-100">Deposit policy</p>
                  <p>
                    The deposit holds your booking and is applied to your final cost. The
                    remaining balance is paid with the artist at the studio. Cancellations
                    inside the artist's cutoff window forfeit the deposit.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border px-4 py-4 text-center" style={{ borderColor: "var(--border)", background: "var(--elevated)" }}>
            <div className="flex items-center justify-center gap-2">
              <Gift className="h-4 w-4 opacity-70" />
              <span className="font-semibold">
                {bookingData.appointmentType === "consultation" ? "Free consultation" : "No deposit required"}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {bookingData.appointmentType === "consultation"
                ? "This artist offers consultations at no charge — nothing is collected now."
                : "Nothing is collected now for this appointment."}
            </p>
          </div>
        )}

        <Separator />

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• By completing this booking, you agree to the terms and conditions</p>
          <p>• You will receive a confirmation email with appointment details</p>
          <p>• Please arrive 10 minutes early for your appointment</p>
        </div>

        <div className="pt-4">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : willRequireDeposit ? (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Pay Deposit & Complete Booking
              </>
            ) : (
              "Complete Booking"
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function PaymentStep(props: Props) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm {...props} />
    </Elements>
  );
}