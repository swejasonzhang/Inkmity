import { useState } from "react";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { ShieldCheck, Loader2, CreditCard, Landmark } from "lucide-react";
import { createCardSetupIntent, createBankSetupIntent, type Booking } from "@/api";

type Props = {
  booking: Booking;
  onSaved: () => void;
  onCancel: () => void;
  artistName?: string;
};

type Method = "card" | "bank";

function Inner({ booking, onSaved, onCancel, artistName }: Props) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const stripe = useStripe();
  const elements = useElements();
  const [method, setMethod] = useState<Method>("card");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bookingId = (booking as any)._id;

  const saveCard = async () => {
    if (saving || !stripe || !elements) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      const { clientSecret } = await createCardSetupIntent(bookingId, token);
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

  const saveBank = async () => {
    if (saving || !stripe) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      const { clientSecret } = await createBankSetupIntent(bookingId, token);
      if (!clientSecret) throw new Error("Could not start bank setup");

      const name =
        user?.fullName ||
        [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
        "Client";
      const email = user?.primaryEmailAddress?.emailAddress || undefined;

      const collected = await stripe.collectBankAccountForSetup({
        clientSecret,
        params: {
          payment_method_type: "us_bank_account",
          payment_method_data: {
            billing_details: { name, ...(email ? { email } : {}) },
          },
        },
        expand: ["payment_method"],
      });

      if (collected.error) {
        const msg = collected.error.message || "Couldn't link your bank account";
        setError(msg);
        toast.error(msg);
        setSaving(false);
        return;
      }

      // User dismissed the bank-linking flow without selecting an account.
      if (collected.setupIntent?.status === "requires_payment_method") {
        setSaving(false);
        return;
      }

      if (collected.setupIntent?.status === "requires_confirmation") {
        const confirmed = await stripe.confirmUsBankAccountSetup(clientSecret);
        if (confirmed.error) {
          const msg = confirmed.error.message || "Couldn't confirm your bank account";
          setError(msg);
          toast.error(msg);
          setSaving(false);
          return;
        }
      }

      toast.success("Bank account linked — you'll be charged when your session is complete.");
      onSaved();
    } catch (err: any) {
      const msg = err?.body?.message || err?.message || "Couldn't link your bank account";
      setError(msg);
      toast.error(msg);
      setSaving(false);
    }
  };

  const tab = (m: Method, label: string, Icon: typeof CreditCard) => {
    const active = method === m;
    return (
      <button
        type="button"
        onClick={() => {
          if (saving) return;
          setError(null);
          setMethod(m);
        }}
        aria-pressed={active}
        className={`flex items-center justify-center gap-2 h-10 rounded-lg border text-sm font-semibold transition ${
          active
            ? "border-app bg-elevated text-app"
            : "border-app/40 text-subtle hover:text-app hover:border-app/70"
        }`}
      >
        <Icon className="h-4 w-4" /> {label}
      </button>
    );
  };

  return (
    <div className="w-full max-w-md mx-auto text-app">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="h-5 w-5" />
        <h3 className="font-bold text-lg">Save a payment method</h3>
      </div>
      <p className="text-sm text-subtle mb-4 leading-relaxed">
        Add a card or bank account to confirm your appointment{artistName ? ` with ${artistName}` : ""}. Nothing is
        charged today — you'll be charged the agreed total automatically once your session is marked complete.
      </p>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {tab("card", "Card", CreditCard)}
        {tab("bank", "Bank (ACH)", Landmark)}
      </div>

      {method === "card" ? (
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
      ) : (
        <div className="p-3.5 border border-app rounded-xl bg-elevated mb-3 text-sm text-subtle leading-relaxed">
          You'll securely connect your bank with Stripe. ACH bank payments have lower fees and are verified instantly.
        </div>
      )}

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
          onClick={method === "card" ? saveCard : saveBank}
          disabled={saving || !stripe}
          className="flex-1 h-10 rounded-lg font-semibold"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : method === "card" ? (
            "Save card"
          ) : (
            "Connect bank"
          )}
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
