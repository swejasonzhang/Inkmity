import { useState, useEffect, useMemo } from "react";
import { apiGet } from "@/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CalendarPicker from "@/components/calender/CalendarPicker";
import { format } from "date-fns";
import { X, CalendarPlus } from "lucide-react";

type Session = { startISO: string; endISO: string };

type Props = {
  artistId: string;
  initialDate?: Date;
  appointmentType?: "consultation" | "tattoo_session";
  sessions: Session[];
  onToggle: (s: Session) => void;
};

export default function TimeSlotStep({
  artistId,
  initialDate,
  appointmentType = "tattoo_session",
  sessions,
  onToggle,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate || new Date());
  const [month, setMonth] = useState(new Date());
  const [slots, setSlots] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  const multi = appointmentType === "tattoo_session";

  const startOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const DURATION_OPTIONS = multi ? [60, 120, 180, 240, 360, 480] : [15, 30, 45, 60];
  const [dur, setDur] = useState(multi ? 120 : 30);
  const durLabel = (m: number) =>
    m < 60 ? `${m} min` : m % 60 === 0 ? `${m / 60} hr` : `${Math.floor(m / 60)}h ${m % 60}m`;

  useEffect(() => {
    if (selectedDate) loadSlots(selectedDate);
  }, [selectedDate, artistId, dur]);

  const loadSlots = async (date: Date) => {
    setLoading(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const blocks = await apiGet<Session[]>(`/availability/${artistId}/slots?date=${dateStr}`);
      const now = Date.now();
      const stepMs = 30 * 60 * 1000;
      const durMs = dur * 60 * 1000;
      const generated: Session[] = [];
      for (const block of blocks) {
        let t = new Date(block.startISO).getTime();
        const blockEnd = new Date(block.endISO).getTime();
        while (t + durMs <= blockEnd) {
          if (t >= now) {
            generated.push({ startISO: new Date(t).toISOString(), endISO: new Date(t + durMs).toISOString() });
          }
          t += stepMs;
        }
      }
      setSlots(generated);
    } catch (error) {
      console.error("Failed to load slots:", error);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const isPicked = (slot: Session) => sessions.some((s) => s.startISO === slot.startISO);

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => +new Date(a.startISO) - +new Date(b.startISO)),
    [sessions]
  );

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold mb-1">Select Date & Time</h3>
        <p className="text-sm text-muted-foreground">
          {multi
            ? "Pick a session length, then tap one or more times. Big pieces can run several hours and span multiple days — every time you add becomes a linked session."
            : "Choose how long you need, then pick a time."}
        </p>
      </div>

      {/* Session length */}
      <div>
        <h4 className="font-medium mb-2 text-sm">Session length</h4>
        <div className="flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((m) => (
            <Button
              key={m}
              type="button"
              variant={dur === m ? "default" : "outline"}
              onClick={() => setDur(m)}
              className="h-9 px-3 text-sm"
            >
              {durLabel(m)}
            </Button>
          ))}
        </div>
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

        <div className="space-y-3">
          {selectedDate && (
            <>
              <h4 className="font-medium text-sm">
                {format(selectedDate, "MMMM d, yyyy")}
              </h4>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading times…</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No {durLabel(dur)} openings this day. Try another date or a shorter session.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
                  {slots.map((slot, idx) => {
                    const start = new Date(slot.startISO);
                    const end = new Date(slot.endISO);
                    const picked = isPicked(slot);
                    return (
                      <Button
                        key={idx}
                        variant={picked ? "default" : "outline"}
                        onClick={() => onToggle(slot)}
                        className="h-auto py-2.5 flex flex-col"
                      >
                        <span className="text-sm font-medium">{format(start, "h:mm a")}</span>
                        <span className="text-xs opacity-70">to {format(end, "h:mm a")}</span>
                      </Button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Chosen sessions */}
      {sortedSessions.length > 0 && (
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <CalendarPlus className="h-4 w-4 opacity-70" />
            {multi && sortedSessions.length > 1
              ? `${sortedSessions.length}-session project`
              : "Your appointment"}
          </div>
          <div className="space-y-2">
            {sortedSessions.map((s, i) => (
              <div
                key={s.startISO}
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="min-w-0">
                  {multi && sortedSessions.length > 1 && (
                    <span className="text-xs text-muted-foreground">Session {i + 1}</span>
                  )}
                  <div className="text-sm font-medium">
                    {format(new Date(s.startISO), "EEE, MMM d · h:mm a")} – {format(new Date(s.endISO), "h:mm a")}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Remove session"
                  onClick={() => onToggle(s)}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md border hover:bg-elevated transition-colors"
                  style={{ borderColor: "var(--border)" }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          {multi && (
            <p className="mt-2 text-xs text-muted-foreground">
              Tap more times above to add sessions, or remove any with ✕.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
