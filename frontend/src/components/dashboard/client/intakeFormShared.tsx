import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "./intakeFormShared.helpers";

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
