import { useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "react-toastify";
import { Heart, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScrollLock } from "@/hooks/useScrollLock";
import { createTipCheckout } from "@/api";

type Props = {
  open: boolean;
  bookingId: string;
  artistName?: string;
  onClose: () => void;
};

const PRESETS = [1000, 2000, 4000, 6000];

export default function TipModal({ open, bookingId, artistName, onClose }: Props) {
  const { getToken } = useAuth();
  const [selected, setSelected] = useState<number | null>(2000);
  const [custom, setCustom] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useScrollLock(open);

  if (!open) return null;

  const customCents = Math.round(Number(custom) * 100);
  const tipCents = custom.trim() ? (Number.isFinite(customCents) ? customCents : 0) : selected ?? 0;
  const valid = tipCents >= 100;

  const submit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      const res = await createTipCheckout(bookingId, tipCents, token);
      if (res?.url) {
        window.location.href = res.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      toast.error(err?.body?.message || err?.body?.error || err?.message || "Couldn't start the tip");
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483646] grid place-items-center p-4 bg-black/60 backdrop-blur-sm ink-fade-in"
      onClick={() => !submitting && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-app bg-card p-6 text-app shadow-2xl"
        style={{ boxShadow: "0 24px 70px -20px rgba(0,0,0,0.7)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid place-items-center h-11 w-11 shrink-0 rounded-2xl border border-app/60 bg-elevated">
              <Heart className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h4 className="text-lg font-extrabold tracking-tight leading-tight">
                Tip {artistName || "your artist"}
              </h4>
              <p className="text-xs text-subtle">100% goes to your artist — Inkmity takes nothing.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            aria-label="Close"
            className="shrink-0 rounded-full p-1.5 text-subtle hover:text-app hover:bg-app/10 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((cents) => {
            const active = !custom.trim() && selected === cents;
            return (
              <button
                key={cents}
                type="button"
                onClick={() => { setSelected(cents); setCustom(""); }}
                className="h-12 rounded-xl border text-sm font-bold transition"
                style={{
                  borderColor: active ? "var(--fg)" : "var(--border)",
                  background: active ? "var(--fg)" : "var(--elevated)",
                  color: active ? "var(--bg)" : "var(--fg)",
                }}
              >
                ${(cents / 100).toFixed(0)}
              </button>
            );
          })}
        </div>

        <label className="mt-3 block">
          <span className="text-xs text-subtle">Custom amount</span>
          <div className="mt-1 flex items-center rounded-xl border border-app bg-elevated px-3">
            <span className="text-sm text-subtle">$</span>
            <input
              type="number"
              min="1"
              inputMode="decimal"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Other"
              className="w-full bg-transparent py-2.5 px-2 text-sm text-app outline-none"
            />
          </div>
        </label>

        <div className="mt-5 flex gap-2">
          <Button
            type="button"
            onClick={() => !submitting && onClose()}
            disabled={submitting}
            className="flex-1 bg-elevated border border-app text-app hover:bg-elevated/70 h-11 rounded-xl"
          >
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={!valid || submitting} className="flex-1 h-11 rounded-xl font-semibold">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : `Tip $${(tipCents / 100).toFixed(2)}`}
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-subtle text-center">
          You'll be taken to a secure Stripe page to complete your tip.
        </p>
      </div>
    </div>,
    document.body
  );
}
