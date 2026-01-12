import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ShoppingBag, X } from "lucide-react";

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
    {
      name: "Second Skin / Tegaderm",
      description: "Protective film that can be left on for 3-5 days (if applied by artist)",
    },
    {
      name: "Aquaphor Healing Ointment",
      description: "Petroleum-based ointment, use sparingly for first 3-5 days",
    },
    {
      name: "A&D Ointment",
      description: "Alternative to Aquaphor, apply thin layer 2-3 times daily",
    },
    {
      name: "Unscented Lotion",
      description: "Switch to after 3-5 days, use for remaining healing period (Cetaphil, Lubriderm, etc.)",
    },
    {
      name: "Antibacterial Soap",
      description: "Fragrance-free soap for cleaning (Dial Gold, Cetaphil Gentle Cleanser)",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-3xl max-h-[90vh] overflow-y-auto relative" 
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        style={{ background: "var(--card)", color: "var(--fg)", borderColor: "var(--border)" }}
      >
        <button
          aria-label="Close"
          className="absolute top-4 right-4 rounded-md p-1 opacity-50 cursor-not-allowed"
          disabled
          style={{ color: "var(--fg)", zIndex: 10 }}
        >
          <X className="h-5 w-5" />
        </button>
        <DialogHeader>
          <DialogTitle>Tattoo Aftercare Instructions (Required)</DialogTitle>
          <DialogDescription>
            {appointmentDate && (
              <span className="block mt-1">
                Appointment Date: {new Date(appointmentDate).toLocaleDateString()}
              </span>
            )}
            Please read these important aftercare instructions carefully
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
        <div>
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Aftercare Steps
          </h3>
          <ol className="space-y-2 list-decimal list-inside">
            {aftercareSteps.map((step, idx) => (
              <li key={idx} className="text-sm flex items-start gap-2">
                <span className="flex-shrink-0 w-5">{idx + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            What to Avoid
          </h3>
          <ul className="space-y-2">
            {avoidItems.map((item, idx) => (
              <li key={idx} className="text-sm flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-blue-500" />
            Recommended Products
          </h3>
          <div className="space-y-3">
            {recommendedProducts.map((product, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border"
                style={{ background: "var(--elevated)", borderColor: "var(--border)" }}
              >
                <p className="font-medium text-sm">{product.name}</p>
                <p className="text-xs opacity-70 mt-1">{product.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-sm font-semibold mb-1">Healing Timeline</p>
          <ul className="text-xs space-y-1 opacity-90">
            <li>• Days 1-3: Initial healing, may ooze plasma/ink</li>
            <li>• Days 4-7: Scabbing begins, keep moisturized</li>
            <li>• Days 8-14: Scabs may flake off (don't pick!)</li>
            <li>• Weeks 3-4: Surface healing complete, may look dull</li>
            <li>• Month 2+: Tattoo fully settled, vibrant colors return</li>
          </ul>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <p className="text-sm">
            <strong>Warning Signs:</strong> If you experience excessive redness, swelling, pus, fever, or signs of infection, contact your artist or seek medical attention immediately.
          </p>
        </div>

        <div className="flex justify-end pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          <Button onClick={onClose} className="w-full sm:w-auto">
            I Understand
          </Button>
        </div>
      </div>
    </DialogContent>
    </Dialog>
  );
}