import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: "consultation" | "tattoo_session" | null;
  onChange: (
    type: "consultation" | "tattoo_session",
    durationMinutes: number,
    priceCents: number
  ) => void;
};

export default function AppointmentTypeStep({ value, onChange }: Props) {
  const [duration, setDuration] = useState(30);
  const [price, setPrice] = useState(0);

  const handleTypeChange = (type: "consultation" | "tattoo_session") => {
    const defaultDuration = type === "consultation" ? 30 : 60;
    const defaultPrice = type === "consultation" ? 0 : 0;
    setDuration(defaultDuration);
    setPrice(defaultPrice);
    onChange(type, defaultDuration, defaultPrice);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Select Appointment Type</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Choose whether you'd like a consultation or a tattoo session
        </p>
      </div>

      <div className="space-y-4">
        <Card
          className={cn(
            "p-4 cursor-pointer transition-colors",
            value === "consultation"
              ? "border-primary bg-primary/5"
              : "hover:bg-accent"
          )}
          onClick={() => handleTypeChange("consultation")}
        >
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-5 w-5 items-center justify-center rounded-full border-2">
              {value === "consultation" && (
                <Check className="h-3 w-3 text-primary" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span className="font-semibold">Consultation</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Initial meeting to discuss your tattoo idea, placement, size, and design.
                Typically 15-60 minutes. Some artists may require a deposit.
              </p>
            </div>
          </div>
        </Card>

        <Card
          className={cn(
            "p-4 cursor-pointer transition-colors",
            value === "tattoo_session"
              ? "border-primary bg-primary/5"
              : "hover:bg-accent"
          )}
          onClick={() => handleTypeChange("tattoo_session")}
        >
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-5 w-5 items-center justify-center rounded-full border-2">
              {value === "tattoo_session" && (
                <Check className="h-3 w-3 text-primary" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span className="font-semibold">Tattoo Session</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Actual tattoo appointment. Duration varies based on piece size and complexity.
                A deposit is required to secure your appointment (amount set by the artist).
              </p>
            </div>
          </div>
        </Card>
      </div>

      {value && (
        <div className="space-y-4 pt-4 border-t">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min={value === "consultation" ? 15 : 30}
                max={value === "consultation" ? 60 : 480}
                value={duration}
                onChange={(e) => {
                  const newDuration = parseInt(e.target.value) || duration;
                  setDuration(newDuration);
                  onChange(value, newDuration, price);
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {value === "consultation"
                  ? "Consultations are typically 15-60 minutes"
                  : "Sessions can range from 30 minutes to 8 hours"}
              </p>
            </div>
            <div>
              <Label htmlFor="price">Estimated Price ($)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={(price / 100).toFixed(2)}
                onChange={(e) => {
                  const newPrice = Math.round(
                    (parseFloat(e.target.value) || 0) * 100
                  );
                  setPrice(newPrice);
                  onChange(value, duration, newPrice);
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional: Estimated total cost
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}