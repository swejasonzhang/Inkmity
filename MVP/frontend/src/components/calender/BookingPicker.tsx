import { useEffect, useMemo, useState } from "react";
import type { Availability, Booking, Weekday } from "../../lib/api";
import {
  createBooking,
  getAvailability,
  getBookingsForDate,
} from "../../lib/api";

const WEEKDAYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

type Props = {
  artistId: string;
  dateISO?: string;
};

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function timeOn(date: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

function generateSlots(
  date: Date,
  ranges: { start: string; end: string }[],
  slotMinutes: number
): Date[] {
  const slots: Date[] = [];
  ranges.forEach((r) => {
    let cur = timeOn(date, r.start);
    const end = timeOn(date, r.end);
    while (cur < end) {
      slots.push(new Date(cur));
      cur = new Date(cur.getTime() + slotMinutes * 60 * 1000);
    }
  });
  return slots;
}

function filterBooked(
  slots: Date[],
  bookings: { start: string; end: string }[],
  slotMinutes: number
): Date[] {
  const ms = slotMinutes * 60 * 1000;
  return slots.filter((s) => {
    const slotEnd = new Date(s.getTime() + ms);
    const conflict = bookings.some((b) => {
      const bStart = new Date(b.start);
      const bEnd = new Date(b.end);
      return s < bEnd && slotEnd > bStart;
    });
    return !conflict;
  });
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function BookingPicker({ artistId, dateISO }: Props) {
  const [selectedDateLocal] = useState<string>("");
  const effectiveDate = dateISO ?? selectedDateLocal;

  const [availability, setAvailability] = useState<Availability | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [note, setNote] = useState<string>("");

  const [kind, setKind] = useState<"consultation" | "appointment">(
    "appointment"
  );

  useEffect(() => {
    getAvailability(artistId).then(setAvailability).catch(console.error);
  }, [artistId]);

  useEffect(() => {
    if (!effectiveDate) return;
    getBookingsForDate(artistId, effectiveDate)
      .then(setBookings)
      .catch(console.error);
  }, [artistId, effectiveDate]);

  const slots = useMemo(() => {
    if (!availability || !effectiveDate) return [];
    const date = new Date(`${effectiveDate}T00:00:00`);
    const dateStr = toISODate(date);
    const wdKey = WEEKDAYS[date.getDay()];
    const override = (availability.exceptions as any)[dateStr];
    const ranges =
      (override !== undefined ? override : availability.weekly[wdKey]) || [];
    if (ranges.length === 0) return [];
    let s = generateSlots(date, ranges, availability.slotMinutes);
    const now = new Date();
    if (toISODate(now) === dateStr) s = s.filter((d) => d > now);
    s = filterBooked(s, bookings, availability.slotMinutes);
    return s;
  }, [availability, bookings, effectiveDate]);

  const canConfirm = Boolean(selectedSlot && availability && effectiveDate);

  return (
    <div className="rounded-xl border border-gray-700 p-4 bg-black text-white">
      <h3 className="font-semibold mb-4">Book an Appointment</h3>

      <div className="mb-4">
        <span className="block text-sm mb-2 text-gray-200">Type</span>
        <div className="inline-flex rounded-lg border border-gray-700 overflow-hidden">
          <button
            type="button"
            onClick={() => setKind("consultation")}
            className={`px-4 py-2 text-sm border-r border-gray-700 ${
              kind === "consultation"
                ? "bg-white text-black"
                : "bg-gray-900 text-white hover:bg-gray-800"
            }`}
          >
            Consultation
          </button>
          <button
            type="button"
            onClick={() => setKind("appointment")}
            className={`px-4 py-2 text-sm ${
              kind === "appointment"
                ? "bg-white text-black"
                : "bg-gray-900 text-white hover:bg-gray-800"
            }`}
          >
            Appointment
          </button>
        </div>
      </div>

      <div className="mb-3">
        <label className="text-sm block mb-1 text-gray-200">
          Note (optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Describe your idea, placement, size, or any references."
          rows={5}
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 min-h-28 md:min-h-36 resize-y"
        />
      </div>

      {!effectiveDate && (
        <p className="text-sm text-gray-400">
          Choose a date to see available times.
        </p>
      )}
      {effectiveDate && slots.length === 0 && (
        <p className="text-sm text-gray-400">No times available this day.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-3">
        {slots.map((s) => {
          const isActive = selectedSlot?.toISOString() === s.toISOString();
          return (
            <button
              key={s.toISOString()}
              onClick={() => setSelectedSlot(s)}
              className={[
                "px-3 py-2 rounded border transition",
                isActive
                  ? "bg-white text-black border-white"
                  : "bg-gray-900 text-white border-gray-700 hover:bg-gray-800",
              ].join(" ")}
            >
              {fmtTime(s)}
            </button>
          );
        })}
      </div>

      <div className="flex justify-end mt-4">
        <button
          disabled={!canConfirm}
          onClick={async () => {
            if (!selectedSlot || !availability) return;
            const startISO = selectedSlot.toISOString();
            const endISO = new Date(
              selectedSlot.getTime() + availability.slotMinutes * 60 * 1000
            ).toISOString();
            const prefixedNote = `[${kind.toUpperCase()}] ${note || ""}`.trim();
            try {
              await createBooking({
                artistId,
                startISO,
                endISO,
                note: prefixedNote,
              });
              alert("Booked!");
              setSelectedSlot(null);
              if (effectiveDate) {
                const b = await getBookingsForDate(artistId, effectiveDate);
                setBookings(b);
              }
            } catch (e: any) {
              alert(e?.message || "Booking failed");
            }
          }}
          className={[
            "px-4 py-2 rounded font-medium border",
            canConfirm
              ? "bg-white text-black border-white hover:bg-gray-200"
              : "bg-gray-700 text-gray-300 border-gray-700 cursor-not-allowed",
          ].join(" ")}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
