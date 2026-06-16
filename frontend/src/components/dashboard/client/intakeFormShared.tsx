import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { IntakeForm } from "@/api";

export type FormState = {
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

export const EMPTY_INTAKE: FormState = {
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

export const REQUIRED_CONSENT: (keyof FormState)[] = [
  "ageVerification",
  "healthDisclosure",
  "aftercareInstructions",
  "depositPolicy",
  "cancellationPolicy",
];

export function intakeIsComplete(form: FormState): boolean {
  return REQUIRED_CONSENT.every((k) => form[k] === true);
}

export function fromIntake(d: IntakeForm): FormState {
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

export function toPayload(f: FormState): Partial<IntakeForm> {
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

export function IntakeFields({
  form,
  set,
}: {
  form: FormState;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
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
  );
}
