import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Stripe, StripeElements } from "@stripe/stripe-js";
import { stripePromise } from "@/lib/stripe";
import { useAuth } from "@clerk/clerk-react";
import { useTheme } from "@/hooks/useTheme";
import { useScrollLock } from "@/hooks/useScrollLock";
import { toast } from "react-toastify";
import { CreditCard, Landmark, Trash2, Plus, Loader2, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createClientSetupIntent,
  listClientPaymentMethods,
  deleteClientPaymentMethod,
  type SavedPaymentMethod,
} from "@/api";

function brandLabel(m: SavedPaymentMethod) {
  if (m.type === "us_bank_account") return m.bankName || "Bank account";
  return (m.brand || "card").replace(/^\w/, (c) => c.toUpperCase());
}

function Shimmer({ className }: { className?: string }) {
  return <div className={`ink-shimmer rounded-lg ${className || ""}`} aria-hidden />;
}

function Field({ labelW }: { labelW: string }) {
  return (
    <div className="space-y-1.5">
      <Shimmer className={`h-3 ${labelW}`} />
      <Shimmer className="h-[44px] w-full" />
    </div>
  );
}

function PaymentElementSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Shimmer key={i} className="h-[58px]" />
        ))}
      </div>
      <Shimmer className="h-5 w-56" />
      <Field labelW="w-24" />
      <div className="grid grid-cols-2 gap-3">
        <Field labelW="w-24" />
        <Field labelW="w-24" />
      </div>
      <Field labelW="w-16" />
      <Field labelW="w-16" />
      <div className="space-y-1.5 pt-1">
        <Shimmer className="h-2.5 w-full" />
        <Shimmer className="h-2.5 w-full" />
        <Shimmer className="h-2.5 w-2/3" />
      </div>
      <div className="rounded-xl border border-app/40 p-3.5 space-y-3">
        <Shimmer className="h-4 w-16" />
        <Shimmer className="h-4 w-2/3" />
        <Field labelW="w-12" />
        <Field labelW="w-24" />
      </div>
    </div>
  );
}

