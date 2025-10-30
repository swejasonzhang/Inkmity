import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { stripePromise } from "@/lib/stripe";

type Kind = "consultation" | "appointment";
type TimeSlot = { label: string; h24: number; minutes: number };

type BrowserStripe = {
  redirectToCheckout: (options: { sessionId: string }) => Promise<unknown>;
};

function generateHalfHourRange(startHour24 = 10, endHour24 = 22): TimeSlot[] {
  const out: TimeSlot[] = [];
  for (let h = startHour24; h <= endHour24; h++) {
    for (const m of [0, 30]) {
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      const meridiem = h < 12 ? "AM" : "PM";
      const mm = m === 0 ? "00" : "30";
      out.push({ label: `${hour12}:${mm} ${meridiem}`, h24: h, minutes: m });
    }
  }
  return out;
}

type Props = {
  artistId: string;
  date?: Date;
  slotMinutes?: number;
};

export default function BookingPicker({ artistId, date, slotMinutes = 30 }: Props) {
  const [kind, setKind] = useState<Kind>("appointment");
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [note, setNote] = useState<string>("");
  const [taken, setTaken] = useState<Record<string, true>>({});

  const allTimes = useMemo(() => generateHalfHourRange(10, 22), []);
  const amTimes = useMemo(() => allTimes.filter((t) => t.h24 < 12), [allTimes]);
  const pmTimes = useMemo(() => allTimes.filter((t) => t.h24 >= 12), [allTimes]);
  const canConfirm = Boolean(selectedTime && date);

  useEffect(() => {
    if (!artistId || !date) return;
    const yyyyMmDd = date.toISOString().slice(0, 10);
    apiGet(`/bookings?artistId=${artistId}&date=${yyyyMmDd}`)
      .then((list) => {
        const map: Record<string, true> = {};
        for (const b of list) {
          const dt = new Date(b.startAt);
          const hh = dt.getHours();
          const mm = dt.getMinutes();
          const h12 = hh % 12 === 0 ? 12 : hh % 12;
          const mer = hh < 12 ? "AM" : "PM";
          const label = `${h12}:${mm === 0 ? "00" : "30"} ${mer}`;
          map[label] = true;
        }
        setTaken(map);
      })
      .catch(() => setTaken({}));
  }, [artistId, date]);

  async function handleConfirm() {
    if (!selectedTime || !date) return;

    const [timePart, mer] = selectedTime.split(" ");
    const [hStr, mStr] = timePart.split(":");
    let h = Number(hStr);
    const m = Number(mStr);
    if (mer === "PM" && h !== 12) h += 12;
    if (mer === "AM" && h === 12) h = 0;

    const start = new Date(date);
    start.setHours(h, m, 0, 0);
    const end = new Date(start.getTime() + slotMinutes * 60 * 1000);

    const booking = await apiPost("/bookings", {
      artistId,
      clientId: "me",
      startISO: start.toISOString(),
      endISO: end.toISOString(),
      note: `[${kind.toUpperCase()}] ${note}`.trim(),
      serviceId: null,
      priceCents: 0
    });

    const stripe = (await stripePromise) as unknown as BrowserStripe | null;
    if (!stripe) throw new Error("Stripe failed to initialize");

    const fee = await apiPost("/billing/checkout", { bookingId: booking._id });
    await stripe.redirectToCheckout({ sessionId: fee.id });

    if (kind === "appointment" && booking.depositRequiredCents > 0) {
      const dep = await apiPost("/billing/deposit", { bookingId: booking._id });
      await stripe.redirectToCheckout({ sessionId: dep.id });
    }

    setSelectedTime(null);
    setNote("");
  }

  const chipBase = "px-3.5 sm:px-4 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 rounded-md";
  const chipGroup = "inline-flex items-center gap-1 bg-transparent p-1 rounded-xl border";
  const chipBorderStyle = { borderColor: "var(--border)" };
  const chipInactive = { background: "color-mix(in oklab, var(--card) 92%, transparent)", color: "var(--fg)" };
  const chipActive = { background: "var(--fg)", color: "var(--card)" };

  const Section = ({ title, items }: { title: "AM" | "PM"; items: TimeSlot[] }) => (
    <div className="w-full">
      <span className="block text-xs sm:text-sm mb-2" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>{title}</span>
      <div className="rounded-lg border p-2 sm:p-0 sm:border-0 sm:rounded-none max-h-[60vh] overflow-y-auto sm:max-h-none sm:overflow-visible" style={{ borderColor: "var(--border)", background: "transparent" }}>
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-2.5 md:gap-3 justify-items-center">
          {items.map(({ label }) => {
            const isActive = selectedTime === label;
            const disabled = !!taken[label];
            return (
              <button
                key={label}
                onClick={() => !disabled && setSelectedTime(label)}
                disabled={disabled}
                className="px-2.5 sm:px-3.5 py-2 rounded-lg transition outline-none focus-visible:ring-2 min-w-[80px] sm:min-w-[108px] text-xs sm:text-sm"
                style={{
                  background: isActive ? "var(--fg)" : "color-mix(in oklab, var(--card) 95%, transparent)",
                  color: isActive ? "var(--card)" : "var(--fg)",
                  border: `1px solid ${isActive ? "var(--fg)" : "var(--border)"}`,
                  opacity: disabled ? 0.5 : 1,
                  cursor: disabled ? "not-allowed" : "pointer"
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid place-items-center">
      <div className="w-full max-w-2xl flex flex-col items-center justify-center text-center rounded-2xl p-4 sm:p-5 gap-4" style={{ background: "transparent", color: "var(--fg)" }}>
        <div className="flex items-center justify-center w-full">
          <h3 className="text-base sm:text-lg font-semibold">Book a Time</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 justify-items-center w-full">
          <div className="w-full max-w-xs">
            <span className="block text-xs sm:text-sm mb-2" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>Type</span>
            <div className={chipGroup + " mx-auto"} style={chipBorderStyle} role="group" aria-label="Booking type">
              <button type="button" aria-pressed={kind === "consultation"} onClick={() => setKind("consultation")} className={chipBase} style={kind === "consultation" ? chipActive : chipInactive}>Consultation</button>
              <button type="button" aria-pressed={kind === "appointment"} onClick={() => setKind("appointment")} className={chipBase} style={kind === "appointment" ? chipActive : chipInactive}>Appointment</button>
            </div>
          </div>
          <div className="w-full max-w-xs">
            <span className="block text-xs sm:text-sm mb-2" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>Hours</span>
            <div className="text-xs sm:text-sm" style={{ color: "color-mix(in oklab, var(--fg) 75%, transparent)" }}>10:00 AM – 10:00 PM</div>
          </div>
        </div>
        <Section title="AM" items={amTimes} />
        <Section title="PM" items={pmTimes} />
        <div className="mt-3 text-xs sm:text-sm" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
          {selectedTime ? (
            <span>
              Selected: <span className="font-medium" style={{ color: "var(--fg)" }}>{selectedTime}</span> • <span className="font-medium capitalize" style={{ color: "var(--fg)" }}>{kind}</span>
            </span>
          ) : (
            <span>Select a time above.</span>
          )}
        </div>
        <div className="mt-auto flex flex-col items-center justify-center gap-3 w-full">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note for the artist"
            className="w-full max-w-md px-3 py-2 rounded-lg text-sm
             border-0 outline-none ring-0 shadow-none
             focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none
             focus-visible:outline-none focus-visible:ring-0"
            style={{
              background: "var(--card)",
              color: "var(--fg)",
              border: "none",
              boxShadow: "none",
              WebkitAppearance: "none",
            }}
          />
          <button
            disabled={!canConfirm}
            onClick={handleConfirm}
            className="px-4 py-2 rounded-xl font-medium transition outline-none focus-visible:ring-2"
            style={{
              background: canConfirm ? "var(--fg)" : "color-mix(in oklab, var(--elevated) 80%, transparent)",
              color: canConfirm ? "var(--card)" : "color-mix(in oklab, var(--fg) 60%, transparent)",
              border: `1px solid ${canConfirm ? "var(--fg)" : "var(--border)"}`,
              cursor: canConfirm ? "pointer" : "not-allowed"
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}