import { useState, useEffect, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Wallet, Percent, DollarSign, ShieldCheck, Clock, Gift, Building2 } from "lucide-react";
import { updateArtistPolicy, getArtistPolicy, type ArtistPolicy } from "@/api";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "react-toastify";

type Props = {
  artistId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const SAMPLE_CENTS = 40000;

function fmtMoney(cents: number) {
  return `$${(Math.max(0, cents) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function DepositPolicyModal({ artistId, open, onClose, onSuccess }: Props) {
  const { getToken } = useAuth();

  const [loading, setLoading] = useState(false);
  const [policy, setPolicy] = useState<NonNullable<ArtistPolicy["deposit"]>>({
    mode: "percent",
    percent: 0.2,
    amountCents: 5000,
    minCents: 5000,
    maxCents: 30000,
    nonRefundable: true,
    cutoffHours: 48,
    consultationFree: true,
  });

  const loadPolicy = useCallback(async () => {
    try {
      const current = await getArtistPolicy(artistId);
      if (current?.deposit) {
        const d = current.deposit as NonNullable<ArtistPolicy["deposit"]>;
        setPolicy((p) => ({
          ...p,
          ...d,
          minCents: Number(d.minCents) > 0 ? Number(d.minCents) : p.minCents,
          maxCents: Number(d.maxCents) > 0 ? Number(d.maxCents) : p.maxCents,
        }));
      }
    } catch (err) {
      console.error("Failed to load policy:", err);
    }
  }, [artistId]);

  useEffect(() => {
    if (open) loadPolicy();
  }, [open, loadPolicy]);

  const set = (patch: Partial<NonNullable<ArtistPolicy["deposit"]>>) => setPolicy((p) => ({ ...p, ...patch }));

  const depositConfigured =
    (policy.mode === "flat" && (policy.amountCents ?? 0) > 0) ||
    (policy.mode === "percent" && (policy.percent ?? 0) > 0 && (policy.minCents ?? 0) > 0);

  const previewCents = useMemo(() => {
    if (policy.mode === "flat") return policy.amountCents ?? 0;
    const raw = Math.round(SAMPLE_CENTS * (policy.percent ?? 0));
    const min = policy.minCents ?? 0;
    const max = policy.maxCents ?? Number.MAX_SAFE_INTEGER;
    return Math.min(Math.max(raw, min), max);
  }, [policy]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      await updateArtistPolicy(artistId, policy, undefined, token);
      toast.success("Deposit policy saved");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save deposit policy");
    } finally {
      setLoading(false);
    }
  };

  const MoneyInput = ({ value, onChange, placeholder }: { value: number | undefined; onChange: (cents: number) => void; placeholder?: string }) => (
    <div className="relative">
      <DollarSign className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
      <input
        type="number"
        min={0}
        step={1}
        inputMode="decimal"
        placeholder={placeholder}
        value={value ? value / 100 : ""}
        onChange={(e) => onChange(Math.max(0, Math.round((parseFloat(e.target.value) || 0) * 100)))}
        className="h-10 w-full rounded-xl border bg-transparent pl-8 pr-3 text-center font-medium outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--fg)]/30"
        style={{ borderColor: "var(--border)", color: "var(--fg)" }}
      />
    </div>
  );

  const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-center gap-2 text-center">
        <label className="text-xs font-semibold">{label}</label>
        {hint && <span className="text-[11px] opacity-50">{hint}</span>}
      </div>
      {children}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-md p-0 overflow-hidden gap-0 rounded-2xl flex flex-col"
        style={{ background: "var(--card)", color: "var(--fg)", borderColor: "var(--border)", maxHeight: "90dvh" }}
      >
        <DialogHeader className="shrink-0 space-y-2 px-5 pt-5 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-center gap-2.5">
            <span className="grid place-items-center h-9 w-9 rounded-xl" style={{ background: "var(--elevated)", border: "1px solid var(--border)" }}>
              <Wallet className="h-4 w-4" />
            </span>
            <DialogTitle className="text-base font-bold">Deposit policy</DialogTitle>
          </div>
          <DialogDescription className="text-xs opacity-60 text-center">
            Clients pay this up front to confirm a booking. Set it before offering appointments.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          {}
          <div className="grid grid-cols-2 gap-1 rounded-xl p-1" style={{ background: "var(--elevated)" }}>
            {([
              { key: "percent", label: "Percentage", Icon: Percent },
              { key: "flat", label: "Flat fee", Icon: DollarSign },
            ] as const).map(({ key, label, Icon }) => {
              const active = policy.mode === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => set({ mode: key })}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition"
                  style={{
                    background: active ? "var(--fg)" : "transparent",
                    color: active ? "var(--bg)" : "var(--fg)",
                  }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>

          {policy.mode === "percent" ? (
            <>
              <Field label="Deposit percentage" hint={`${Math.round((policy.percent ?? 0) * 100)}% of the price`}>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[Math.round((policy.percent ?? 0) * 100)]}
                    min={0}
                    max={50}
                    step={1}
                    onValueChange={([v]) => set({ percent: Math.min(0.5, Math.max(0, v / 100)) })}
                    className="flex-1"
                  />
                  <div className="relative w-20 shrink-0">
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={Math.round((policy.percent ?? 0) * 100)}
                      onChange={(e) => set({ percent: Math.min(0.5, Math.max(0, (parseFloat(e.target.value) || 0) / 100)) })}
                      className="h-10 w-full rounded-xl border bg-transparent pl-3 pr-7 text-center font-medium outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--fg)]/30"
                      style={{ borderColor: "var(--border)", color: "var(--fg)" }}
                    />
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm opacity-50">%</span>
                  </div>
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Minimum" hint="floor">
                  <MoneyInput value={policy.minCents} onChange={(c) => set({ minCents: c })} placeholder="50" />
                </Field>
                <Field label="Maximum" hint="cap">
                  <MoneyInput value={policy.maxCents} onChange={(c) => set({ maxCents: c })} placeholder="300" />
                </Field>
              </div>
            </>
          ) : (
            <Field label="Flat deposit amount">
              <MoneyInput value={policy.amountCents} onChange={(c) => set({ amountCents: c })} placeholder="100" />
            </Field>
          )}

          {}
          <div className="rounded-xl border px-4 py-3 text-center" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="h-4 w-4 opacity-70" />
              <span className="text-sm font-semibold">Non-refundable deposit</span>
              <Switch checked={!!policy.nonRefundable} onCheckedChange={(v) => set({ nonRefundable: v })} />
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed opacity-55">
              {policy.nonRefundable
                ? "The deposit is kept if the client cancels or reschedules inside the cutoff window below."
                : "The deposit is fully refunded if the client cancels."}
            </p>
          </div>

          {}
          <div className="rounded-xl border px-4 py-3 text-center" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-center gap-2">
              <Gift className="h-4 w-4 opacity-70" />
              <span className="text-sm font-semibold">Free consultations</span>
              <Switch checked={policy.consultationFree ?? true} onCheckedChange={(v) => set({ consultationFree: v })} />
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed opacity-55">
              {(policy.consultationFree ?? true)
                ? "Clients can book a consultation with you at no charge."
                : "Consultations require the deposit above, just like tattoo sessions."}
            </p>
          </div>

          {}
          <Field label="Cancellation cutoff" hint="hours before the appointment">
            <div className="relative">
              <Clock className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
              <input
                type="number"
                min={0}
                step={1}
                value={policy.cutoffHours ?? 0}
                onChange={(e) => set({ cutoffHours: Math.max(0, Math.round(parseFloat(e.target.value) || 0)) })}
                className="h-10 w-full rounded-xl border bg-transparent pl-8 pr-12 text-center font-medium outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--fg)]/30"
                style={{ borderColor: "var(--border)", color: "var(--fg)" }}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-50">hrs</span>
            </div>
          </Field>

          {}
          <div className="rounded-xl border px-4 py-3 text-center" style={{ borderColor: "var(--border)", background: "var(--elevated)" }}>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-xs opacity-60">On a {fmtMoney(SAMPLE_CENTS)} session</span>
              <span className="text-2xl font-bold">{fmtMoney(previewCents)}</span>
            </div>
            <div className="mt-1 text-[11px] opacity-55 text-center">
              {policy.mode === "percent"
                ? `${Math.round((policy.percent ?? 0) * 100)}% deposit, ${fmtMoney(policy.minCents ?? 0)}–${fmtMoney(policy.maxCents ?? 0)} range`
                : "Flat deposit on every booking"}
            </div>
          </div>

          {!depositConfigured && (
            <p className="text-xs font-medium opacity-70 text-center">
              Set a {policy.mode === "percent" ? "percentage and minimum" : "flat amount"} to enable appointments.
            </p>
          )}

          {}
          <div className="flex items-start gap-2 rounded-xl border px-3.5 py-3 text-left" style={{ borderColor: "var(--border)" }}>
            <Building2 className="h-4 w-4 mt-0.5 opacity-70 shrink-0" />
            <p className="text-[11px] leading-relaxed opacity-65">
              Deposits only hold the booking — the remaining balance is paid directly with you at the studio.
              By saving, you confirm you're allowed to accept platform deposits under your studio's agreement.
            </p>
          </div>
        </div>

        <DialogFooter className="shrink-0 px-5 py-4 border-t gap-2 sm:justify-center" style={{ borderColor: "var(--border)" }}>
          <Button variant="outline" onClick={onClose} disabled={loading} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading} className="rounded-xl">
            {loading ? "Saving…" : "Save policy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
