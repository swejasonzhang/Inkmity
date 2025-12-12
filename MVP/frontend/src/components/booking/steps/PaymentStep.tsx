import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CreditCard, AlertCircle } from "lucide-react";
import type { Artist, Booking } from "@/api";
import { format } from "date-fns";

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
  onSubmit: () => void;
  submitting: boolean;
};

export default function PaymentStep({
  bookingData,
  artist,
  onSubmit,
  submitting,
}: Props) {
  const depositAmount = bookingData.priceCents
    ? Math.round(bookingData.priceCents * 0.2)
    : 0;
  const requiresDeposit = bookingData.appointmentType === "tattoo_session" && depositAmount > 0;

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

        {requiresDeposit ? (
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Deposit Required
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deposit (20%):</span>
                <span className="font-medium">${(depositAmount / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Remaining balance:</span>
                <span>
                  ${((bookingData.priceCents - depositAmount) / 100).toFixed(2)}
                </span>
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
      </Card>
    </div>
  );
}