function AddPaymentForm({
  clientSecret,
  appearanceTheme,
  onSaved,
  onCancel,
}: {
  clientSecret: string | null;
  appearanceTheme: "stripe" | "night";
  onSaved: () => void;
  onCancel: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [measuredHeight, setMeasuredHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!clientSecret) return;
    let active = true;
    let ro: ResizeObserver | null = null;
    let settle: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      const stripe = await stripePromise;
      if (!stripe || !active || !containerRef.current) return;

      const cs = getComputedStyle(document.documentElement);
      const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
      const isLight = appearanceTheme === "stripe";
      const fg = v("--fg", isLight ? "#111111" : "#f5f5f5");
      const surface = v("--elevated", v("--card", isLight ? "#ffffff" : "#161616"));
      const border = v("--border", isLight ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.16)");
      const muted = v("--subtle", isLight ? "#6b7280" : "#a1a1aa");

      const appearance = {
        theme: appearanceTheme,
        variables: {
          colorPrimary: fg,
          colorBackground: surface,
          colorText: fg,
          colorTextSecondary: muted,
          colorDanger: "#ef4444",
          fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
          borderRadius: "12px",
          fontSizeBase: "15px",
        },
        rules: {
          ".Tab": { border: `1px solid ${border}`, backgroundColor: surface, boxShadow: "none" },
          ".Tab:hover": { color: fg },
          ".Tab--selected": { borderColor: fg, backgroundColor: surface, color: fg, boxShadow: "none" },
          ".TabIcon--selected": { fill: fg, color: fg },
          ".TabLabel--selected": { color: fg },
          ".Input": { border: `1px solid ${border}`, backgroundColor: surface, boxShadow: "none" },
          ".Input:focus": { border: `1px solid ${fg}`, boxShadow: "none" },
          ".Label": { color: muted },
          ".Block": { backgroundColor: surface, border: `1px solid ${border}` },
        },
      } as const;

      const elements = stripe.elements({
        clientSecret,
        appearance,
        loader: "never",
        fonts: [{ cssSrc: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" }],
      });
      const paymentEl = elements.create("payment", { layout: "tabs" });
      paymentEl.mount(containerRef.current);
      stripeRef.current = stripe;
      elementsRef.current = elements;

      ro = new ResizeObserver(() => {
        if (!active || !containerRef.current) return;
        setMeasuredHeight(containerRef.current.offsetHeight);
        clearTimeout(settle);
        settle = setTimeout(() => {
          if (active) setReady(true);
        }, 1000);
      });
      ro.observe(containerRef.current);
    })();
    return () => {
      active = false;
      clearTimeout(settle);
      ro?.disconnect();
    };
  }, [clientSecret, appearanceTheme]);

  const submit = async () => {
    const stripe = stripeRef.current;
    const elements = elementsRef.current;
    if (busy || !stripe || !elements) return;
    setBusy(true);
    try {
      const { error } = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
        confirmParams: { return_url: window.location.href },
      });
      if (error) {
        toast.error(error.message || "Couldn't save that payment method");
        setBusy(false);
        return;
      }
      toast.success("Payment method saved.");
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div
        className="relative overflow-hidden"
        style={{
          height: ready ? undefined : measuredHeight,
          transition: "height 450ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div
          ref={containerRef}
          className={ready ? "" : "absolute top-0 left-0 right-0 opacity-0 pointer-events-none"}
          aria-hidden={!ready}
        />
        {!ready && <PaymentElementSkeleton />}
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-[11px] text-subtle">
        <Lock className="h-3.5 w-3.5" /> Encrypted and stored by Stripe — Inkmity never sees your details.
      </div>

      <div className="mt-5 flex gap-2">
        <Button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex-1 bg-elevated border border-app text-app hover:bg-elevated/70 h-11 rounded-xl"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={submit}
          disabled={busy}
          className="flex-1 h-11 rounded-xl font-semibold"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save payment method"}
        </Button>
      </div>
    </div>
  );
}

export default function PaymentMethods() {
  const { getToken } = useAuth();
  const { theme } = useTheme();

  const [methods, setMethods] = useState<SavedPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useScrollLock(modalOpen);

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
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setModalOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  const openModal = async () => {
    setModalOpen(true);
    setClientSecret(null);
    try {
      const token = await getToken();
      const res = await createClientSetupIntent(token);
      if (!res?.clientSecret) throw new Error("no secret");
      setClientSecret(res.clientSecret);
    } catch {
      toast.error("Couldn't start — try again.");
      setModalOpen(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setClientSecret(null);
  };

  const onSaved = async () => {
    closeModal();
    await load();
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
          No payment method linked yet. You'll be charged automatically once a session is complete.
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

      <Button
        type="button"
        onClick={openModal}
        size="sm"
        variant="outline"
        className="w-full border-[color:var(--border)] hover:bg-[color:var(--elevated)]"
      >
        <Plus className="h-4 w-4 mr-2" /> Add payment method
      </Button>

      {modalOpen && createPortal(
        <div
          className="fixed inset-0 z-[2147483600] grid place-items-center p-4 bg-black/60 backdrop-blur-sm ink-fade-in"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto ink-page-scroll rounded-3xl border border-app bg-card p-6 text-app shadow-2xl"
            style={{ boxShadow: "0 24px 70px -20px rgba(0,0,0,0.7)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-3 min-w-0">
                <span className="grid place-items-center h-11 w-11 shrink-0 rounded-2xl border border-app/60 bg-elevated">
                  <CreditCard className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h4 className="text-lg font-extrabold tracking-tight leading-tight">Add a payment method</h4>
                  <p className="text-xs text-subtle">Card or bank — nothing is charged until a session is complete.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
                className="shrink-0 rounded-full p-1.5 text-subtle hover:text-app hover:bg-app/10 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <AddPaymentForm
              clientSecret={clientSecret}
              appearanceTheme={theme === "light" ? "stripe" : "night"}
              onSaved={onSaved}
              onCancel={closeModal}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
