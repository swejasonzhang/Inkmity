import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "react-toastify";
import { ClipboardList, Loader2, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useScrollLock } from "@/hooks/useScrollLock";
import { getIntakeForm, submitIntakeForm, type IntakeForm } from "@/api";

type Props = {
  bookingId: string;
  isClient: boolean;
};

type FormState = {
  allergies: string;
  medications: string;
  medicalConditions: string;
  skinConditions: string;
  bloodThinners: boolean;
  pregnant: boolean;
  recentSurgery: boolean;
  recentSurgeryDetails: string;
  placement: string;
  size: string;
  style: string;
  description: string;
  isCoverUp: boolean;
  isTouchUp: boolean;
  ageVerification: boolean;
  healthDisclosure: boolean;
  aftercareInstructions: boolean;
  photoRelease: boolean;
  depositPolicy: boolean;
  cancellationPolicy: boolean;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelationship: string;
  additionalNotes: string;
};

const EMPTY: FormState = {
  allergies: "",
  medications: "",
  medicalConditions: "",
  skinConditions: "",
  bloodThinners: false,
  pregnant: false,
  recentSurgery: false,
  recentSurgeryDetails: "",
  placement: "",
  size: "",
  style: "",
  description: "",
  isCoverUp: false,
  isTouchUp: false,
  ageVerification: false,
  healthDisclosure: false,
  aftercareInstructions: false,
  photoRelease: false,
  depositPolicy: false,
  cancellationPolicy: false,
  emergencyName: "",
  emergencyPhone: "",
  emergencyRelationship: "",
  additionalNotes: "",
};

function fromIntake(d: IntakeForm): FormState {
  return {
    allergies: d.healthInfo?.allergies ?? "",
    medications: d.healthInfo?.medications ?? "",
    medicalConditions: d.healthInfo?.medicalConditions ?? "",
    skinConditions: d.healthInfo?.skinConditions ?? "",
    bloodThinners: !!d.healthInfo?.bloodThinners,
    pregnant: !!d.healthInfo?.pregnant,
    recentSurgery: !!d.healthInfo?.recentSurgery,
    recentSurgeryDetails: d.healthInfo?.recentSurgeryDetails ?? "",
    placement: d.tattooDetails?.placement ?? "",
    size: d.tattooDetails?.size ?? "",
    style: d.tattooDetails?.style ?? "",
    description: d.tattooDetails?.description ?? "",
    isCoverUp: !!d.tattooDetails?.isCoverUp,
    isTouchUp: !!d.tattooDetails?.isTouchUp,
    ageVerification: !!d.consent?.ageVerification,
    healthDisclosure: !!d.consent?.healthDisclosure,
    aftercareInstructions: !!d.consent?.aftercareInstructions,
    photoRelease: !!d.consent?.photoRelease,
    depositPolicy: !!d.consent?.depositPolicy,
    cancellationPolicy: !!d.consent?.cancellationPolicy,
    emergencyName: d.emergencyContact?.name ?? "",
    emergencyPhone: d.emergencyContact?.phone ?? "",
    emergencyRelationship: d.emergencyContact?.relationship ?? "",
    additionalNotes: d.additionalNotes ?? "",
  };
}

function toPayload(f: FormState): Partial<IntakeForm> {
  return {
    healthInfo: {
      allergies: f.allergies.trim() || undefined,
      medications: f.medications.trim() || undefined,
      medicalConditions: f.medicalConditions.trim() || undefined,
      skinConditions: f.skinConditions.trim() || undefined,
      bloodThinners: f.bloodThinners,
      pregnant: f.pregnant,
      recentSurgery: f.recentSurgery,
      recentSurgeryDetails: f.recentSurgery ? f.recentSurgeryDetails.trim() || undefined : undefined,
    },
    tattooDetails: {
      placement: f.placement.trim() || undefined,
      size: f.size.trim() || undefined,
      style: f.style.trim() || undefined,
      description: f.description.trim() || undefined,
      isCoverUp: f.isCoverUp,
      isTouchUp: f.isTouchUp,
    },
    consent: {
      ageVerification: f.ageVerification,
      healthDisclosure: f.healthDisclosure,
      aftercareInstructions: f.aftercareInstructions,
      photoRelease: f.photoRelease,
      depositPolicy: f.depositPolicy,
      cancellationPolicy: f.cancellationPolicy,
    },
    emergencyContact: {
      name: f.emergencyName.trim() || undefined,
      phone: f.emergencyPhone.trim() || undefined,
      relationship: f.emergencyRelationship.trim() || undefined,
    },
    additionalNotes: f.additionalNotes.trim() || undefined,
  };
}

const REQUIRED_CONSENT: (keyof FormState)[] = [
  "ageVerification",
  "healthDisclosure",
  "aftercareInstructions",
  "depositPolicy",
  "cancellationPolicy",
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <h5 className="text-xs font-bold uppercase tracking-wide text-subtle">{title}</h5>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-subtle">{label}</span>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--fg)]"
      />
      <span className="leading-snug">{label}</span>
    </label>
  );
}

