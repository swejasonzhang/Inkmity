import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { CreditCard, AlertCircle, Loader2 } from "lucide-react";
import type { Artist, Booking } from "@/api";
import { format } from "date-fns";
import { toast } from "react-toastify";
import {
  createConsultation,
  createTattooSession,
  createDepositPaymentIntent,
  submitIntakeForm,
  getArtistPolicy,
} from "@/api";
import { useApi } from "@/api";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

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
};

function computeDepositPreviewCents(
  deposit: DepositPolicy | undefined,
  priceCents: number,
  appointmentType: BookingFlowData["appointmentType"]
) {
  const p = deposit || {};
  const mode = p.mode || "percent";

  if (mode === "flat") {
    const base = Math.max(0, Number(p.amountCents || 0));
    if (appointmentType === "tattoo_session") return Math.max(base, 5000);
    return base;
  }

  const percent = Math.max(0, Math.min(1, Number(p.percent ?? 0.2)));
  const enforcedMin = appointmentType === "tattoo_session" ? 5000 : 0;
  const minCents = Math.max(0, Number(p.minCents || 0), enforcedMin);
  const maxCents = Math.max(0, Number(p.maxCents || Infinity));
  const base = Math.max(0, Number(priceCents || 0));
  const raw = Math.round(base * percent);
  return Math.min(Math.max(raw, minCents), maxCents);
}

function PaymentForm({ bookingData, artist, onSubmit, submitting: parentSubmitting }: Props) {
  const { getToken } = useAuth();
  const { request } = useApi();
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

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
      onSubmit(booking);
    } catch (error: any) {
      console.error("Booking error:", error);
      const errorMessage = error?.body?.error || error?.body?.message || error?.message || "Failed to create appointment";
      toast.error(errorMessage);
      setPaymentError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [bookingData, artist, onSubmit, stripe, elements, getToken, request, willRequireDeposit]);

  const isSubmitting = submitting || parentSubmitting;
  const canSubmit = !isSubmitting && !!bookingData.startISO && !!bookingData.endISO && !!bookingData.appointmentType;

  return (
    <div className="space-y-6">
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
              {bookingData.priceCents > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Estimated remaining balance:</span>
                  <span>
                    ${(Math.max(0, bookingData.priceCents - depositPreviewCents) / 100).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="p-4 border rounded-md bg-background">
                <label className="text-sm font-medium mb-2 block">Card Details</label>
                <div className="p-3 border rounded-md bg-white dark:bg-gray-900">
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

            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-xs text-yellow-800 dark:text-yellow-200">
                  <p className="font-medium mb-1">Deposit Policy</p>
                  <p>
                    Deposits are non-refundable and will be applied to your final cost.
                    Cancellation requires 48-72 hours notice or deposit is forfeited.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h4 className="font-semibold mb-3">Payment</h4>
            <p className="text-sm text-muted-foreground">
              {bookingData.appointmentType === "consultation"
                ? "No deposit required for consultations. Payment will be collected at the appointment."
                : "No deposit required for this appointment."}
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