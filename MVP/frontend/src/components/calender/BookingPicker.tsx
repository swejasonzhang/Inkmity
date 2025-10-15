import { useState } from "react";

type Props = {
  artistId: string;
};

type Kind = "consultation" | "appointment";
type Meridiem = "AM" | "PM";

function generateHalfHourTimes(meridiem: Meridiem): string[] {
  const out: string[] = [];
  for (let h = 0; h < 12; h++) {
    const label = h === 0 ? 12 : h;
    out.push(`${label}:00 ${meridiem}`);
    out.push(`${label}:30 ${meridiem}`);
  }
  return out;
}

export default function BookingPicker({ }: Props) {
  const [kind, setKind] = useState<Kind>("appointment");
  const [meridiem, setMeridiem] = useState<Meridiem>("AM");
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [note, setNote] = useState<string>("");

  const times = generateHalfHourTimes(meridiem);
  const canConfirm = Boolean(selectedTime);

  const chipBase =
    "px-3.5 sm:px-4 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 rounded-md";
  const chipGroup =
    "inline-flex items-center gap-1 bg-transparent p-1 rounded-xl border";
  const chipBorderStyle = { borderColor: "var(--border)" };
  const chipInactive = {
    background: "color-mix(in oklab, var(--card) 92%, transparent)",
    color: "var(--fg)",
  };
  const chipActive = {
    background: "var(--fg)",
    color: "var(--card)",
  };

  return (
    <div className="grid place-items-center">
      <div
        className="w-full max-w-2xl flex flex-col items-center justify-center text-center rounded-2xl p-4 sm:p-5 gap-4"
        style={{ background: "var(--elevated)", color: "var(--fg)" }}
      >
        <div className="flex items-center justify-center w-full">
          <h3 className="text-base sm:text-lg font-semibold">Book a Time</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 justify-items-center w-full">
          <div className="w-full max-w-xs">
            <span
              className="block text-xs sm:text-sm mb-2"
              style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}
            >
              Type
            </span>
            <div
              className={chipGroup + " mx-auto"}
              style={chipBorderStyle}
              role="group"
              aria-label="Booking type"
            >
              <button
                type="button"
                aria-pressed={kind === "consultation"}
                onClick={() => setKind("consultation")}
                className={chipBase}
                style={kind === "consultation" ? chipActive : chipInactive}
              >
                Consultation
              </button>
              <button
                type="button"
                aria-pressed={kind === "appointment"}
                onClick={() => setKind("appointment")}
                className={chipBase}
                style={kind === "appointment" ? chipActive : chipInactive}
              >
                Appointment
              </button>
            </div>
          </div>

          <div className="w-full max-w-xs">
            <span
              className="block text-xs sm:text-sm mb-2"
              style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}
            >
              AM / PM
            </span>
            <div
              className={chipGroup + " mx-auto"}
              style={chipBorderStyle}
              role="group"
              aria-label="Meridiem"
            >
              <button
                type="button"
                aria-pressed={meridiem === "AM"}
                onClick={() => {
                  setMeridiem("AM");
                  setSelectedTime(null);
                }}
                className={chipBase}
                style={meridiem === "AM" ? chipActive : chipInactive}
              >
                AM
              </button>
              <button
                type="button"
                aria-pressed={meridiem === "PM"}
                onClick={() => {
                  setMeridiem("PM");
                  setSelectedTime(null);
                }}
                className={chipBase}
                style={meridiem === "PM" ? chipActive : chipInactive}
              >
                PM
              </button>
            </div>
          </div>
        </div>

        <div className="w-full">
          <span
            className="block text-xs sm:text-sm mb-2"
            style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}
          >
            Time
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 justify-items-center">
            {times.map((t) => {
              const isActive = selectedTime === t;
              return (
                <button
                  key={t}
                  onClick={() => setSelectedTime(t)}
                  className="px-3.5 py-2.5 rounded-lg transition outline-none focus-visible:ring-2 min-w-[96px] sm:min-w-[108px] text-sm"
                  style={{
                    background: isActive
                      ? "var(--fg)"
                      : "color-mix(in oklab, var(--card) 95%, transparent)",
                    color: isActive ? "var(--card)" : "var(--fg)",
                    border: `1px solid ${isActive ? "var(--fg)" : "var(--border)"}`,
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>

          <div
            className="mt-3 text-xs sm:text-sm"
            style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}
          >
            {selectedTime ? (
              <span>
                Selected:{" "}
                <span className="font-medium" style={{ color: "var(--fg)" }}>
                  {selectedTime}
                </span>{" "}
                •{" "}
                <span className="font-medium capitalize" style={{ color: "var(--fg)" }}>
                  {kind}
                </span>
              </span>
            ) : (
              <span>Select a time above.</span>
            )}
          </div>
        </div>

        <div className="w-full max-w-xl mx-auto">
          <label
            className="text-xs sm:text-sm block mb-1"
            style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}
          >
            Note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Describe your idea, placement, size, or any references."
            rows={5}
            className="w-full rounded-xl px-3 py-2 placeholder-opacity-70 focus:outline-none focus-visible:ring-2 resize-y"
            style={{
              background: "var(--card)",
              color: "var(--fg)",
              border: "1px solid var(--border)",
              minHeight: "7.5rem",
            }}
          />
        </div>

        <div className="mt-auto flex flex-col items-center justify-center gap-3 w-full">
          <p
            className="text-[11px] sm:text-xs"
            style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }}
          >
            After booking, the slot will disappear to prevent double-booking.
          </p>
          <button
            disabled={!canConfirm}
            onClick={() => {
              const prefixedNote = `[${kind.toUpperCase()}] ${note || ""}`.trim();
              alert(
                `Booked: ${selectedTime} • ${kind}${prefixedNote ? `\nNote: ${prefixedNote}` : ""
                }`
              );
              setSelectedTime(null);
              setNote("");
            }}
            className="px-4 py-2 rounded-xl font-medium transition outline-none focus-visible:ring-2"
            style={{
              background: canConfirm
                ? "var(--fg)"
                : "color-mix(in oklab, var(--elevated) 80%, transparent)",
              color: canConfirm
                ? "var(--card)"
                : "color-mix(in oklab, var(--fg) 60%, transparent)",
              border: `1px solid ${canConfirm ? "var(--fg)" : "var(--border)"}`,
              cursor: canConfirm ? "pointer" : "not-allowed",
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
