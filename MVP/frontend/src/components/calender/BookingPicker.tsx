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

export default function BookingPicker({ artistId }: Props) {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    getAvailability(artistId).then(setAvailability).catch(console.error);
  }, [artistId]);

  useEffect(() => {
    if (!selectedDate) return;
    getBookingsForDate(artistId, selectedDate)
      .then(setBookings)
      .catch(console.error);
  }, [artistId, selectedDate]);

  const slots = useMemo(() => {
    if (!availability || !selectedDate) return [];
    const date = new Date(`${selectedDate}T00:00:00`);
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
  }, [availability, bookings, selectedDate]);

  return (
    <div className="rounded-xl border border-neutral-700 p-4">
      <h3 className="font-semibold mb-3">Book an Appointment</h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm block mb-1">Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setSelectedSlot(null);
            }}
            className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="text-sm block mb-1">Note (optional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything the artist should know?"
            className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-2"
          />
        </div>
      </div>

      {!selectedDate && (
        <p className="text-sm text-neutral-400 mt-3">
          Choose a date to see available times.
        </p>
      )}
      {selectedDate && slots.length === 0 && (
        <p className="text-sm text-neutral-400 mt-3">
          No times available this day.
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-3">
        {slots.map((s) => (
          <button
            key={s.toISOString()}
            onClick={() => setSelectedSlot(s)}
            className={`px-3 py-2 rounded ${
              selectedSlot?.toISOString() === s.toISOString()
                ? "bg-white text-black"
                : "bg-neutral-800"
            }`}
          >
            {fmtTime(s)}
          </button>
        ))}
      </div>

      <div className="flex justify-end mt-4">
        <button
          disabled={!selectedSlot || !availability}
          onClick={async () => {
            if (!selectedSlot || !availability) return;
            const startISO = selectedSlot.toISOString();
            const endISO = new Date(
              selectedSlot.getTime() + availability.slotMinutes * 60 * 1000
            ).toISOString();
            try {
              await createBooking({ artistId, startISO, endISO, note });
              alert("Booked!");
              setSelectedSlot(null);
              if (selectedDate) {
                const b = await getBookingsForDate(artistId, selectedDate);
                setBookings(b);
              }
            } catch (e: any) {
              alert(e?.message || "Booking failed");
            }
          }}
          className="px-4 py-2 rounded bg-green-600 disabled:opacity-50"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}