import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ProgressDots from "@/components/access/ProgressDots";
import type { Artist, Booking } from "@/api";
import AppointmentTypeStep from "./steps/AppointmentTypeStep";
import TimeSlotStep from "./steps/TimeSlotStep";
import IntakeFormStep from "./steps/IntakeFormStep";
import ReferenceImagesStep from "./steps/ReferenceImagesStep";
import PaymentStep from "./steps/PaymentStep";

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
  artist: Artist;
  onComplete?: (booking: Booking) => void;
  onCancel?: () => void;
  initialDate?: Date;
};

const STEPS = [
  { key: "type", label: "Appointment Type" },
  { key: "time", label: "Select Time" },
  { key: "intake", label: "Intake Form" },
  { key: "references", label: "Reference Images" },
  { key: "payment", label: "Payment" },
];

export default function AppointmentBookingFlow({
  artist,
  onComplete,
  onCancel,
  initialDate,
}: Props) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [bookingData, setBookingData] = useState<BookingFlowData>({
    appointmentType: null,
    artistId: artist.clerkId || artist._id,
    startISO: null,
    endISO: null,
    durationMinutes: 30,
    priceCents: 0,
    projectId: null,
    sessionNumber: 1,
    referenceImageIds: [],
    intakeForm: null,
  });

  const updateBookingData = useCallback((updates: Partial<BookingFlowData>) => {
    setBookingData((prev) => ({ ...prev, ...updates }));
  }, []);

  const canProceed = useMemo(() => {
    switch (step) {
      case 0:
        return bookingData.appointmentType !== null;
      case 1:
        return bookingData.startISO !== null && bookingData.endISO !== null;
      case 2:
        return bookingData.intakeForm !== null;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  }, [step, bookingData]);

  const handleNext = useCallback(() => {
    if (canProceed && step < STEPS.length - 1) {
      setStep(step + 1);
    }
  }, [canProceed, step]);

  const handleBack = useCallback(() => {
    if (step > 0) {
      setStep(step - 1);
    }
  }, [step]);

  const handleBookingComplete = useCallback((booking: Booking) => {
    setSubmitting(false);
    onComplete?.(booking);
  }, [onComplete]);

  return (
    <Card className="w-full max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Book Appointment</h2>
        <p className="text-muted-foreground">Book an appointment with {artist.username}</p>
        <div className="mt-4">
          <ProgressDots
            total={STEPS.length}
            current={step}
          />
        </div>
      </div>

      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="type"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <AppointmentTypeStep
                value={bookingData.appointmentType}
                onChange={(type, duration, price) => {
                  updateBookingData({
                    appointmentType: type,
                    durationMinutes: duration,
                    priceCents: price,
                  });
                }}
              />
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="time"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <TimeSlotStep
                artistId={bookingData.artistId}
                initialDate={initialDate}
                selectedStart={bookingData.startISO}
                selectedEnd={bookingData.endISO}
                durationMinutes={bookingData.durationMinutes}
                appointmentType={bookingData.appointmentType || "tattoo_session"}
                onSelect={(startISO, endISO) => {
                  updateBookingData({ startISO, endISO });
                }}
              />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="intake"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <IntakeFormStep
                artistId={bookingData.artistId}
                appointmentType={bookingData.appointmentType || "tattoo_session"}
                value={bookingData.intakeForm}
                onChange={(form) => {
                  updateBookingData({ intakeForm: form });
                }}
              />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="references"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <ReferenceImagesStep
                value={bookingData.referenceImageIds}
                onChange={(ids) => {
                  updateBookingData({ referenceImageIds: ids });
                }}
              />
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <PaymentStep
                bookingData={bookingData}
                artist={artist}
                onSubmit={handleBookingComplete}
                submitting={submitting}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {step < STEPS.length - 1 && (
        <div className="flex justify-between mt-6 gap-4">
          <Button
            variant="outline"
            onClick={step === 0 ? onCancel : handleBack}
            disabled={submitting}
          >
            {step === 0 ? "Cancel" : "Back"}
          </Button>
          <Button onClick={handleNext} disabled={!canProceed || submitting}>
            Next
          </Button>
        </div>
      )}
    </Card>
  );
}


