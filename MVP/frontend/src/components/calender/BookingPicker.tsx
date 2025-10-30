import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

type Kind = "consultation" | "appointment";

type Props = {
  artistId: string;
  date?: Date;
};

export default function BookingPicker({ artistId, date }: Props) {
  const [kind, setKind] = useState<Kind>("appointment");
  const [slots, setSlots] = useState<{ startISO: string; endISO: string }[]>([]);
  const [selected, setSelected] = useState<{ startISO: string; endISO: string } | null>(null);

  const canConfirm = Boolean(selected && date);

  const browserTz = useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
  }, []);

  const dateLabel = useMemo(() => {
    if (!date) return "";
    return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }, [date]);

  useEffect(() => {
    if (!artistId || !date) return;
    const d = date.toISOString().slice(0, 10);
    apiGet(`/availability/${artistId}/slots?date=${d}`)
      .then((s) => setSlots(Array.isArray(s) ? s : []))
      .catch(() => setSlots([]));
  }, [artistId, date]);

  async function handleConfirm() {
    if (!selected) return;
    const { startISO, endISO } = selected;
    const booking = await apiPost("/bookings", {
      artistId,
      startISO,
      endISO,
      serviceId: null,
      priceCents: 0
    });
    setSelected(null);
    window.dispatchEvent(new CustomEvent("ink:booking-created", { detail: booking }));
  }

  const chipBase = "px-3 py-1.5 text-xs sm:text-sm transition-colors focus:outline-none focus-visible:ring-2 rounded-md";
  const chipGroup = "inline-flex items-center gap-1 bg-transparent p-1 rounded-lg border";
  const chipBorderStyle = { borderColor: "var(--border)" };
  const chipInactive = { background: "color-mix(in oklab, var(--card) 92%, transparent)", color: "var(--fg)" };
  const chipActive = { background: "var(--fg)", color: "var(--card)" };

  const Section = ({
    title,
    items
  }: {
    title: "AM" | "PM";
    items: { startISO: string; endISO: string }[];
  }) => (
    <div className="w-full grid place-items-center gap-1.5 text-center">
      <span className="text-xs sm:text-[0.9rem]" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
        {title}
      </span>
      <div className="rounded-lg border w-full max-w-2xl p-2 sm:p-2.5 mx-auto" style={{ borderColor: "var(--border)", background: "transparent" }}>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5">
          {items.map((s) => {
            const label = new Date(s.startISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const isActive = selected?.startISO === s.startISO;
            return (
              <button
                key={s.startISO}
                onClick={() => setSelected(s)}
                className="px-2.5 py-1.5 rounded-lg transition outline-none focus-visible:ring-2 min-w-[88px] text-xs sm:text-sm text-center"
                style={{
                  background: isActive ? "var(--fg)" : "color-mix(in oklab, var(--card) 95%, transparent)",
                  color: isActive ? "var(--card)" : "var(--fg)",
                  border: `1px solid ${isActive ? "var(--fg)" : "var(--border)"}`
                }}
              >
                {label}
              </button>
            );
          })}
          {items.length === 0 && (
            <div className="w-full text-center text-xs sm:text-sm py-2" style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }}>
              No {title} slots available.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const am = slots.filter((s) => new Date(s.startISO).getHours() < 12);
  const pm = slots.filter((s) => new Date(s.startISO).getHours() >= 12);

  return (
    <div className="w-full grid place-items-center">
      <div className="w-full max-w-3xl grid place-items-center text-center rounded-2xl p-4 sm:p-5 gap-4" style={{ background: "transparent", color: "var(--fg)" }}>
        <div className="grid gap-2 place-items-center">
          <h3 className="text-sm sm:text-base font-semibold">Book a Time</h3>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {!!dateLabel && (
              <span className="text-xs px-2 py-1 rounded-md border" style={{ borderColor: "var(--border)", color: "color-mix(in oklab, var(--fg) 85%, transparent)" }}>
                {dateLabel}
              </span>
            )}
            <span className="text-xs px-2 py-1 rounded-md border" style={{ borderColor: "var(--border)", color: "color-mix(in oklab, var(--fg) 85%, transparent)" }}>
              Times shown in <strong style={{ color: "var(--fg)" }}>{browserTz}</strong>
            </span>
          </div>
        </div>

        <div className="w-full grid place-items-center gap-1.5">
          <span className="text-xs" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
            Type
          </span>
          <div className={chipGroup} style={chipBorderStyle} role="group" aria-label="Booking type">
            <button type="button" aria-pressed={kind === "consultation"} onClick={() => setKind("consultation")} className={chipBase} style={kind === "consultation" ? chipActive : chipInactive}>
              Consultation
            </button>
            <button type="button" aria-pressed={kind === "appointment"} onClick={() => setKind("appointment")} className={chipBase} style={kind === "appointment" ? chipActive : chipInactive}>
              Appointment
            </button>
          </div>
        </div>

        <div className="w-full max-w-3xl grid gap-2 rounded-lg border p-3 sm:p-3.5 text-left" style={{ borderColor: "var(--border)", background: "color-mix(in oklab, var(--card) 96%, transparent)" }} aria-live="polite">
          {kind === "consultation" ? (
            <>
              <div className="text-xs sm:text-sm" style={{ color: "color-mix(in oklab, var(--fg) 88%, transparent)" }}>
                You’re picking the <strong>start time</strong> of a consultation. Typical length: <strong>15–30 min</strong>
                <span style={{ opacity: 0.9 }}> (complex: <strong>30–60</strong>, large custom: <strong>60–90</strong>)</span>. Consultations are <strong>free</strong>. Your size, budget, and references are already on file.
              </div>
              <div className="text-[11px] sm:text-xs" style={{ color: "color-mix(in oklab, var(--fg) 78%, transparent)" }}>
                What can extend it: size/placement complexity, number of references, decision-making, video vs in-person, paperwork.
              </div>
            </>
          ) : (
            <>
              <div className="text-xs sm:text-sm" style={{ color: "color-mix(in oklab, var(--fg) 88%, transparent)" }}>
                You’re picking the <strong>start time</strong> of your appointment. Some artists require a <strong>non-refundable deposit</strong> (flat or %) to hold the spot and deter no-shows. Your style, budget, and refs are already shared with the artist.
              </div>
              <div className="text-[11px] sm:text-xs" style={{ color: "color-mix(in oklab, var(--fg) 78%, transparent)" }}>
                Cancellation policy: within <strong>72 hours</strong> of start date; <strong>deposits and booking fees may not be refunded.</strong>
              </div>
            </>
          )}
        </div>

        <Section title="AM" items={am} />
        <Section title="PM" items={pm} />

        <div className="text-xs" style={{ color: "color-mix(in oklab, var(--fg) 78%, transparent)" }}>
          {selected ? (
            <>
              Selected:{" "}
              <span className="font-medium" style={{ color: "var(--fg)" }}>
                {new Date(selected.startISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>{" "}
              • <span className="font-medium capitalize">{kind}</span>
            </>
          ) : (
            "Select a time above."
          )}
        </div>

        <button
          disabled={!canConfirm}
          onClick={handleConfirm}
          className="px-4 py-2 rounded-xl font-medium transition outline-none focus-visible:ring-2 min-w-[160px]"
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
  );
}