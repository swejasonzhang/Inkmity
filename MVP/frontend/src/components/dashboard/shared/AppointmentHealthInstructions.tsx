import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
};

export default function AppointmentHealthInstructions({ open, onClose, onContinue }: Props) {
  const doItems = [
    "Get a good night's sleep (8+ hours) before your appointment",
    "Eat a substantial meal 1-2 hours before your appointment",
    "Stay hydrated - drink plenty of water",
    "Wear comfortable, loose-fitting clothing",
    "Shower and arrive clean",
    "Bring a valid ID",
    "Arrive 10-15 minutes early",
  ];

  const dontItems = [
    "Don't drink alcohol 24 hours before your appointment",
    "Don't take blood thinners (aspirin, ibuprofen) 24 hours before",
    "Don't come if you're sick or have a fever",
    "Don't sunburn the area to be tattooed",
    "Don't use numbing creams without artist approval",
    "Don't consume caffeine excessively (can increase bleeding)",
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: "var(--card)", color: "var(--fg)", borderColor: "var(--border)" }}>
        <DialogHeader>
          <DialogTitle>Pre-Appointment Instructions</DialogTitle>
          <DialogDescription>
            Important information to ensure a safe and successful tattoo session
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              What to Do
            </h3>
            <ul className="space-y-2">
              {doItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              What NOT to Do
            </h3>
            <ul className="space-y-2">
              {dontItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm mb-1">Important Reminder</p>
                <p className="text-sm">
                  If you have any medical conditions, allergies, or are taking medications, please inform your artist before the appointment.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t" style={{ borderColor: "var(--border)" }}>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={onContinue}>
              I Understand, Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

