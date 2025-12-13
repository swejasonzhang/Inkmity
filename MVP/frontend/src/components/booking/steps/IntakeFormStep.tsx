import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { IntakeForm } from "@/api";

type Props = {
  artistId: string;
  appointmentType: "consultation" | "tattoo_session";
  value: Partial<IntakeForm> | null;
  onChange: (form: Partial<IntakeForm>) => void;
};

export default function IntakeFormStep({
  appointmentType,
  value,
  onChange,
}: Props) {
  const [form, setForm] = useState<Partial<IntakeForm>>(
    value || {
      healthInfo: {},
      tattooDetails: {},
      consent: {
        ageVerification: false,
        healthDisclosure: false,
        aftercareInstructions: false,
        depositPolicy: false,
        cancellationPolicy: false,
      },
      emergencyContact: {},
    }
  );

  useEffect(() => {
    onChange(form);
  }, [form, onChange]);

  const updateField = (section: string, field: string, value: any) => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section as keyof typeof prev] as any),
        [field]: value,
      },
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Intake & Consent Form</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Please provide your health information and consent to proceed with your appointment
        </p>
      </div>

      <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
        <Card className="p-4">
          <h4 className="font-semibold mb-4">Health Information</h4>
          <div className="space-y-4">
            <div>
              <Label htmlFor="allergies">Allergies</Label>
              <Input
                id="allergies"
                placeholder="List any allergies"
                value={form.healthInfo?.allergies || ""}
                onChange={(e) =>
                  updateField("healthInfo", "allergies", e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="medications">Current Medications</Label>
              <Input
                id="medications"
                placeholder="List current medications"
                value={form.healthInfo?.medications || ""}
                onChange={(e) =>
                  updateField("healthInfo", "medications", e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="medicalConditions">Medical Conditions</Label>
              <Input
                id="medicalConditions"
                placeholder="List any medical conditions"
                value={form.healthInfo?.medicalConditions || ""}
                onChange={(e) =>
                  updateField("healthInfo", "medicalConditions", e.target.value)
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="bloodThinners">Taking blood thinners?</Label>
              <Switch
                id="bloodThinners"
                checked={form.healthInfo?.bloodThinners || false}
                onCheckedChange={(checked) =>
                  updateField("healthInfo", "bloodThinners", checked)
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pregnant">Pregnant or nursing?</Label>
              <Switch
                id="pregnant"
                checked={form.healthInfo?.pregnant || false}
                onCheckedChange={(checked) =>
                  updateField("healthInfo", "pregnant", checked)
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="recentSurgery">Recent surgery in tattoo area?</Label>
              <Switch
                id="recentSurgery"
                checked={form.healthInfo?.recentSurgery || false}
                onCheckedChange={(checked) =>
                  updateField("healthInfo", "recentSurgery", checked)
                }
              />
            </div>
            {form.healthInfo?.recentSurgery && (
              <div>
                <Label htmlFor="surgeryDetails">Surgery Details</Label>
                <Textarea
                  id="surgeryDetails"
                  placeholder="Please provide details"
                  value={form.healthInfo?.recentSurgeryDetails || ""}
                  onChange={(e) =>
                    updateField("healthInfo", "recentSurgeryDetails", e.target.value)
                  }
                />
              </div>
            )}
          </div>
        </Card>

        {appointmentType === "tattoo_session" && (
          <Card className="p-4">
            <h4 className="font-semibold mb-4">Tattoo Details</h4>
            <div className="space-y-4">
              <div>
                <Label htmlFor="placement">Placement</Label>
                <Input
                  id="placement"
                  placeholder="e.g., Left forearm, Back, etc."
                  value={form.tattooDetails?.placement || ""}
                  onChange={(e) =>
                    updateField("tattooDetails", "placement", e.target.value)
                  }
                />
              </div>
              <div>
                <Label htmlFor="size">Size</Label>
                <Input
                  id="size"
                  placeholder="e.g., 4x4 inches, palm-sized, etc."
                  value={form.tattooDetails?.size || ""}
                  onChange={(e) =>
                    updateField("tattooDetails", "size", e.target.value)
                  }
                />
              </div>
              <div>
                <Label htmlFor="style">Style</Label>
                <Input
                  id="style"
                  placeholder="e.g., Traditional, Realism, etc."
                  value={form.tattooDetails?.style || ""}
                  onChange={(e) =>
                    updateField("tattooDetails", "style", e.target.value)
                  }
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your tattoo idea"
                  value={form.tattooDetails?.description || ""}
                  onChange={(e) =>
                    updateField("tattooDetails", "description", e.target.value)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isCoverUp">Is this a cover-up?</Label>
                <Switch
                  id="isCoverUp"
                  checked={form.tattooDetails?.isCoverUp || false}
                  onCheckedChange={(checked) =>
                    updateField("tattooDetails", "isCoverUp", checked)
                  }
                />
              </div>
            </div>
          </Card>
        )}

        <Card className="p-4">
          <h4 className="font-semibold mb-4">Emergency Contact</h4>
          <div className="space-y-4">
            <div>
              <Label htmlFor="contactName">Name</Label>
              <Input
                id="contactName"
                value={form.emergencyContact?.name || ""}
                onChange={(e) =>
                  updateField("emergencyContact", "name", e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="contactPhone">Phone</Label>
              <Input
                id="contactPhone"
                type="tel"
                value={form.emergencyContact?.phone || ""}
                onChange={(e) =>
                  updateField("emergencyContact", "phone", e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="contactRelationship">Relationship</Label>
              <Input
                id="contactRelationship"
                value={form.emergencyContact?.relationship || ""}
                onChange={(e) =>
                  updateField("emergencyContact", "relationship", e.target.value)
                }
              />
            </div>
          </div>
        </Card>

        <Separator />

        <Card className="p-4">
          <h4 className="font-semibold mb-4">Required Consents</h4>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Switch
                id="ageVerification"
                checked={form.consent?.ageVerification || false}
                onCheckedChange={(checked) =>
                  updateField("consent", "ageVerification", checked)
                }
              />
              <Label htmlFor="ageVerification" className="flex-1 cursor-pointer">
                I verify that I am 18 years or older
              </Label>
            </div>
            <div className="flex items-start gap-3">
              <Switch
                id="healthDisclosure"
                checked={form.consent?.healthDisclosure || false}
                onCheckedChange={(checked) =>
                  updateField("consent", "healthDisclosure", checked)
                }
              />
              <Label htmlFor="healthDisclosure" className="flex-1 cursor-pointer">
                I have disclosed all relevant health information
              </Label>
            </div>
            <div className="flex items-start gap-3">
              <Switch
                id="aftercareInstructions"
                checked={form.consent?.aftercareInstructions || false}
                onCheckedChange={(checked) =>
                  updateField("consent", "aftercareInstructions", checked)
                }
              />
              <Label htmlFor="aftercareInstructions" className="flex-1 cursor-pointer">
                I understand and will follow aftercare instructions
              </Label>
            </div>
            <div className="flex items-start gap-3">
              <Switch
                id="depositPolicy"
                checked={form.consent?.depositPolicy || false}
                onCheckedChange={(checked) =>
                  updateField("consent", "depositPolicy", checked)
                }
              />
              <Label htmlFor="depositPolicy" className="flex-1 cursor-pointer">
                I understand deposits are non-refundable and apply to final cost
              </Label>
            </div>
            <div className="flex items-start gap-3">
              <Switch
                id="cancellationPolicy"
                checked={form.consent?.cancellationPolicy || false}
                onCheckedChange={(checked) =>
                  updateField("consent", "cancellationPolicy", checked)
                }
              />
              <Label htmlFor="cancellationPolicy" className="flex-1 cursor-pointer">
                I understand cancellation requires 48-72 hours notice or deposit is forfeited
              </Label>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}