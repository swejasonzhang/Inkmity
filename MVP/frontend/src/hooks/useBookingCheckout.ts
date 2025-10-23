import { useCallback, useState } from "react";
import { createBooking, startCheckout } from "@/api";

type StartParams = {
  artistId: string;
  clientId: string;
  startISO: string;
  endISO: string;
  note?: string;
  label?: string;
};

export function useBookingCheckout() {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(
    async (params: StartParams) => {
      if (processing) return;
      setProcessing(true);
      setError(null);
      try {
        const booking = await createBooking({
          artistId: params.artistId,
          clientId: params.clientId,
          startISO: params.startISO,
          endISO: params.endISO,
          note: params.note,
        });

        const res = await startCheckout(
          booking._id,
          params.label || "Platform Fee"
        );

        if (res?.mode === "free") {
          window.location.href = `/checkout/success?booking=${booking._id}`;
        } else if (res?.url) {
          window.location.href = res.url;
        } else {
          throw new Error("No checkout URL returned.");
        }
      } catch (e: any) {
        setError(e?.message || "Failed to start checkout");
        setProcessing(false);
      }
    },
    [processing]
  );

  return { start, processing, error };
}