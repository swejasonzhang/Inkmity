import { useState, useEffect, useMemo } from "react";
import { apiGet } from "@/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CalendarPicker from "@/components/calender/CalendarPicker";
import { format } from "date-fns";
import AppointmentHealthInstructions from "@/components/dashboard/shared/AppointmentHealthInstructions";

type Props = {
  artistId: string;
  initialDate?: Date;
  selectedStart: string | null;
  selectedEnd: string | null;
  durationMinutes: number;
  appointmentType?: "consultation" | "tattoo_session";
  onSelect: (startISO: string, endISO: string) => void;
};

export default function TimeSlotStep({
  artistId,
  initialDate,
  selectedStart,
  selectedEnd,
  durationMinutes,
  appointmentType = "tattoo_session",
  onSelect,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    initialDate || new Date()
  );
  const [month, setMonth] = useState(new Date());
  const [slots, setSlots] = useState<Array<{ startISO: string; endISO: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<{ startISO: string; endISO: string } | null>(null);

  const startOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadSlots(selectedDate);
    }
  }, [selectedDate, artistId, durationMinutes]);

  const loadSlots = async (date: Date) => {
    setLoading(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const availableSlots = await apiGet<Array<{ startISO: string; endISO: string }>>(
        `/availability/${artistId}/slots?date=${dateStr}`
      );
      
      const filteredSlots = availableSlots.filter((slot) => {
        const start = new Date(slot.startISO);
        const end = new Date(slot.endISO);
        const slotDuration = (end.getTime() - start.getTime()) / (1000 * 60);
        return slotDuration >= durationMinutes;
      });

      setSlots(filteredSlots);
    } catch (error) {
      console.error("Failed to load slots:", error);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSlotSelect = (slot: { startISO: string; endISO: string }) => {
    if (appointmentType === "tattoo_session") {
      setPendingSelection(slot);
      setHealthModalOpen(true);
    } else {
      const start = new Date(slot.startISO);
      const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
      onSelect(start.toISOString(), end.toISOString());
    }
  };

  const handleContinueAfterHealth = () => {
    if (pendingSelection) {
      const start = new Date(pendingSelection.startISO);
      const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
      onSelect(start.toISOString(), end.toISOString());
      setPendingSelection(null);
      setHealthModalOpen(false);
    }
  };

  const isSlotSelected = (slot: { startISO: string; endISO: string }) => {
    if (!selectedStart) return false;
    return slot.startISO === selectedStart;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Select Date & Time</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Choose a date and available time slot for your appointment
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <CalendarPicker
            date={selectedDate}
            month={month}
            onDateChange={setSelectedDate}
            onMonthChange={setMonth}
            startOfToday={startOfToday}
          />
        </div>

        <div className="space-y-4">
          {selectedDate && (
            <>
              <div>
                <h4 className="font-medium mb-2">
                  Available Times for {format(selectedDate, "MMMM d, yyyy")}
                </h4>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading slots...</p>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No available slots for this date. Please select another date.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                    {slots.map((slot, idx) => {
                      const start = new Date(slot.startISO);
                      const end = new Date(slot.endISO);
                      const timeStr = `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`;
                      const selected = isSlotSelected(slot);

                      return (
                        <Button
                          key={idx}
                          variant={selected ? "default" : "outline"}
                          onClick={() => handleSlotSelect(slot)}
                          className="h-auto py-3 flex flex-col"
                        >
                          <span className="text-sm font-medium">{timeStr}</span>
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {selectedStart && selectedEnd && (
        <Card className="p-4 bg-primary/5 border-primary">
          <p className="text-sm font-medium">
            Selected: {format(new Date(selectedStart), "MMMM d, yyyy 'at' h:mm a")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Duration: {durationMinutes} minutes
          </p>
        </Card>
      )}

      <AppointmentHealthInstructions
        open={healthModalOpen}
        onClose={() => {
          setHealthModalOpen(false);
          setPendingSelection(null);
        }}
        onContinue={handleContinueAfterHealth}
      />
    </div>
  );
}


