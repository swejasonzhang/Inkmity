import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe";
import { useAuth, useUser } from "@clerk/clerk-react";
import { toast } from "react-toastify";
import { CreditCard, Landmark, Trash2, Plus, Loader2, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createClientSetupIntent,
  listClientPaymentMethods,
  deleteClientPaymentMethod,
  type SavedPaymentMethod,
} from "@/api";

type Method = "card" | "bank";

function brandLabel(m: SavedPaymentMethod) {
  if (m.type === "us_bank_account") return m.bankName || "Bank account";
  return (m.brand || "card").replace(/^\w/, (c) => c.toUpperCase());
}

function Inner() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const stripe = useStripe();
  const elements = useElements();

  const [methods, setMethods] = useState<SavedPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [method, setMethod] = useState<Method>("card");
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [name, setName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.primaryEmailAddress?.emailAddress || "");

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await listClientPaymentMethods(token);
      setMethods(res?.methods ?? []);
    } catch {
      setMethods([]);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && setModalOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen, busy]);

  const openModal = (m: Method) => {
    setMethod(m);
    setModalOpen(true);
  };

  const saveCard = async () => {
    if (!stripe || !elements) return;
    const token = await getToken();
    const { clientSecret } = await createClientSetupIntent("card", token);
    const card = elements.getElement(CardElement);
    if (!clientSecret || !card) throw new Error("Could not start card setup");
    const { error } = await stripe.confirmCardSetup(clientSecret, { payment_method: { card } });
    if (error) throw new Error(error.message || "Couldn't save your card");
    toast.success("Card saved.");
  };

  const linkBank = async () => {
    if (!stripe) return;
    if (!name.trim() || !email.trim()) throw new Error("Enter your name and email to link a bank account.");
    const token = await getToken();
    const { clientSecret } = await createClientSetupIntent("bank", token);
    if (!clientSecret) throw new Error("Could not start bank setup");
    const collected = await stripe.collectBankAccountForSetup({
      clientSecret,
      params: {
        payment_method_type: "us_bank_account",
        payment_method_data: { billing_details: { name: name.trim(), email: email.trim() } },
      },
      expand: ["payment_method"],
    });
    if (collected.error) throw new Error(collected.error.message || "Couldn't link your bank");
    const confirmed = await stripe.confirmUsBankAccountSetup(clientSecret);
    if (confirmed.error) throw new Error(confirmed.error.message || "Couldn't confirm your bank");
    if (confirmed.setupIntent?.status === "requires_action") {
      toast.info("Check your bank for two small deposits, then verify to finish.");
    } else {
      toast.success("Bank account linked.");
    }
  };

  const submit = async () => {
    if (busy || !stripe) return;
    setBusy(true);
    try {
      if (method === "card") await saveCard();
      else await linkBank();
      setModalOpen(false);
      await load();
    } catch (err: any) {
      toast.error(err?.body?.message || err?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setRemovingId(id);
    try {
      const token = await getToken();
      await deleteClientPaymentMethod(id, token);
      await load();
    } catch {
      toast.error("Couldn't remove that — try again.");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div
      className="rounded-2xl ink-frame p-5 border backdrop-blur-sm w-full"
      style={{ background: "color-mix(in srgb, var(--card) 80%, transparent)", borderColor: "var(--border)" }}
    >
      <h3 className="ink-flash-title text-xs mb-4 text-center w-full" style={{ color: "var(--fg)" }}>
        Payment Methods
      </h3>

      {loading ? (
        <div className="ink-shimmer h-16 w-full rounded-xl" aria-hidden />
      ) : methods.length === 0 ? (
        <p className="text-xs text-center mb-4" style={{ color: "color-mix(in srgb, var(--fg) 50%, transparent)" }}>
          No card or bank account linked yet. You'll be charged automatically once a session is complete.
        </p>
      ) : (
        <ul className="space-y-2 mb-4">
          {methods.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
              style={{ borderColor: "var(--border)", background: "var(--elevated)" }}
            >
              <span className="grid place-items-center h-9 w-9 shrink-0 rounded-lg border border-app/50 bg-card">
                {m.type === "card" ? <CreditCard className="h-4 w-4" /> : <Landmark className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1 text-left">
                <div className="text-sm font-semibold text-app flex items-center gap-2">
                  {brandLabel(m)} •••• {m.last4}
                  {m.isDefault && (
                    <span className="text-[10px] font-bold uppercase tracking-wide rounded-full border border-app/50 px-1.5 py-0.5 text-subtle">
                      Default
                    </span>
                  )}
                </div>
                {m.type === "card" && m.expMonth && m.expYear ? (
                  <div className="text-[11px] text-subtle">
                    Expires {String(m.expMonth).padStart(2, "0")}/{String(m.expYear).slice(-2)}
                  </div>
                ) : (
                  <div className="text-[11px] text-subtle">{m.type === "card" ? "Card on file" : "Bank account (ACH)"}</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(m.id)}
                disabled={removingId === m.id}
                aria-label="Remove payment method"
                className="shrink-0 rounded-full p-1.5 text-subtle hover:text-app hover:bg-app/10 transition disabled:opacity-50"
              >
                {removingId === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          onClick={() => openModal("card")}
          size="sm"
          variant="outline"
          className="flex-1 border-[color:var(--border)] hover:bg-[color:var(--elevated)]"
        >
          <Plus className="h-4 w-4 mr-2" /> Add card
        </Button>
        <Button
          type="button"
          onClick={() => openModal("bank")}
          size="sm"
          variant="outline"
          className="flex-1 border-[color:var(--border)] hover:bg-[color:var(--elevated)]"
        >
          <Landmark className="h-4 w-4 mr-2" /> Link bank account
        </Button>
      </div>

      {modalOpen && createPortal(
        <div
          className="fixed inset-0 z-[2147483600] grid place-items-center p-4 bg-black/60 backdrop-blur-sm ink-fade-in"
          onClick={() => !busy && setModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-3xl border border-app bg-card p-6 text-app shadow-2xl"
            style={{ boxShadow: "0 24px 70px -20px rgba(0,0,0,0.7)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-3 min-w-0">
                <span className="grid place-items-center h-11 w-11 shrink-0 rounded-2xl border border-app/60 bg-elevated">
                  {method === "card" ? <CreditCard className="h-5 w-5" /> : <Landmark className="h-5 w-5" />}
                </span>
                <div className="min-w-0">
                  <h4 className="text-lg font-extrabold tracking-tight leading-tight">
                    {method === "card" ? "Add a card" : "Link a bank account"}
                  </h4>
                  <p className="text-xs text-subtle">Nothing is charged until a session is complete.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !busy && setModalOpen(false)}
                aria-label="Close"
                className="shrink-0 rounded-full p-1.5 text-subtle hover:text-app hover:bg-app/10 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-app/60 bg-elevated p-1">
              {(["card", "bank"] as Method[]).map((m) => {
                const active = method === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    aria-pressed={active}
                    className={`inline-flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-semibold transition ${
                      active ? "bg-[color:var(--fg)] text-[color:var(--bg)]" : "text-subtle hover:text-app"
                    }`}
                  >
                    {m === "card" ? <CreditCard className="h-4 w-4" /> : <Landmark className="h-4 w-4" />}
                    {m === "card" ? "Card" : "Bank"}
                  </button>
                );
              })}
            </div>

            {method === "card" ? (
              <div className="rounded-2xl border border-app bg-white px-4 py-4">
                <CardElement
                  options={{
                    style: {
                      base: { fontSize: "16px", color: "#1a1a1a", fontFamily: "inherit", "::placeholder": { color: "#9aa0a6" } },
                      invalid: { color: "#c0392b" },
                    },
                  }}
                />
              </div>
            ) : (
              <div className="space-y-2.5">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="w-full h-11 px-3.5 rounded-xl border border-app bg-elevated text-app placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-[color:var(--fg)]/20"
                />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  type="email"
                  className="w-full h-11 px-3.5 rounded-xl border border-app bg-elevated text-app placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-[color:var(--fg)]/20"
                />
                <p className="text-[11px] text-subtle leading-relaxed px-0.5">
                  You'll log in to your bank securely through Stripe to confirm the account.
                </p>
              </div>
            )}

            <div className="mt-4 flex items-center gap-1.5 text-[11px] text-subtle">
              <Lock className="h-3.5 w-3.5" /> Encrypted and stored by Stripe — Inkmity never sees your details.
            </div>

            <Button
              type="button"
              onClick={submit}
              disabled={busy || !stripe}
              className="mt-5 w-full h-11 rounded-xl font-semibold"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : method === "card" ? (
                "Save card"
              ) : (
                "Link bank account"
              )}
            </Button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default function PaymentMethods() {
  return (
    <Elements stripe={stripePromise}>
      <Inner />
    </Elements>
  );
}
