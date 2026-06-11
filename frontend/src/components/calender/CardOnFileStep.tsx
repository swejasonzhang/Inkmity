import { useState } from "react";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe";
import { useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { ShieldCheck, Loader2 } from "lucide-react";
import { createCardSetupIntent, type Booking } from "@/api";

type Props = {
  booking: Booking;
  onSaved: () => void;
  onCancel: () => void;
  artistName?: string;
};

// No-deposit flow: save the client's card on file at booking (no charge). The
// rate + platform fee are captured off-session when the session is completed.
function Inner({ booking, onSaved, onCancel, artistName }: Props) {
  const { getToken } = useAuth();
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (saving || !stripe || !elements) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      const { clientSecret } = await createCardSetupIntent((booking as any)._id, token);
      if (!clientSecret) throw new Error("Could not start card setup");
      const card = elements.getElement(CardElement);
      if (!card) throw new Error("Card element not found");
      const { error: e } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card },
      });
      if (e) {
        const msg = e.message || "Couldn't save your card";
        setError(msg);
        toast.error(msg);
        setSaving(false);
        return;
      }
      toast.success("Card saved — you'll be charged when your session is complete.");
      onSaved();
    } catch (err: any) {
      const msg = err?.body?.message || err?.message || "Couldn't save your card";
      setError(msg);
      toast.error(msg);
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto text-app">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="h-5 w-5" />
        <h3 className="font-bold text-lg">Save your card</h3>
      </div>
      <p className="text-sm text-subtle mb-4 leading-relaxed">
        Add a card to confirm your appointment{artistName ? ` with ${artistName}` : ""}. Nothing is
        charged today — you'll be charged the agreed total automatically once your session is marked
        complete.
      </p>
      <div className="p-3.5 border border-app rounded-xl bg-white mb-3">
        <CardElement
          options={{
            style: {
              base: { fontSize: "16px", color: "#424770", "::placeholder": { color: "#aab7c4" } },
              invalid: { color: "#9e2146" },
            },
          }}
        />
      </div>
      {error && <p className="text-sm text-destructive mb-2">{error}</p>}
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 bg-elevated border border-app text-app hover:bg-elevated/70 h-10 rounded-lg"
        >
          Not now
        </Button>
        <Button
          type="button"
          onClick={save}
          disabled={saving || !stripe}
          className="flex-1 h-10 rounded-lg font-semibold"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save card"}
        </Button>
      </div>
    </div>
  );
}

export default function CardOnFileStep(props: Props) {
  return (
    <Elements stripe={stripePromise}>
      <Inner {...props} />
    </Elements>
  );
}
