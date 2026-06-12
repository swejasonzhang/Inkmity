import { type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ShoppingBag, X, Clock, AlertTriangle } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  appointmentDate?: string | Date;
};

export default function AftercareInstructions({ open, onClose, appointmentDate }: Props) {
  const aftercareSteps = [
    "Keep the bandage on for 2-4 hours after leaving the studio",
    "Gently wash with lukewarm water and mild, fragrance-free soap",
    "Pat dry with a clean paper towel (don't rub)",
    "Apply a thin layer of aftercare ointment (recommended products below)",
    "Repeat washing and moisturizing 2-3 times daily for 2-3 weeks",
    "Keep the tattoo clean and dry",
    "Wear loose, breathable clothing over the tattoo",
  ];

  const avoidItems = [
    "Don't pick, scratch, or peel the tattoo",
    "Don't soak in water (no swimming, hot tubs, or long baths for 2-3 weeks)",
    "Avoid direct sunlight and tanning beds (use SPF 50+ after healing)",
    "Don't apply alcohol, hydrogen peroxide, or harsh chemicals",
    "Avoid tight clothing that rubs against the tattoo",
    "Don't go to the gym or sweat excessively for the first 48 hours",
    "Avoid pets, dirty environments, and excessive touching",
  ];

  const recommendedProducts = [
    { name: "Second Skin / Tegaderm", description: "Protective film that can be left on for 3-5 days (if applied by artist)" },
    { name: "Aquaphor Healing Ointment", description: "Petroleum-based ointment, use sparingly for first 3-5 days" },
    { name: "A&D Ointment", description: "Alternative to Aquaphor, apply thin layer 2-3 times daily" },
    { name: "Unscented Lotion", description: "Switch to after 3-5 days, use for remaining healing period (Cetaphil, Lubriderm, etc.)" },
    { name: "Antibacterial Soap", description: "Fragrance-free soap for cleaning (Dial Gold, Cetaphil Gentle Cleanser)" },
  ];

  const timeline: [string, string][] = [
    ["Days 1-3:", "Initial healing, may ooze plasma/ink"],
    ["Days 4-7:", "Scabbing begins, keep moisturized"],
    ["Days 8-14:", "Scabs may flake off (don't pick!)"],
    ["Weeks 3-4:", "Surface healing complete, may look dull"],
    ["Month 2+:", "Tattoo fully settled, vibrant colors return"],
  ];

  const muted = "color-mix(in srgb, var(--fg) 60%, transparent)";
  const sectionStyle = { background: "var(--elevated)", borderColor: "var(--border)" };

  const SectionTitle = ({ icon: Icon, children }: { icon: typeof Clock; children: ReactNode }) => (
    <h3 className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.16em] mb-4">
      <Icon className="h-4 w-4" /> {children}
    </h3>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="sm:max-w-3xl max-h-[90vh] overflow-y-auto text-center justify-items-stretch p-0 gap-0"
        showCloseButton={false}
        style={{ background: "var(--card)", color: "var(--fg)", borderColor: "var(--border)" }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 px-6 sm:px-8 py-5 border-b text-center"
          style={{ background: "color-mix(in srgb, var(--card) 90%, transparent)", backdropFilter: "blur(10px)", borderColor: "var(--border)" }}
        >
          <button
            aria-label="Close"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-lg p-2 transition-colors hover:bg-[color:var(--elevated)]"
            style={{ color: "var(--fg)" }}
          >
            <X className="h-5 w-5" />
          </button>
          <DialogTitle className="text-center text-xl sm:text-2xl font-bold tracking-tight">
            Tattoo Aftercare Instructions (Required)
          </DialogTitle>
          <DialogDescription className="text-center mt-1.5 text-xs sm:text-sm mx-auto max-w-md" style={{ color: muted }}>
            {appointmentDate && <span className="block">Appointment Date: {new Date(appointmentDate).toLocaleDateString()}</span>}
            Please read these important aftercare instructions carefully
          </DialogDescription>
        </div>

        <div className="px-6 sm:px-8 py-6 space-y-5">
          {/* Aftercare steps */}
          <section className="rounded-2xl border p-5 sm:p-6" style={sectionStyle}>
            <SectionTitle icon={CheckCircle2}>Aftercare Steps</SectionTitle>
            <ol className="space-y-2.5">
              {aftercareSteps.map((step, idx) => (
                <li key={idx} className="text-sm leading-relaxed">
                  <span className="font-bold tabular-nums">{idx + 1}.</span> {step}
                </li>
              ))}
            </ol>
          </section>

          {/* What to avoid */}
          <section className="rounded-2xl border p-5 sm:p-6" style={sectionStyle}>
            <SectionTitle icon={XCircle}>What to Avoid</SectionTitle>
            <ul className="space-y-2.5">
              {avoidItems.map((item, idx) => (
                <li key={idx} className="text-sm leading-relaxed">{item}</li>
              ))}
            </ul>
          </section>

          {/* Recommended products */}
          <section className="rounded-2xl border p-5 sm:p-6" style={sectionStyle}>
            <SectionTitle icon={ShoppingBag}>Recommended Products</SectionTitle>
            <div className="grid sm:grid-cols-2 gap-3">
              {recommendedProducts.map((product, idx) => (
                <div key={idx} className="rounded-xl border p-4 text-center" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                  <p className="text-sm font-semibold">{product.name}</p>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: muted }}>{product.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Healing timeline */}
          <section className="rounded-2xl border p-5 sm:p-6" style={sectionStyle}>
            <SectionTitle icon={Clock}>Healing Timeline</SectionTitle>
            <div className="space-y-2">
              {timeline.map(([label, desc], idx) => (
                <p key={idx} className="text-sm leading-relaxed">
                  <span className="font-semibold tabular-nums">{label}</span> {desc}
                </p>
              ))}
            </div>
          </section>

          {/* Warning */}
          <div
            className="rounded-2xl border p-5 text-center"
            style={{ borderColor: "var(--fg)", background: "color-mix(in srgb, var(--fg) 7%, transparent)" }}
          >
            <AlertTriangle className="h-5 w-5 mx-auto mb-2" />
            <p className="text-sm leading-relaxed">
              <strong>Warning Signs:</strong> If you experience excessive redness, swelling, pus, fever, or signs of infection, contact your artist or seek medical attention immediately.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          className="sticky bottom-0 flex justify-center px-6 sm:px-8 py-4 border-t"
          style={{ background: "color-mix(in srgb, var(--card) 90%, transparent)", backdropFilter: "blur(10px)", borderColor: "var(--border)" }}
        >
          <Button onClick={onClose} className="w-full sm:w-auto">
            I Understand
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