export default function IntakeFormPanel({ bookingId, isClient }: Props) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  useScrollLock(open);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const existing = await getIntakeForm(bookingId, token);
      if (existing) {
        setSubmittedAt(existing.submittedAt ?? null);
        setForm(fromIntake(existing));
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [bookingId, getToken]);

  useEffect(() => {
    if (!isClient) {
      setLoading(false);
      return;
    }
    load();
  }, [isClient, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !saving && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, saving]);

  if (!isClient || loading) return null;

  const canSubmit = REQUIRED_CONSENT.every((k) => form[k] === true) && !saving;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const token = await getToken();
      const saved = await submitIntakeForm(bookingId, toPayload(form), token);
      setSubmittedAt(saved?.submittedAt ?? new Date().toISOString());
      toast.success("Intake form submitted.");
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.body?.message || err?.message || "Couldn't submit your intake form");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-2 border-t" style={{ borderColor: "color-mix(in srgb, var(--border) 50%, transparent)" }}>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="w-full h-9 text-sm font-medium"
        style={{ borderColor: "var(--border)", color: "var(--fg)", background: "var(--card)" }}
      >
        {submittedAt ? (
          <>
            <CheckCircle2 className="h-4 w-4 mr-2" /> Intake form submitted — edit
          </>
        ) : (
          <>
            <ClipboardList className="h-4 w-4 mr-2" /> Complete intake form
          </>
        )}
      </Button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[2147483600] grid place-items-center p-4 bg-black/60 backdrop-blur-sm ink-fade-in"
            onClick={() => !saving && setOpen(false)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto ink-page-scroll rounded-3xl border border-app bg-card p-6 text-app shadow-2xl"
              style={{ boxShadow: "0 24px 70px -20px rgba(0,0,0,0.7)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="grid place-items-center h-11 w-11 shrink-0 rounded-2xl border border-app/60 bg-elevated">
                    <ClipboardList className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-lg font-extrabold tracking-tight leading-tight">Pre-appointment intake</h4>
                    <p className="text-xs text-subtle">Helps your artist prepare and keeps your session safe.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !saving && setOpen(false)}
                  aria-label="Close"
                  className="shrink-0 rounded-full p-1.5 text-subtle hover:text-app hover:bg-app/10 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-6">
                <Section title="Health">
                  <Field label="Allergies" value={form.allergies} onChange={(v) => set("allergies", v)} placeholder="e.g. latex, lidocaine" />
                  <Field label="Current medications" value={form.medications} onChange={(v) => set("medications", v)} />
                  <Field label="Medical conditions" value={form.medicalConditions} onChange={(v) => set("medicalConditions", v)} />
                  <Field label="Skin conditions" value={form.skinConditions} onChange={(v) => set("skinConditions", v)} placeholder="e.g. eczema, psoriasis" />
                  <div className="space-y-2 pt-1">
                    <Check label="I take blood thinners" checked={form.bloodThinners} onChange={(v) => set("bloodThinners", v)} />
                    <Check label="I am pregnant or nursing" checked={form.pregnant} onChange={(v) => set("pregnant", v)} />
                    <Check label="I've had recent surgery" checked={form.recentSurgery} onChange={(v) => set("recentSurgery", v)} />
                  </div>
                  {form.recentSurgery && (
                    <Field label="Recent surgery details" value={form.recentSurgeryDetails} onChange={(v) => set("recentSurgeryDetails", v)} />
                  )}
                </Section>

                <Section title="Tattoo details">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Placement" value={form.placement} onChange={(v) => set("placement", v)} placeholder="e.g. forearm" />
                    <Field label="Size" value={form.size} onChange={(v) => set("size", v)} placeholder="e.g. 4 in" />
                  </div>
                  <Field label="Style" value={form.style} onChange={(v) => set("style", v)} placeholder="e.g. fine line" />
                  <label className="block space-y-1">
                    <span className="text-xs text-subtle">Description</span>
                    <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} />
                  </label>
                  <div className="space-y-2 pt-1">
                    <Check label="This is a cover-up" checked={form.isCoverUp} onChange={(v) => set("isCoverUp", v)} />
                    <Check label="This is a touch-up" checked={form.isTouchUp} onChange={(v) => set("isTouchUp", v)} />
                  </div>
                </Section>

                <Section title="Emergency contact">
                  <Field label="Name" value={form.emergencyName} onChange={(v) => set("emergencyName", v)} />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Phone" value={form.emergencyPhone} onChange={(v) => set("emergencyPhone", v)} />
                    <Field label="Relationship" value={form.emergencyRelationship} onChange={(v) => set("emergencyRelationship", v)} />
                  </div>
                </Section>

                <Section title="Consent">
                  <Check label="I confirm I am 18 or older." checked={form.ageVerification} onChange={(v) => set("ageVerification", v)} />
                  <Check label="My health information above is accurate and complete." checked={form.healthDisclosure} onChange={(v) => set("healthDisclosure", v)} />
                  <Check label="I have read and will follow the aftercare instructions." checked={form.aftercareInstructions} onChange={(v) => set("aftercareInstructions", v)} />
                  <Check label="I understand and agree to the deposit policy." checked={form.depositPolicy} onChange={(v) => set("depositPolicy", v)} />
                  <Check label="I understand and agree to the cancellation policy." checked={form.cancellationPolicy} onChange={(v) => set("cancellationPolicy", v)} />
                  <Check label="I allow my artist to photograph the work (optional)." checked={form.photoRelease} onChange={(v) => set("photoRelease", v)} />
                </Section>

                <Section title="Anything else">
                  <Textarea value={form.additionalNotes} onChange={(e) => set("additionalNotes", e.target.value)} rows={2} placeholder="Optional notes for your artist" />
                </Section>
              </div>

              <div className="mt-6 flex gap-2">
                <Button
                  type="button"
                  onClick={() => !saving && setOpen(false)}
                  disabled={saving}
                  className="flex-1 bg-elevated border border-app text-app hover:bg-elevated/70 h-11 rounded-xl"
                >
                  Cancel
                </Button>
                <Button type="button" onClick={submit} disabled={!canSubmit} className="flex-1 h-11 rounded-xl font-semibold">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit intake"}
                </Button>
              </div>
              {!canSubmit && !saving && (
                <p className="mt-2 text-[11px] text-subtle text-center">All consent boxes (except photo) are required to submit.</p>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
