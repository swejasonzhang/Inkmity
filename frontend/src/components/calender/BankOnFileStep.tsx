import { useState } from "react";
import { Elements, useStripe } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { Landmark, Loader2 } from "lucide-react";
import { createBankSetupIntent, type Booking } from "@/api";

type Props = {
  booking: Booking;
  onSaved: () => void;
  onCancel: () => void;
  artistName?: string;
};

function Inner({ booking, onSaved, onCancel, artistName }: Props) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const stripe = useStripe();
  const [name, setName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.primaryEmailAddress?.emailAddress || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (saving || !stripe) return;
    if (!name.trim() || !email.trim()) {
      setError("Enter your name and email to link a bank account.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      const { clientSecret } = await createBankSetupIntent((booking as any)._id, token);
      if (!clientSecret) throw new Error("Could not start bank setup");

      const collected = await stripe.collectBankAccountForSetup({
        clientSecret,
        params: {
          payment_method_type: "us_bank_account",
          payment_method_data: { billing_details: { name: name.trim(), email: email.trim() } },
        },
        expand: ["payment_method"],
      });
      if (collected.error) {
        const msg = collected.error.message || "Couldn't link your bank";
        setError(msg);
        toast.error(msg);
        setSaving(false);
        return;
      }

      const confirmed = await stripe.confirmUsBankAccountSetup(clientSecret);
      if (confirmed.error) {
        const msg = confirmed.error.message || "Couldn't confirm your bank";
        setError(msg);
        toast.error(msg);
        setSaving(false);
        return;
      }

      const status = confirmed.setupIntent?.status;
      if (status === "requires_action") {
        toast.info("Check your bank for two small deposits, then verify to finish.");
      } else {
        toast.success("Bank account linked — you'll be charged when your session is complete.");
      }
      onSaved();
    } catch (err: any) {
      const msg = err?.body?.message || err?.message || "Couldn't link your bank";
      setError(msg);
      toast.error(msg);
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto text-app">
      <div className="flex items-center gap-2 mb-2">
        <Landmark className="h-5 w-5" />
        <h3 className="font-bold text-lg">Link your bank</h3>
      </div>
      <p className="text-sm text-subtle mb-4 leading-relaxed">
        Pay by bank (ACH) to confirm your appointment{artistName ? ` with ${artistName}` : ""}.
        Nothing is charged today — you'll be charged the agreed total automatically once your
        session is marked complete.
      </p>
      <div className="space-y-2.5 mb-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          className="w-full h-10 px-3 rounded-lg border border-app bg-elevated text-app placeholder:text-subtle"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          className="w-full h-10 px-3 rounded-lg border border-app bg-elevated text-app placeholder:text-subtle"
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
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Link bank"}
        </Button>
      </div>
    </div>
  );
}

export default function BankOnFileStep(props: Props) {
  return (
    <Elements stripe={stripePromise}>
      <Inner {...props} />
    </Elements>
  );
}
